import logging
import typing as t
from pathlib import Path

from tap import Tap

from .cache import Cache
from .moviedb import MovieDB
from .util import wait_for_changes

log = logging.getLogger(__name__)


class Args(Tap):
    "Cinema Movie Encoder"

    # fmt: off
    source: Path = Path("../media/source")  # Source directory containing movies
    processed: Path = Path("../media/processed")  # Output directory for processed movies
    loop: int = 0  # Check for new files every N seconds
    debug: bool = False  # Enable debug logging
    delete: bool = False  # Actually delete files during cleanup
    threads: int = 1  # Number of parallel encode jobs
    cmd: t.Literal["all", "encode", "export", "status", "cleanup"]  # Run one step of the process
    match: str | None  # Only encode files matching this pattern
    # fmt: on

    def configure(self):
        self.add_argument("cmd", nargs="?", default="all")
        self.add_argument("match", nargs="?", default=None)


def main():
    try:
        args = Args().parse_args()

        logging.basicConfig(
            level=logging.DEBUG if args.debug else logging.INFO,
            format="%(asctime)s %(message)s",
        )

        cache = Cache(args.processed / "cache.json")
        db = MovieDB(args.source, args.processed, cache)

        for _ in wait_for_changes(args.source, args.loop):
            db.scan(args.match)
            if args.cmd in {"all", "encode"}:
                db.encode(args.threads)
            if args.cmd in {"all", "export"} and not args.match:
                db.export()
            if args.cmd in {"status"}:
                db.status()
            if args.cmd in {"cleanup"} and not args.match:
                db.cleanup(args.delete)
            cache.save()
    except KeyboardInterrupt:
        log.info("Exiting on user request")
