//! Backend watcher for movies.json
//!
//! Watches `{movies_dir}/movies.json` and publishes the file contents to the
//! MQTT topic `global/movies` whenever the file is created/modified.
//!
//! Public API:
//! - `pub async fn start(movies_dir: String, mqtt_client: AsyncClient) -> anyhow::Result<()>`
//!
//! The function runs indefinitely and uses the `notify` crate to receive
//! filesystem events.

use anyhow::Result;
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use rumqttc::{AsyncClient, QoS};
use std::path::PathBuf;
use std::sync::mpsc;
use tokio::task;
use tracing::{error, info};

/// Start watching `{movies_dir}/movies.json` and publish its contents to
/// `global/movies` on change.
///
/// This function does not return under normal operation; it keeps the watcher
/// alive until the runtime is shut down or the task is cancelled.
pub async fn start(movie_dir: PathBuf, mqtt_client: AsyncClient) -> Result<()> {
    // Determine the path to watch.
    let path = movie_dir.join("movies.json");

    info!(path=%path.display(), "starting movies.json watcher");

    // Create a std channel to bridge notify (sync) to async runtime.
    let (tx, rx) = mpsc::channel();

    // Create watcher that sends events into our std channel.
    let mut watcher: RecommendedWatcher = RecommendedWatcher::new(
        move |res| {
            // Ignore send errors (receiver might be dropped on shutdown).
            let _ = tx.send(res);
        },
        Config::default(),
    )?;

    // Watch the file non-recursively. If the file does not exist yet, this still
    // allows us to get Create events when it appears.
    watcher.watch(&path, RecursiveMode::NonRecursive)?;

    // If the file already exists, publish its initial contents.
    if let Ok(contents) = std::fs::read(&path) {
        info!(path=%path.display(), bytes=contents.len(), "initial publish of movies.json");
        if let Err(e) = mqtt_client
            .publish("global/movies", QoS::AtLeastOnce, true, contents.clone())
            .await
        {
            error!(%e, "failed to publish initial global/movies");
        }
    }

    // Keep a clone of the client for the blocking thread to use.
    let client_for_blocking = mqtt_client.clone();
    let path_for_blocking = path.clone();

    // Drive the notify -> async boundary on a blocking thread so rx.recv()
    // does not block the async runtime.
    task::spawn_blocking(move || {
        // This thread lives for the lifetime of the watcher.
        while let Ok(event_res) = rx.recv() {
            match event_res {
                Ok(_event) => {
                    // On any relevant event, attempt to read the file contents and
                    // publish them. We treat any event as a cue to re-read, covering
                    // modify/create/rename etc.
                    let client_inner = client_for_blocking.clone();
                    let path_inner = path_for_blocking.clone();

                    match std::fs::read(&path_inner) {
                        Ok(contents) => {
                            // Spawn an async task to publish using the async client.
                            let payload = contents.clone();
                            task::spawn(async move {
                                info!(path=%path_inner.display(), bytes=payload.len(), "movies.json changed — publishing content");
                                if let Err(e) = client_inner
                                    .publish("global/movies", QoS::AtLeastOnce, true, payload)
                                    .await
                                {
                                    error!(%e, "failed to publish global/movies");
                                }
                            });
                        }
                        Err(e) => {
                            // Could be temporary (file removed between event and read).
                            error!(%e, path=%path_inner.display(), "failed to read movies.json on notify event");
                        }
                    }
                }
                Err(e) => {
                    error!(%e, "notify reported an error");
                }
            }
        }
    });

    // Keep the function alive for the lifetime of the watcher by awaiting a
    // never-completing future. This allows callers to spawn this task and not
    // have it exit.
    futures::future::pending::<()>().await;
    // unreachable, but satisfy the Result return type
    #[allow(unreachable_code)]
    Ok(())
}
