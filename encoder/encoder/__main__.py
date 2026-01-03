import argparse
import json
import logging
from pathlib import Path

from .movie import Movie
from .source import Source
from .util import VIDEO_EXTS, wait_for_changes

log = logging.getLogger(__name__)


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


def export(movies: list[Movie], source: Path, processed: Path) -> None:
    data = {}
    for m in movies:
        data[m.id] = m.to_json(source)
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


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Cinema Movie Encoder")
    parser.add_argument(
        "--source",
        type=Path,
        help="Source directory containing movies",
        default=Path("../media/source"),
    )
    parser.add_argument(
        "--processed",
        type=Path,
        help="Output directory for processed movies",
        default=Path("../media/processed"),
    )
    parser.add_argument(
        "--loop",
        type=int,
        default=0,
        help="Check for new files every N seconds",
        metavar="SECONDS",
    )
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    parser.add_argument(
        "--delete", action="store_true", help="Actually delete files during cleanup"
    )
    parser.add_argument(
        "cmd",
        default="all",
        nargs="?",
        choices=["all", "encode", "export", "status", "cleanup"],
        help="Run one step of the process",
    )
    parser.add_argument(
        "match", default=None, nargs="?", help="Only encode files matching this pattern"
    )
    return parser.parse_args()


def _main_loop(args: argparse.Namespace) -> None:
    movies = scan(args.source, args.processed, args.match)
    if args.cmd in {"all", "encode"}:
        encode(movies, args.source, args.processed)
    if args.cmd in {"all", "export"} and not args.match:
        export(movies, args.source, args.processed)
    if args.cmd in {"status"}:
        status(movies, args.match)
    if args.cmd in {"cleanup"} and not args.match:
        cleanup(movies, args.processed, args.delete)


def main():
    try:
        args = _parse_args()

        logging.basicConfig(
            level=logging.DEBUG if args.debug else logging.INFO,
            format="%(asctime)s %(message)s",
        )

        for _ in wait_for_changes(args.source, args.loop):
            _main_loop(args)
    except KeyboardInterrupt:
        log.info("Exiting on user request")
