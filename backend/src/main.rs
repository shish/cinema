use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::Extension;
use axum::extract::Query;
use axum::{
    http::StatusCode,
    response::IntoResponse,
    routing::{get, get_service},
    Json, Router,
};
use clap::Parser;
use futures::stream::StreamExt;
use futures::SinkExt;
use serde::Deserialize;
use tracing::Instrument;
//use tracing_subscriber::fmt::format::FmtSpan;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, SystemTime};
use std::{io, net::SocketAddr};
use tokio::sync::RwLock;
use tower_http::{services::ServeDir, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod room;

#[derive(Debug, Deserialize, Clone)]
pub struct LoginArgs {
    room: String,
    user: String,
    sess: String,
}

struct AppState {
    rooms: RwLock<HashMap<String, Arc<RwLock<room::Room>>>>,
    movies: String,
}

// A website for watching movies together (backend)
#[derive(Parser)]
#[clap(author, version, about, long_about = None)]
pub struct Args {
    /// Where the source videos are
    #[clap(short = 'm', default_value = "/data")]
    pub movies: String,
}

#[tokio::main]
async fn main() {
    let args = Args::parse();
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "cinema_be=info".into()),
        ))
        .with(
            tracing_subscriber::fmt::layer(), //.with_span_events(FmtSpan::ENTER | FmtSpan::CLOSE)
        )
        .init();
    let rooms = HashMap::new();

    let app_state = Arc::new(AppState {
        rooms: RwLock::new(rooms),
        movies: args.movies,
    });
    let app: _ = Router::new()
        .route("/room", get(handle_room))
        .route("/rooms", get(handle_rooms))
        .route("/movies", get(handle_movies))
        .nest(
            "/movies/",
            get_service(ServeDir::new(&app_state.movies)).handle_error(
                |error: io::Error| async move {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        format!("Unhandled internal error: {}", error),
                    )
                },
            ),
        )
        .fallback(get_service(ServeDir::new("../frontend/dist/")).handle_error(handle_error))
        .layer(TraceLayer::new_for_http())
        .layer(Extension(app_state));

    let addr = SocketAddr::from(([0, 0, 0, 0], 8000));
    tracing::info!("listening on {}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

async fn handle_movies(Extension(state): Extension<Arc<AppState>>) -> impl IntoResponse {
    fn _list_movies(prefix: &String) -> anyhow::Result<Vec<String>> {
        globwalk::GlobWalkerBuilder::from_patterns(prefix, &["*.m3u8", "!index.m3u8"])
            .build()?
            .map(|entry| {
                Ok(entry?
                    .into_path()
                    .strip_prefix(&prefix)?
                    .to_str()
                    .unwrap()
                    .to_string())
            })
            .collect()
    }
    (StatusCode::OK, Json(_list_movies(&state.movies).unwrap()))
}

async fn handle_rooms(Extension(state): Extension<Arc<AppState>>) -> impl IntoResponse {
    let mut rooms = HashMap::new();
    for (name, locked_room) in state.rooms.read().await.iter() {
        let room = locked_room.read().await;
        if room.public {
            rooms.insert(name.clone(), room.title.clone());
        }
    }
    (StatusCode::OK, Json(rooms))
}

async fn handle_error(_err: io::Error) -> impl IntoResponse {
    (StatusCode::INTERNAL_SERVER_ERROR, "Something went wrong...")
}

async fn handle_room(
    ws: WebSocketUpgrade,
    Query(mut login): Query<LoginArgs>,
    Extension(state): Extension<Arc<AppState>>,
) -> impl IntoResponse {
    login.room = login.room.to_uppercase();
    ws.on_upgrade(|socket| websocket(socket, login, state))
}

async fn websocket(socket: WebSocket, login: LoginArgs, state: Arc<AppState>) {
    let login_2 = login.clone();
    _websocket(socket, login, state)
        .instrument(tracing::info_span!(
            "",
            room = ?login_2.room,
            user = ?login_2.user,
        ))
        .await;
}
async fn _websocket(socket: WebSocket, login: LoginArgs, state: Arc<AppState>) {
    // Find our room, creating it if it doesn't exist
    let locked_room = {
        let mut rooms_lookup = state.rooms.write().await;
        if rooms_lookup.get(&login.room).is_none() {
            let new_room = room::Room::new(login.room.clone(), login.user.clone());
            rooms_lookup.insert(login.room.clone(), Arc::new(RwLock::new(new_room)));
        }
        rooms_lookup.get(&login.room).unwrap().clone()
    };

    // Subscribe to the room state, so that we see the first sync that we generate
    let mut rx = {
        let room = locked_room.read().await;
        room.channel.subscribe()
    };

    // Save the sender in our list of connected users.
    {
        let mut room = locked_room.write().await;
        room.add_viewer(&login);
    }

    // This task will receive broadcast messages and send text message to our client.
    let (mut sender, mut receiver) = socket.split();
    let mut send_task = tokio::spawn(
        async move {
            let mut maybe_last_state = None;
            while let Ok(state) = rx.recv().await {
                let msg = if let Some(last_state) = maybe_last_state {
                    serde_json::to_string(&json_patch::diff(
                        &serde_json::to_value(&last_state).unwrap(),
                        &serde_json::to_value(&state).unwrap(),
                    ))
                    .unwrap()
                } else {
                    serde_json::to_string(&state).unwrap()
                };
                maybe_last_state = Some(state);
                // In any websocket error, break loop.
                if sender.send(Message::Text(msg)).await.is_err() {
                    break;
                }
            }
        }
        .instrument(tracing::info_span!("")),
    );

    // This task will receive messages from client and send them to broadcast subscribers.
    let locked_room_2 = locked_room.clone();
    let login_2 = login.clone();
    let mut recv_task = tokio::spawn(
        async move {
            while let Some(Ok(msg)) = receiver.next().await {
                if let Message::Text(msg) = msg {
                    let cmd = serde_json::from_str(&msg).unwrap();
                    let mut room = locked_room_2.write().await;
                    room.command(&login_2, &cmd);
                }
            }
        }
        .instrument(tracing::info_span!("")),
    );

    // If any one of the tasks exit, abort the other.
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };

    // After we finish reading from the websocket (ie, it's closed), clean up
    {
        let mut room = locked_room.write().await;
        room.remove_viewer(&login);
    }

    // If room is empty, mark the room for deletion, if it's still empty after
    // 5 minutes, delete it. This means that an admin can have some internet
    // flakiness and the room will still be waiting for them.
    // BUG: this checks for emptiness at two specific moments in time it won't
    // catch any activity that happens in between those two moments.
    {
        let room = locked_room.read().await;
        if room.viewers.is_empty() {
            drop(room);
            tokio::spawn(
                async move {
                    let room_timeout = Duration::from_secs(5 * 60);
                    tokio::time::sleep(room_timeout).await;
                    let room = locked_room.read().await;
                    if SystemTime::now()
                        .duration_since(room.last_activity)
                        .unwrap()
                        >= room_timeout
                    {
                        tracing::info!("Cleaning up empty room");
                        state.rooms.write().await.remove(&room.name);
                    }
                }
                .instrument(tracing::info_span!("cleanup")),
            );
        }
    }
}
