import typing as t
from pathlib import Path

from .encoder import Encoder, EncodeSubs, EncodeThumb, EncodeVideo
from .source import Source


class Movie:
    def __init__(
        self,
        id: str,
        sources: list[Source],
        source: Path,
        processed: Path,
    ) -> None:
        self.id = id
        self.title = sources[0].path.stem
        self.source = source
        self.processed = processed
        self.targets: dict[str, Encoder] = {
            "video": EncodeVideo(sources, source, processed),
            "subtitles": EncodeSubs(sources, source, processed),
            "thumbnail": EncodeThumb(sources, source, processed),
        }

    def to_json(self) -> dict[str, t.Any]:
        d = {"id": self.id, "title": self.title}
        for n, tgt in self.targets.items():
            d[n] = str(tgt.get_output_path().relative_to(self.processed))
        return d

    def __str__(self) -> str:
        all_encoded = all(tgt.is_encoded() for tgt in self.targets.values())
        return f"Movie({self.id!r}) " + (
            "[encoded]" if all_encoded else "[not encoded]"
        )
