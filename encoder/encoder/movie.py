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
        # pull this out first so that we can sneakily hijack video.sources
        # (otherwise we'd need to figure out for ourselves which sources
        # have a duration)
        video = EncodeVideo(sources, source, processed)

        self.id = id
        self.title = video.sources[0].path.stem
        self.duration = video.sources[0].duration
        self.source = source
        self.processed = processed
        self.targets: dict[str, Encoder] = {
            "video": video,
            "subtitles": EncodeSubs(sources, source, processed),
            "thumbnail": EncodeThumb(sources, source, processed),
        }

    def to_json(self) -> dict[str, t.Any]:
        d = {
            "id": self.id,
            "title": self.title,
            "duration": self.duration,
        }
        for n, tgt in self.targets.items():
            d[n] = str(tgt.get_output_path().relative_to(self.processed))
        return d

    def __str__(self) -> str:
        all_encoded = all(tgt.is_encoded() for tgt in self.targets.values())
        return f"Movie({self.id!r}) " + (
            "[encoded]" if all_encoded else "[not encoded]"
        )
