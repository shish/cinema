import hashlib
from pathlib import Path

from .cache import Cache
from .util import ffprobe


class Source:
    def __init__(self, path: Path, cache: Cache) -> None:
        self.path = path
        self.hash = cache.get_or_set(
            ":".join(["file", str(path.resolve()), str(path.stat().st_mtime), "md5"]),
            lambda: hashlib.file_digest(path.open("rb"), "md5").hexdigest(),
        )
        self.duration = cache.get_or_set(
            ":".join(
                ["file", str(path.resolve()), str(path.stat().st_mtime), "duration"]
            ),
            lambda: self._get_duration(),
        )

    def _get_duration(self) -> float | None:
        try:
            ffprobe_json = ffprobe(self.path)
            return float(ffprobe_json["format"]["duration"])
        except Exception:
            return None
