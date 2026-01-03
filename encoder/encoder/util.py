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


def wait_for_changes(directory: Path, loop_interval: int):
    """
    Generator that yields when files change or timeout occurs.

    Encapsulates InotifyTree setup and timing logic. Yields once immediately,
    then yields each time a matching file event occurs or the loop interval elapses.
    """
    yield

    if loop_interval <= 0:
        return

    watcher = InotifyTree(
        str(directory),
        mask=inotify.constants.IN_CLOSE_WRITE | inotify.constants.IN_MOVED_TO,
    )

    while True:
        for event in watcher.event_gen(yield_nones=False, timeout_s=loop_interval):
            _, action, dir, file = event
            log.info(f"File event detected: {action} / {file}")
            break
        else:
            log.debug("Timeout reached, re-scanning...")
        yield
