use notify::{Event, EventKind, RecursiveMode, Result as NotifyResult, Watcher};
use std::path::PathBuf;
use tokio::sync::broadcast;
use tracing;

/// Watch the movies.json file for changes and broadcast its content to all subscribers
pub async fn watch_movies_file(
    movie_dir: PathBuf,
    tx: broadcast::Sender<String>,
) -> anyhow::Result<()> {
    let (notify_tx, mut notify_rx) = tokio::sync::mpsc::channel(100);

    let mut watcher = notify::recommended_watcher(move |res: NotifyResult<Event>| {
        if let Ok(event) = res {
            let _ = notify_tx.blocking_send(event);
        }
    })?;

    let movies_json = movie_dir.join("movies.json");
    watcher.watch(&movies_json, RecursiveMode::NonRecursive)?;

    tracing::info!("Watching {:?} for changes", movies_json);

    // Send initial content
    if let Ok(content) = tokio::fs::read_to_string(&movies_json).await {
        let _ = tx.send(content);
    }

    while let Some(event) = notify_rx.recv().await {
        match event.kind {
            EventKind::Modify(_) | EventKind::Create(_) => {
                tracing::info!("movies.json changed, reading and broadcasting");
                match tokio::fs::read_to_string(&movies_json).await {
                    Ok(content) => {
                        // Broadcast the file content to all subscribers
                        let _ = tx.send(content);
                    }
                    Err(e) => {
                        tracing::error!("Failed to read movies.json: {}", e);
                    }
                }
            }
            _ => {}
        }
    }

    Ok(())
}
