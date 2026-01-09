import hashlib
from pathlib import Path

from .cache import Cache


class Source:
    def __init__(self, path: Path, cache: Cache) -> None:
        self.path = path
        self.hash = cache.get_or_set(
            ":".join(["file", str(path.resolve()), str(path.stat().st_mtime), "md5"]),
            lambda: hashlib.file_digest(path.open("rb"), "md5").hexdigest(),
        )
