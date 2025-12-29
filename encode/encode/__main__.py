import argparse
import json
import logging
from pathlib import Path
from time import sleep

from .movie import Movie
from .source import Source

log = logging.getLogger(__name__)


def scan(source: Path, processed: Path, match: str | None) -> list[Movie]:
    movies: list[Movie] = []
    for video in source.rglob(f"*{match}*.mp4" if match else "*.mp4"):
        log.info(f"Found video file: {video.relative_to(source)}")
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
    output_file = processed / "movies.json"
    with output_file.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)
    # print(json.dumps(data, indent=4))


def cleanup(movies: list[Movie], processed: Path) -> None:
    # get a list of output files for each movie
    # get a list of each file in the processed dir
    # remove any files in the processed dir that aren't associated with a track
    # ignoring any special files (eg movies.json)
    special_files = ["movies.json"]
    ...


def main():
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
        "cmd",
        default="all",
        nargs="?",
        choices=["all", "encode", "export", "cleanup"],
        help="Run one step of the process",
    )
    parser.add_argument(
        "match", default=None, nargs="?", help="Only encode files matching this pattern"
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s %(message)s",
    )

    while True:
        movies = scan(args.source, args.processed, args.match)
        if args.cmd in {"all", "encode"}:
            encode(movies, args.source, args.processed)
        if args.cmd in {"all", "export"} and not args.match:
            export(movies, args.source, args.processed)
        if args.cmd in {"cleanup"} and not args.match:
            cleanup(movies, args.processed)
        if args.loop > 0:
            log.info(f"Sleeping for {args.loop} seconds...")
            sleep(args.loop)
        else:
            break
