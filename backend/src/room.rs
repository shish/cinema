use tokio::sync::broadcast;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

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

#[derive(Serialize)]
pub struct ChatMessage {
    pub absolute_timestamp: f64,
    pub user: String,
    pub message: String,
}

#[derive(Serialize)]
pub struct Room {
    pub public: bool,
    pub name: String,
    pub title: String,
    pub state: State,
    pub admins: Vec<String>,
    pub viewers: Vec<Viewer>,
    pub chat: Vec<ChatMessage>,
    #[serde(skip)]
    pub channel: broadcast::Sender<String>,
}

impl Room {
    pub fn new(name: String, user: String) -> Self {
        tracing::info!("[{}] Creating room", name);
        let (tx, _rx) = broadcast::channel(100);
        Room {
            public: true,
            name: name,
            title: format!("{}'s Room", user),
            state: State::Stopped(()),
            admins: vec![user],
            viewers: vec![],
            chat: vec![],
            channel: tx,
        }
    }

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
        self.sync();
    }

    pub fn add_viewer(&mut self, login: &crate::LoginArgs) {
        tracing::info!("[{}] Adding {} ({})", self.name, login.user, login.sess);
        self.chat(&"system".to_string(), &format!("{} connected", login.user));
        self.viewers.push(Viewer {
            name: login.user.clone(),
            sess: login.sess.clone(),
        });
        self.sync();
    }

    pub fn remove_viewer(&mut self, login: &crate::LoginArgs) {
        tracing::info!("[{}] Removing {} ({})", self.name, login.user, login.sess);
        if let Some(pos) = self.viewers.iter().position(|x| *x.sess == login.sess) {
            self.viewers.remove(pos);
        }
        self.chat(
            &"system".to_string(),
            &format!("{} disconnected", login.user),
        );
        self.sync();
    }

    pub fn chat(&mut self, user: &String, message: &String) {
        tracing::info!("[{}] <{}> {}", self.name, user, message);
        let since_the_epoch = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards");
        self.chat.push(ChatMessage {
            absolute_timestamp: since_the_epoch.as_secs_f64(),
            user: user.clone(),
            message: message.clone()
        });
    }

    pub fn sync(&mut self) {
        // Something happened. Serialize the current room state and
        // broadcast it to everybody in the room.
        tracing::debug!("[{}] Sync to {} viewers", self.name, self.viewers.len());
        let json = serde_json::to_string(self).unwrap();
        if self.channel.receiver_count() > 0 {
            self.channel.send(json).unwrap();
        }
    }
}
