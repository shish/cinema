import hashlib
from pathlib import Path


def hash_path(path: Path) -> str:
    """
    md5(filesize, mtime, first 4KB)
    """
    hasher = hashlib.md5()
    stat = path.stat()
    hasher.update(str(stat.st_size).encode())
    hasher.update(str(stat.st_mtime).encode())
    with path.open("rb") as f:
        chunk = f.read(4096)
        hasher.update(chunk)
    return hasher.hexdigest()


class Source:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.hash = hash_path(path)
