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
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::{io, net::SocketAddr};
use tokio::sync::broadcast;
use tokio::sync::RwLock;
use tower_http::{services::ServeDir, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Debug, Deserialize, Clone)]
pub struct LoginArgs {
    room: String,
    user: String,
    sess: String,
}

#[derive(Serialize, Deserialize)]
pub struct Viewer {
    pub name: String,
    #[serde(skip)]
    pub sess: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "lowercase")]
pub enum Command {
    Stop(()),
    Pause(String, f64),
    Play(String, f64),
    Chat(String),
    Admin(String),
    Unadmin(String),
    Title(String),
}

#[derive(PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum State {
    Stopped(()),
    Paused(String, f64),
    Playing(String, f64),
}

impl Default for State {
    fn default() -> Self {
        State::Stopped(())
    }
}

#[derive(Serialize, Deserialize, Default)]
pub struct Room {
    pub public: bool,
    pub title: String,
    pub name: String,
    pub state: State,
    pub admins: Vec<String>,
    pub viewers: Vec<Viewer>,
    pub chat: Vec<(String, String)>,
    #[serde(skip)]
    pub channel: Option<broadcast::Sender<String>>,
}

struct AppState {
    rooms: RwLock<HashMap<String, Arc<RwLock<Room>>>>,
    movies: String,
}

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
            std::env::var("RUST_LOG").unwrap_or_else(|_| "theatre_be=info".into()),
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
    let mut movie_list: Vec<String> = Vec::new();
    //for movie in tokio::fs::read_dir("../movies/").await.unwrap() {
    for entry in std::fs::read_dir(&state.movies).unwrap() {
        let movie = entry
            .unwrap()
            .path()
            .file_name()
            .unwrap()
            .to_string_lossy()
            .to_string();
        if movie.ends_with(".mp4") {
            movie_list.push(movie);
        }
    }
    (StatusCode::OK, Json(movie_list))
}

async fn handle_rooms(Extension(state): Extension<Arc<AppState>>) -> impl IntoResponse {
    let mut rooms = HashMap::new();
    for (name, room) in state.rooms.read().await.iter() {
        rooms.insert(name.clone(), room.read().await.title.clone());
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
    // By splitting we can send and receive at the same time.
    let (mut sender, mut receiver) = socket.split();

    // Find our room, creating it if it doesn't exist
    let locked_room = {
        let mut rooms_lookup = state.rooms.write().await;
        if rooms_lookup.get(&login.room).is_none() {
            tracing::info!("[{}] Creating room", login.room);
            let mut new_room = Room::default();
            new_room.public = true;
            new_room.name = login.room.clone();
            new_room.title = format!("{}'s Room", login.user);
            new_room.state = State::Paused(
                "Professor.Marston.And.The.Wonder.Women.mp4".to_string(),
                20.0,
            );
            new_room.admins = vec![login.user.clone()];
            let (tx, _rx) = broadcast::channel(100);
            new_room.channel = Some(tx);
            rooms_lookup.insert(new_room.name.clone(), Arc::new(RwLock::new(new_room)));
        }
        rooms_lookup.get(&login.room).unwrap().clone()
    };

    // Subscribe to the room state, so that we see the first sync that we generate
    let mut rx = {
        let room = locked_room.read().await;
        match &room.channel {
            Some(channel) => channel.subscribe(),
            None => panic!("Room has no channel, this should never happen"),
        }
    };

    // Save the sender in our list of connected users.
    {
        let mut room = locked_room.write().await;
        tracing::info!("[{}] Adding {} ({})", room.name, login.user, login.sess);
        room.chat(&"system".to_string(), &format!("{} connected", login.user));
        room.viewers.push(Viewer {
            name: login.user.clone(),
            sess: login.sess.clone(),
        });
        room.sync().await;
    }

    // This task will receive broadcast messages and send text message to our client.
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
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
                room.sync().await;
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
        tracing::info!("[{}] Removing {} ({})", room.name, login.user, login.sess);
        if let Some(pos) = room.viewers.iter().position(|x| *x.sess == login.sess) {
            room.viewers.remove(pos);
        }
    }

    // Let everybody know about the user disconnecting.
    {
        let mut room = locked_room.write().await;
        room.chat(
            &"system".to_string(),
            &format!("{} disconnected", login.user),
        );
        room.sync().await;
    }

    // If room is empty, delete room
    {
        let room = locked_room.read().await;
        if room.viewers.is_empty() {
            // FIXME: delay by ~5 minutes so if admin is in the middle of setup
            // and disconnects, it doesn't need to start from scratch
            tracing::info!("[{}] Room is empty, cleaning it up", room.name);
            state.rooms.write().await.remove(&room.name);
        }
    }
}

impl Room {
    pub fn command(&mut self, login: &crate::LoginArgs, cmd: &Command) {
        let is_admin = self.admins.contains(&login.user);
        match (is_admin, cmd) {
            (_, Command::Chat(message)) => {
                self.chat(&login.user, message);
            }
            (true, Command::Stop(())) => {
                tracing::info!("[{}] Stopping", self.name);
                self.state = State::Stopped(());
            }
            (true, Command::Pause(movie, pause_pos)) => {
                tracing::info!("[{}] Pausing {} at {}", self.name, movie, pause_pos);
                self.state = State::Paused(movie.clone(), *pause_pos);
            }
            (true, Command::Play(movie, start_ts)) => {
                tracing::info!("[{}] Playing {} at {}", self.name, movie, start_ts);
                self.state = State::Playing(movie.clone(), *start_ts);
            }
            (true, Command::Admin(user)) => {
                tracing::info!("[{}] Making {} an admin", self.name, user);
                self.admins.push(user.clone());
            }
            (true, Command::Unadmin(user)) => {
                if &login.user != user {
                    tracing::info!("[{}] Dethroning {}", self.name, user);
                    self.admins.retain(|x| x != user);
                }
            }
            (true, Command::Title(title)) => {
                tracing::info!("[{}] Renaming room {}", self.name, title);
                self.title = title.clone();
            }
            (false, _) => {
                tracing::warn!(
                    "[{}] {} is not an admin (admins={:?}) and tried to run {:?}",
                    self.name,
                    login.user,
                    self.admins,
                    cmd
                );
            }
        }
    }

    pub fn chat(&mut self, user: &String, message: &String) {
        tracing::info!("[{}] <{}> {}", self.name, user, message);
        self.chat.push((user.clone(), message.clone()));
    }

    pub async fn sync(&mut self) {
        // Something happened. Serialize the current room state and
        // broadcast it to everybody in the room.
        if let Some(channel) = &self.channel {
            tracing::debug!("[{}] Sync to {} viewers", self.name, self.viewers.len());
            let json = serde_json::to_string(self).unwrap();
            if channel.receiver_count() > 0 {
                channel.send(json).unwrap();
            }
        }
    }
}
