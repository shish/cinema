#!/usr/bin/env python3

import argparse
import shlex
import subprocess
import logging
import json
import re
from pathlib import Path
from tqdm import tqdm


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

# height, video bandwidth, audio bandwidth
FMTS = [
    (720, "3M", "256k"),
    (480, "2M", "192k"),
    (360, "1M", "128k"),
]


parser = argparse.ArgumentParser(description="Generate HLS stream from video file")
parser.add_argument("--force", action="store_true", help="overwrite existing files")
parser.add_argument("--dry-run", action="store_true", help="print commands instead of executing them")
parser.add_argument("--thumbnail", help="where to take thumbnail from (eg 00:42)")
parser.add_argument("files", nargs="+", help="video files to process", type=Path)
args = parser.parse_args()


def run(cmd, logfile: Path, duration: float|None = None):
    log.info(shlex.join(str(x) for x in cmd))
    if not args.dry_run:
        with logfile.open("a") as f:
            # subprocess.run(cmd, stdout=f, stderr=f)

            with tqdm(
                total=int(duration) if duration else None,
                unit="s",
                disable=duration is None,
                leave=False
            ) as pbar:
                proc = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    errors="ignore",  # some files contain non-utf8 metadata
                )

                assert proc.stdout is not None
                while line := proc.stdout.readline():
                    f.write(line)
                    if match := re.search(r"time=(\d+):(\d+):(\d+.\d+)", line):
                        hours, minutes, seconds = match.groups()
                        current_s = int(int(hours) * 60 * 60 + int(minutes) * 60 + float(seconds))
                        pbar.update(current_s - pbar.n)

                proc.stdout.close()
                proc.wait()

                #if proc.returncode != 0:
                #    log.error(f"Command failed with return code {proc.returncode}")
                #    raise subprocess.CalledProcessError(proc.returncode, cmd)


def is_needed(path: Path) -> bool:
    """Check if the file needs processing."""
    if not path.exists():
        return True
    if args.force:
        return True
    log.info(f"Skipping {path.name} (already exists)")
    return False


for path_in in args.files:
    assert isinstance(path_in, Path)
    path_srt = path_in.with_suffix(".srt")
    path_vtt = path_in.with_suffix(".vtt")
    path_thumb = path_in.with_suffix(".jpg")
    path_index = path_in.with_suffix(".m3u8")
    path_log = path_in.with_suffix(".log")
    path_stream = path_in.with_name(path_in.stem + "_%v")

    if path_in.exists():
        ffmpeg_base = ["ffmpeg", "-hide_banner", "-loglevel", "quiet", "-stats"]

        # generate VTT subtitles if needed
        if is_needed(path_vtt):
            if path_srt.exists():
                # convert .srt to .vtt
                cmd = ffmpeg_base + ["-i", path_srt, path_vtt]
            else:
                # extract subtitles from the video container
                cmd = ffmpeg_base + ["-i", path_in, path_vtt]
            run(cmd, path_log)

        # generate thumbnail if needed
        # (if the user has specified a thumbnail timestamp, we can't tell if the existing
        # thumbnail is the one they want, so we always regenerate it)
        if is_needed(path_thumb) or args.thumbnail:
            cmd = ffmpeg_base + [
                "-i", path_in,
                "-ss", args.thumbnail or "00:02:00",
                "-vf", "thumbnail",
                "-frames:v", "1",
                "-update", "true",
                "-y",
                path_thumb
            ]
            run(cmd, path_log)


        # create HLS stream if needed
        if is_needed(path_index):
            ffprobe_json = json.loads(subprocess.check_output([
                "ffprobe",
                "-v", "error",
                "-select_streams", "v:0",
                "-show_streams",
                "-show_format",
                "-of", "json",
                path_in
            ]).decode().strip())
            input_height = ffprobe_json["streams"][0]["height"]
            input_duration = float(ffprobe_json["format"]["duration"])

            cmd = ffmpeg_base + ["-i", path_in]

            active_fmts = []
            for fmt in FMTS:
                if input_height < fmt[0]:
                    log.warning(f"Input video height {input_height} is less than {fmt[0]} - skipping instead of upscaling")
                    continue
                active_fmts.append(fmt)
            if not active_fmts:
                log.warning(f"Input video too small, using {input_height}")
                active_fmts.append((input_height, "1M", "128k"))

            # clone input video stream, resize clone #n to height=fmts[n][0]
            filt = "[0:v]split=%d" % len(active_fmts)
            filt += "".join(f"[v{d+1}]" for d in range(len(active_fmts))) + "; "
            filt += "; ".join([f"[v{n}]scale=w=-2:h={px}[v{n}out]" for n, (px, bw, abw) in enumerate(active_fmts, start=1)])
            cmd.extend(["-filter_complex", filt])

            cmd.extend(["-filter:a", "loudnorm"])

            for n, (px, bw, abw) in enumerate(active_fmts):
                # video encoding settings
                cmd.extend([
                    "-map", f"[v{n+1}out]",
                    # codec for video stream n
                    f"-c:v:{n}", "libx264",
                    # browsers support high 8-bit; need to specify this because otherwise
                    # ffmpeg will attempt to transcode a 10-bit source to 10-bit output
                    "-profile:v", "high", "-pix_fmt", "yuv420p",
                    # ???
                    "-x264-params", "nal-hrd=cbr:force-cfr=1",
                    # bitrate for video stream n
                    f"-b:v:{n}", bw, f"-maxrate:v:{n}", bw, f"-minrate:v:{n}", bw, f"-bufsize:v:{n}", bw,
                    # ???
                    "-preset", "slow", "-g", "48", "-sc_threshold", "0", "-keyint_min", "48"
                ])

                # audio encoding settings
                cmd.extend([
                    "-map", "a:0",
                    # codec for audio stream n
                    f"-c:a:{n}", "aac",
                    # bitrate for audio stream n
                    f"-b:a:{n}", abw,
                    # stereo
                    "-ac", "2"
                ])

            cmd.extend([
                "-f", "hls",
                "-hls_time", "2",
                "-hls_playlist_type", "vod",
                "-hls_flags", "independent_segments",
                "-hls_segment_type", "mpegts",
                "-hls_segment_filename", path_stream / "data%02d.ts",
                "-master_pl_name", path_index.name
            ])

            cmd.extend([
                "-var_stream_map", " ".join(f"v:{n},a:{n}" for n in range(len(active_fmts))),
                path_stream / "index.m3u8"
            ])

            run(cmd, path_log, duration=input_duration)
