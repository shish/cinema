import json
import logging
import shutil
from pathlib import Path

from .cache import Cache
from .movie import Movie
from .source import Source
from .util import VIDEO_EXTS, write_if_changed

log = logging.getLogger(__name__)


class MovieDB:
    def __init__(self, source: Path, processed: Path, cache: Cache) -> None:
        self.source: Path = source
        self.processed: Path = processed
        self.cache: Cache = cache
        self.movies: list[Movie] = []

    def scan(self, match: str | None) -> None:
        movies: list[Movie] = []
        for ext in VIDEO_EXTS:
            pattern = f"*{match}*{ext}" if match else f"*{ext}"
            for video in self.source.rglob(pattern):
                log.debug(f"Found video file: {video.relative_to(self.source)}")
                id = str(video.relative_to(self.source).with_suffix(""))
                subtitles = [
                    Source(s, cache=self.cache)
                    for s in video.parent.glob(f"{video.stem}*.srt")
                ]
                movie = Movie(
                    id,
                    [Source(video, cache=self.cache), *subtitles],
                    self.source,
                    self.processed,
                )
                movies.append(movie)
        self.movies = movies

    def encode(self) -> None:
        for m in self.movies:
            for t in m.targets.values():
                t.encode_if_needed()

    def export(self) -> None:
        data = {}
        for m in self.movies:
            data[m.id] = m.to_json()
        data = dict(sorted(data.items()))

        output_file = self.processed / "movies.json"
        write_if_changed(output_file, json.dumps(data, indent=4))

    def status(self) -> None:
        GREEN = "\033[92m"
        RED = "\033[91m"
        ENDC = "\033[0m"
        OK = GREEN + "✔" + ENDC
        FAIL = RED + "✘" + ENDC
        for m in self.movies:
            line = ""
            for name, tgt in m.targets.items():
                status = OK if tgt.is_encoded() else FAIL
                line += f"{name[:3]}={status} "
            line += f"id={m.id}"
            print(line)

    def cleanup(self, delete: bool) -> None:
        # get a list of output files for each movie
        # get a list of each file in the processed dir
        # remove any files in the processed dir that aren't associated with a track
        # ignoring any special files (eg movies.json)
        special_files = ["movies.*", "cache.*", ".stfolder"]
        valid_files = set()
        for m in self.movies:
            for t in m.targets.values():
                p = t.get_output_path()
                if p.name == "movie.m3u8":
                    p = p.parent
                valid_files.add(p)

        for file in self.processed.glob("*"):
            if any(file.match(pattern) for pattern in special_files):
                continue
            if file not in valid_files:
                log.info(f"Removing orphaned file: {file.relative_to(self.processed)}")
                if delete:
                    if file.is_dir():
                        shutil.rmtree(str(file))
                    else:
                        file.unlink()
