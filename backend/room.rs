use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::broadcast;

#[derive(Serialize, Deserialize, Clone, Debug)]
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
    Public(bool),
}

#[derive(PartialEq, Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "lowercase")]
pub enum PlayingState {
    Paused(f64),
    Playing(f64),
}
#[derive(PartialEq, Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "lowercase")]
pub enum VideoState {
    NoVideo(()),
    Video(String, PlayingState),
}

impl Default for VideoState {
    fn default() -> Self {
        VideoState::NoVideo(())
    }
}

#[derive(Serialize, Clone, Debug)]
pub struct ChatMessage {
    pub absolute_timestamp: f64,
    pub user: String,
    pub message: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct Room {
    pub public: bool,
    pub name: String,
    pub title: String,
    pub video_state: VideoState,
    pub admins: Vec<String>,
    pub viewers: Vec<Viewer>,
    pub chat: Vec<ChatMessage>,
    #[serde(skip)]
    pub channel: broadcast::Sender<Room>,
    #[serde(skip)]
    pub last_activity: SystemTime,
}

impl Room {
    pub fn new(name: String, user: String) -> Self {
        tracing::info!("Creating room");
        let (tx, _rx) = broadcast::channel(100);
        Room {
            public: true,
            name,
            title: format!("{}'s Room", user),
            video_state: VideoState::NoVideo(()),
            admins: vec![user],
            viewers: vec![],
            chat: vec![],
            channel: tx,
            last_activity: SystemTime::now(),
        }
    }

    pub fn command(&mut self, login: &crate::LoginArgs, cmd: &Command) -> anyhow::Result<()> {
        let is_admin = self.admins.contains(&login.user);
        match (is_admin, cmd) {
            (_, Command::Chat(message)) => {
                self.chat(&login.user, message)?;
            }
            (true, Command::Stop(())) => {
                tracing::info!("Stopping");
                self.video_state = VideoState::NoVideo(());
            }
            (true, Command::Pause(movie, pause_pos)) => {
                tracing::info!("Pausing {} at {}", movie, pause_pos);
                self.video_state =
                    VideoState::Video(movie.clone(), PlayingState::Paused(*pause_pos));
            }
            (true, Command::Play(movie, start_ts)) => {
                tracing::info!("Playing {} at {}", movie, start_ts);
                self.video_state =
                    VideoState::Video(movie.clone(), PlayingState::Playing(*start_ts));
            }
            (true, Command::Admin(user)) => {
                tracing::info!("Making {} an admin", user);
                self.admins.push(user.clone());
            }
            (true, Command::Unadmin(user)) => {
                if &login.user != user {
                    tracing::info!("Dethroning {}", user);
                    self.admins.retain(|x| x != user);
                }
            }
            (true, Command::Title(title)) => {
                tracing::info!("Renaming room {}", title);
                self.title = title.clone();
            }
            (true, Command::Public(public)) => {
                tracing::info!("Setting public = {}", public);
                self.public = *public;
            }
            (false, _) => {
                tracing::warn!(
                    "User is not an admin (admins={:?}) and tried to run {:?}",
                    self.admins,
                    cmd
                );
            }
        }
        self.sync()
    }

    pub fn add_viewer(&mut self, login: &crate::LoginArgs) -> anyhow::Result<()> {
        tracing::info!("Adding user session ({})", login.sess);
        self.chat(&"system".to_string(), &format!("{} connected", login.user))?;
        self.viewers.push(Viewer {
            name: login.user.clone(),
            sess: login.sess.clone(),
        });
        self.sync()
    }

    pub fn remove_viewer(&mut self, login: &crate::LoginArgs) -> anyhow::Result<()> {
        tracing::info!("Removing user session ({})", login.sess);
        if let Some(pos) = self.viewers.iter().position(|x| *x.sess == login.sess) {
            self.viewers.remove(pos);
        }
        self.chat(
            &"system".to_string(),
            &format!("{} disconnected", login.user),
        )?;
        self.sync()
    }

    pub fn chat(&mut self, user: &String, message: &String) -> anyhow::Result<()> {
        tracing::info!("<{}> {}", user, message);
        let since_the_epoch = SystemTime::now().duration_since(UNIX_EPOCH)?;
        self.chat.push(ChatMessage {
            absolute_timestamp: since_the_epoch.as_secs_f64(),
            user: user.clone(),
            message: message.clone(),
        });
        Ok(())
    }

    pub fn sync(&mut self) -> anyhow::Result<()> {
        // Something happened. Serialize the current room state and
        // broadcast it to everybody in the room.
        tracing::debug!("Sync to {} viewers", self.viewers.len());
        if self.channel.receiver_count() > 0 {
            self.channel.send(self.clone())?;
        }
        self.last_activity = SystemTime::now();
        Ok(())
    }
}
