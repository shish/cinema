import json
import logging
from pathlib import Path
from typing import Literal

from tap import Tap

from .movie import Movie
from .source import Source
from .util import VIDEO_EXTS, wait_for_changes

log = logging.getLogger(__name__)


class Args(Tap):
    "Cinema Movie Encoder"

    # fmt: off
    source: Path = Path("../media/source")  # Source directory containing movies
    processed: Path = Path("../media/processed")  # Output directory for processed movies
    loop: int = 0  # Check for new files every N seconds
    debug: bool = False  # Enable debug logging
    delete: bool = False  # Actually delete files during cleanup
    cmd: Literal["all", "encode", "export", "status", "cleanup"]  # Run one step of the process
    match: str | None  # Only encode files matching this pattern
    # fmt: on

    def configure(self):
        self.add_argument("cmd", nargs="?", default="all")
        self.add_argument("match", nargs="?", default=None)


def scan(source: Path, processed: Path, match: str | None) -> list[Movie]:
    movies: list[Movie] = []
    for ext in VIDEO_EXTS:
        pattern = f"*{match}*{ext}" if match else f"*{ext}"
        for video in source.rglob(pattern):
            log.debug(f"Found video file: {video.relative_to(source)}")
            id = str(video.relative_to(source).with_suffix(""))
            subtitles = [Source(s) for s in video.parent.glob(f"{video.stem}*.srt")]
            movie = Movie(id, [Source(video), *subtitles], source, processed)
            movies.append(movie)
    return movies


def encode(movies: list[Movie], source: Path, processed: Path) -> None:
    for m in movies:
        for t in m.targets.values():
            t.encode_if_needed()


def export(movies: list[Movie], processed: Path) -> None:
    data = {}
    for m in movies:
        data[m.id] = m.to_json()
    data = dict(sorted(data.items()))

    output_file = processed / "movies.json"
    try:
        old_data = json.loads(output_file.read_text())
    except Exception:
        old_data = {}

    if data != old_data:
        with output_file.open("w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)


def status(movies: list[Movie], match: str | None) -> None:
    GREEN = "\033[92m"
    RED = "\033[91m"
    ENDC = "\033[0m"
    OK = GREEN + "✔" + ENDC
    FAIL = RED + "✘" + ENDC
    for m in movies:
        if match and match not in m.id:
            continue
        log.info(f"Movie: {m.id}")
        for name, tgt in m.targets.items():
            status = OK if tgt.is_encoded() else FAIL
            log.info(f"  {name}: {status}")


def cleanup(movies: list[Movie], processed: Path, delete: bool) -> None:
    # get a list of output files for each movie
    # get a list of each file in the processed dir
    # remove any files in the processed dir that aren't associated with a track
    # ignoring any special files (eg movies.json)
    special_files = ["movies.json*"]
    valid_files = set()
    for m in movies:
        for t in m.targets.values():
            p = t.get_output_path()
            if p.name == "movie.m3u8":
                p = p.parent
            valid_files.add(p)

    for file in processed.glob("*"):
        if any(file.match(pattern) for pattern in special_files):
            continue
        if file not in valid_files:
            log.info(f"Removing orphaned file: {file.relative_to(processed)}")
            if delete:
                if file.is_dir():
                    for subfile in file.rglob("*"):
                        subfile.unlink()
                    file.rmdir()
                else:
                    file.unlink()


def _main_loop(args: Args) -> None:
    movies = scan(args.source, args.processed, args.match)
    if args.cmd in {"all", "encode"}:
        encode(movies, args.source, args.processed)
    if args.cmd in {"all", "export"} and not args.match:
        export(movies, args.processed)
    if args.cmd in {"status"}:
        status(movies, args.match)
    if args.cmd in {"cleanup"} and not args.match:
        cleanup(movies, args.processed, args.delete)


def main():
    try:
        args = Args().parse_args()

        logging.basicConfig(
            level=logging.DEBUG if args.debug else logging.INFO,
            format="%(asctime)s %(message)s",
        )

        for _ in wait_for_changes(args.source, args.loop):
            _main_loop(args)
    except KeyboardInterrupt:
        log.info("Exiting on user request")
