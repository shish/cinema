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
use glob::glob;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;
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
        .with(tracing_subscriber::fmt::layer())
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
    tracing::debug!("listening on {}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

async fn handle_movies(Extension(state): Extension<Arc<AppState>>) -> impl IntoResponse {
    let globs = glob(&format!("{}/**/*.mp4", state.movies)).expect("Failed to read glob pattern");
    let mut movie_list: Vec<String> = globs
        .map(|entry| {
            entry
                .unwrap()
                .strip_prefix(&state.movies)
                .unwrap()
                .to_str()
                .unwrap()
                .to_string()
        })
        .collect();
    movie_list.sort();
    (StatusCode::OK, Json(movie_list))
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
    let mut send_task = tokio::spawn(async move {
        let mut maybe_last_state = None;
        while let Ok(state) = rx.recv().await {
            let msg = if let Some(last_state) = maybe_last_state {
                serde_json::to_string(&json_patch::diff(
                    &serde_json::to_value(&last_state).unwrap(),
                    &serde_json::to_value(&state).unwrap()
                )).unwrap()
            } else {
                serde_json::to_string(&state).unwrap()
            };
            maybe_last_state = Some(state);
            // In any websocket error, break loop.
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    // This task will receive messages from client and send them to broadcast subscribers.
    let locked_room_2 = locked_room.clone();
    let login_2 = login.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Text(msg) = msg {
                let cmd = serde_json::from_str(&msg).unwrap();
                let mut room = locked_room_2.write().await;
                room.command(&login_2, &cmd);
            }
        }
    });

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
            tracing::info!("[{}] Room is empty, starting a timer", room.name);
            drop(room);
            tokio::spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_secs(5 * 60)).await;
                let room = locked_room.read().await;
                if room.viewers.is_empty() {
                    tracing::info!("[{}] Room is still empty, cleaning it up", room.name);
                    state.rooms.write().await.remove(&room.name);
                } else {
                    tracing::info!("[{}] Room got a user, cancelling that cleanup", room.name);
                }
            });
        }
    }
}
