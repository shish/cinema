import json
import logging
import typing as t
from pathlib import Path

from .util import write_if_changed

log = logging.getLogger(__name__)


class Cache:
    def __init__(self, path: Path):
        self.path = path
        self.storage: dict[str, t.Any] = {}

        if self.path.exists():
            try:
                self.cache = json.loads(self.path.read_text())
            except Exception:
                log.warning("Failed to load cache, starting fresh")
                self.cache = {}

    def save(self) -> None:
        try:
            write_if_changed(
                self.path, json.dumps(self.storage, indent=4, ensure_ascii=False)
            )
        except Exception as e:
            log.error(f"Failed to save cache: {e}")

    def get(self, key: str) -> t.Any | None:
        return self.storage.get(key)

    def get_or_set(self, key: str, func: t.Callable[[], t.Any]) -> t.Any:
        if key in self.storage:
            return self.storage[key]
        else:
            value = func()
            self.storage[key] = value
            return value

    def set(self, key: str, value: t.Any) -> None:
        self.storage[key] = value

    def clear(self) -> None:
        self.storage.clear()
