"""
Verify that encoded videos are correct by directly checking both
source and output files for integrity and matching durations.
"""

import json
import logging
import subprocess
from pathlib import Path

from .movie import Movie

log = logging.getLogger(__name__)

# Tolerance for duration comparison (in seconds)
DURATION_TOLERANCE = 1.0


def ffprobe_direct(path: Path) -> dict | None:
    """
    Run ffprobe directly on a file, bypassing any cache.
    Returns None if the file is corrupt or unreadable.
    """
    # fmt: off
    args = [
        "ffprobe",
        "-v", "error",
        "-show_streams",
        "-show_format",
        "-of", "json",
        str(path),
    ]
    # fmt: on
    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode != 0:
            log.error(f"ffprobe error for {path}: {result.stderr}")
            return None
        return json.loads(result.stdout)
    except subprocess.TimeoutExpired:
        log.error(f"ffprobe timeout for {path}")
        return None
    except json.JSONDecodeError as e:
        log.error(f"ffprobe JSON decode error for {path}: {e}")
        return None
    except Exception as e:
        log.error(f"ffprobe exception for {path}: {e}")
        return None


def get_duration(probe_result: dict) -> float | None:
    """Extract duration from ffprobe result."""
    try:
        return float(probe_result["format"]["duration"])
    except (KeyError, TypeError, ValueError):
        return None


def verify_hls_output(output_dir: Path) -> tuple[bool, float | None, str]:
    """
    Verify an HLS output directory.
    Returns (is_valid, duration, message).
    """
    m3u8_file = output_dir / "movie.m3u8"
    if not m3u8_file.exists():
        return False, None, "movie.m3u8 not found"

    # Find all .ts segment files
    ts_files = list(output_dir.glob("stream_*.ts"))
    if not ts_files:
        return False, None, "No .ts segment files found"

    # Check each segment file for integrity
    total_duration = 0.0
    for ts_file in sorted(ts_files):
        probe = ffprobe_direct(ts_file)
        if probe is None:
            return False, None, f"Corrupt segment: {ts_file.name}"

        duration = get_duration(probe)
        if duration is None:
            return False, None, f"No duration in segment: {ts_file.name}"

        # For HLS with multiple quality streams, each .ts contains the same content
        # so we just use the duration from any one of them (they should all match)
        total_duration = max(total_duration, duration)

    return True, total_duration, "OK"


def verify_source(source_path: Path) -> tuple[bool, float | None, str]:
    """
    Verify a source video file.
    Returns (is_valid, duration, message).
    """
    if not source_path.exists():
        return False, None, "Source file not found"

    probe = ffprobe_direct(source_path)
    if probe is None:
        return False, None, "Source file corrupt or unreadable"

    duration = get_duration(probe)
    if duration is None:
        return False, None, "No duration in source file"

    # Check for video stream
    video_streams = [s for s in probe.get("streams", []) if s.get("codec_type") == "video"]
    if not video_streams:
        return False, None, "No video stream in source"

    return True, duration, "OK"


def verify_movie(movie: Movie) -> tuple[bool, list[str]]:
    """
    Verify a single movie's source and encoded output.
    Returns (is_valid, list of error messages).
    """
    errors = []

    # Get source video path from the video encoder target
    video_target = movie.targets.get("video")
    if video_target is None:
        return False, ["No video target found"]

    source_path = video_target.sources[0].path
    output_path = video_target.get_output_path()

    # Verify source
    source_valid, source_duration, source_msg = verify_source(source_path)
    if not source_valid:
        errors.append(f"Source: {source_msg}")

    # Verify output
    if not output_path.exists():
        errors.append("Output: Not encoded yet")
    else:
        output_dir = output_path.parent
        output_valid, output_duration, output_msg = verify_hls_output(output_dir)
        if not output_valid:
            errors.append(f"Output: {output_msg}")
        elif source_valid and output_valid:
            # Compare durations
            if source_duration is not None and output_duration is not None:
                diff = abs(source_duration - output_duration)
                if diff > DURATION_TOLERANCE:
                    errors.append(
                        f"Duration mismatch: source={source_duration:.2f}s, "
                        f"output={output_duration:.2f}s (diff={diff:.2f}s)"
                    )

    return len(errors) == 0, errors


def verify_movies(movies: list[Movie]) -> None:
    """
    Verify all movies and print results.
    """
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    ENDC = "\033[0m"

    total = len(movies)
    passed = 0
    failed = 0
    skipped = 0

    for movie in movies:
        is_valid, errors = verify_movie(movie)

        if is_valid:
            print(f"{GREEN}✔{ENDC} {movie.id}")
            passed += 1
        elif errors == ["Output: Not encoded yet"]:
            print(f"{YELLOW}○{ENDC} {movie.id} (not encoded)")
            skipped += 1
        else:
            print(f"{RED}✘{ENDC} {movie.id}")
            for error in errors:
                print(f"    {error}")
            failed += 1

    print()
    print(f"Verified: {passed} passed, {failed} failed, {skipped} skipped (total: {total})")
