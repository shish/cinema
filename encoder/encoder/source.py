import hashlib
import subprocess
from pathlib import Path

from .cache import Cache


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

    def _get_duration(self) -> float:
        try:
            result = subprocess.run(
                [
                    "ffprobe",
                    "-v",
                    "error",
                    "-show_entries",
                    "format=duration",
                    "-of",
                    "default=noprint_wrappers=1:nokey=1",
                    str(self.path),
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            return float(result.stdout.strip())
        except Exception as e:
            print(f"Error probing {self.path}: {e}")
            return 0.0
