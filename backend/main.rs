use axum::body::Bytes;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::Extension;
use axum::extract::Query;
use axum::{http::StatusCode, response::IntoResponse, routing::get, Json, Router};
use clap::Parser;
use futures::stream::StreamExt;
use futures::SinkExt;
use serde::Deserialize;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{Duration, SystemTime};
use tokio::net::TcpListener;
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
    let app = Router::new()
        .route("/time", get(handle_time))
        .route("/room", get(handle_room))
        .route("/rooms", get(handle_rooms))
        .route("/movies", get(handle_movies))
        .nest_service("/movies/", ServeDir::new(&app_state.movies))
        .fallback_service(ServeDir::new("./dist/"))
        .layer(TraceLayer::new_for_http())
        .with_state(app_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8074));
    let listener = TcpListener::bind(addr)
        .await
        .expect("Failed to bind to address");
    tracing::info!("listening on {}", addr);
    axum::serve(listener, app).await.unwrap();
}

async fn handle_movies(Extension(state): Extension<Arc<AppState>>) -> impl IntoResponse {
    fn _list_movies(prefix: &String) -> anyhow::Result<Vec<String>> {
        let mut list =
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
                .collect::<anyhow::Result<Vec<String>>>()?;
        list.sort();
        Ok(list)
    }
    (StatusCode::OK, Json(_list_movies(&state.movies).unwrap()))
}

async fn handle_time() -> impl IntoResponse {
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs_f64();
    (StatusCode::OK, Json(now))
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

async fn handle_room(
    ws: WebSocketUpgrade,
    Query(mut login): Query<LoginArgs>,
    Extension(state): Extension<Arc<AppState>>,
) -> impl IntoResponse {
    login.room = login.room.to_uppercase();
    ws.on_upgrade(|socket| websocket(socket, login, state))
}

#[tracing::instrument(name="", skip_all, fields(room=?login.room, user=?login.user))]
async fn websocket(socket: WebSocket, login: LoginArgs, state: Arc<AppState>) {
    _websocket(socket, login, state)
        .await
        .unwrap_or_else(|e| tracing::error!("Error: {}", e));
}

async fn _websocket(
    socket: WebSocket,
    login: LoginArgs,
    state: Arc<AppState>,
) -> anyhow::Result<()> {
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
    let rx = {
        let room = locked_room.read().await;
        room.channel.subscribe()
    };

    // Save the sender in our list of connected users.
    {
        let mut room = locked_room.write().await;
        room.add_viewer(&login)?;
    }

    // Catch any errors from the websocket loop and log them, but don't
    // propagate them, because we still want to clean up the room.
    match _websocket_loop(rx, socket, &locked_room, &login).await {
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Error: {}", e);
        }
    }

    // After we finish reading from the websocket (ie, it's closed), clean up
    {
        let mut room = locked_room.write().await;
        room.remove_viewer(&login)?;
    }

    // If room is empty, mark the room for deletion, if there has been no
    // activity after 5 minutes, delete it. This means that an admin can have
    // some internet flakiness and the room will still be waiting for them.
    {
        let room = locked_room.read().await;
        if room.viewers.is_empty() {
            drop(room);
            let room_timeout = Duration::from_secs(5 * 60);
            tokio::time::sleep(room_timeout).await;
            let room = locked_room.read().await;
            if SystemTime::now().duration_since(room.last_activity)? >= room_timeout {
                tracing::info!("Cleaning up empty room");
                state.rooms.write().await.remove(&room.name);
            }
        }
    }

    Ok(())
}

async fn _websocket_loop(
    mut rx: tokio::sync::broadcast::Receiver<room::Room>,
    socket: WebSocket,
    locked_room: &Arc<RwLock<room::Room>>,
    login: &LoginArgs,
) -> anyhow::Result<()> {
    let (mut sender, mut receiver) = socket.split();
    let mut maybe_last_state = None;
    loop {
        tokio::select! {
            // If nothing is happening, keep the connection alive.
            _ = tokio::time::sleep(Duration::from_secs(30)) => {
                sender.send(Message::Ping(Bytes::new())).await?;
            },
            // Receive messages from client and send them to broadcast subscribers.
            state = receiver.next() => {
                let Some(msg) = state else { return Ok(()) };
                if let Message::Text(msg) = msg? {
                    let cmd = serde_json::from_str(&msg)?;
                    let mut room = locked_room.write().await;
                    room.command(&login, &cmd)?;
                }
            },
            // Receive broadcast room updates and send text message to our client.
            state = rx.recv() => {
                let state = state?;
                let msg = if let Some(last_state) = maybe_last_state {
                    serde_json::to_string(&json_patch::diff(
                        &serde_json::to_value(&last_state)?,
                        &serde_json::to_value(&state)?,
                    ))?
                } else {
                    serde_json::to_string(&state)?
                };
                maybe_last_state = Some(state);
                sender.send(Message::Text(msg.into())).await?;
            },
        }
    }
}
