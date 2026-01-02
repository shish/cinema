import logging
from pathlib import Path
from time import time

import inotify.constants
from inotify.adapters import InotifyTree

VIDEO_EXTS = {".mp4", ".mkv", ".avi", ".mov"}
SUBTITLE_EXTS = {".srt", ".vtt"}

log = logging.getLogger(__name__)


def get_lang(video: Path, subtitle: Path) -> str:
    """
    Get language code from subtitle filename.
    E.g. "movie.en.srt" -> "en"
    """
    video_stem = video.stem
    subtitle_stem = subtitle.stem
    lang_part = subtitle_stem.replace(video_stem, "").strip(".")
    if lang_part:
        return lang_part
    return "und"  # undefined


def wait_for_changes(directory: Path, extensions: set[str], loop_interval: int):
    """
    Generator that yields when files change or timeout occurs.

    Encapsulates InotifyTree setup and timing logic. Yields once immediately,
    then yields each time a matching file event occurs or the loop interval elapses.
    """
    # First iteration always runs immediately
    yield

    if loop_interval <= 0:
        return

    # Setup inotify watcher
    watcher = InotifyTree(
        str(directory),
        mask=inotify.constants.IN_CLOSE_WRITE | inotify.constants.IN_MOVED_TO,
    )

    last_run = time()
    while True:
        elapsed = time() - last_run
        remaining = max(0, loop_interval - elapsed)

        if remaining > 0:
            log.info(f"Waiting for new files or {remaining:.1f} seconds...")
            wait_start = time()
            event_detected = False

            for event in watcher.event_gen(yield_nones=False, timeout_s=1):
                if event is None:
                    continue
                _, action, dir, file = event

                # Check if it's a file with matching extension
                if file and any(file.lower().endswith(ext) for ext in extensions):
                    log.info(f"File event detected: {action} / {file}")
                    event_detected = True
                    break

                # Check if we've exceeded the timeout even with non-matching events
                if time() - wait_start >= remaining:
                    log.debug("Timeout reached while processing non-matching events")
                    break

            if event_detected:
                log.info("Re-scanning due to new file...")
            else:
                log.info("Timeout reached, re-scanning...")

        last_run = time()
        yield
