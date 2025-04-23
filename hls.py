#!/usr/bin/env python3

import argparse
import shlex
import subprocess
import logging
from pathlib import Path


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


def run(cmd, logfile: Path):
    log.info(shlex.join(str(x) for x in cmd))
    if not args.dry_run:
        with logfile.open("a") as f:
            subprocess.run(cmd, stdout=f, stderr=f)


for path_in in args.files:
    assert isinstance(path_in, Path)
    path_srt = path_in.with_suffix(".srt")
    path_vtt = path_in.with_suffix(".vtt")
    path_thumb = path_in.with_suffix(".jpg")
    path_index = path_in.with_suffix(".m3u8")
    path_log = path_in.with_suffix(".log")
    path_stream = path_in.with_name(path_in.stem + "_%v")

    if path_in.exists():
        # generate VTT subtitles if needed
        if path_vtt.exists() and not args.force:
            log.info(f"Skipping {path_vtt} (already exists)")
        else:
            if path_srt.exists():
                # convert .srt to .vtt
                cmd = ["ffmpeg", "-i", path_srt, path_vtt]
            else:
                # extract subtitles from the video container
                cmd = ["ffmpeg", "-i", path_in, path_vtt]
            run(cmd, path_log)

        # generate thumbnail if needed
        # (if the user has specified a thumbnail timestamp, we can't tell if the existing
        # thumbnail is the one they want, so we always regenerate it)
        if not args.thumbnail and (path_thumb.exists() and not args.force):
            log.info(f"Skipping {path_thumb} (already exists)")
        else:
            cmd = [
                "ffmpeg",
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
        if path_index.exists() and not args.force:
            log.info(f"Skipping {path_index} (already exists)")
        else:
            input_height = int(subprocess.check_output([
                "ffprobe",
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=height",
                "-of", "default=noprint_wrappers=1:nokey=1",
                path_in
            ]).decode().strip())

            cmd = ["ffmpeg", "-i", path_in]

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
                    "-map", f"a:0",
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
                "-master_pl_name", path_index
            ])

            cmd.extend(["-var_stream_map", " ".join(f"v:{n},a:{n}" for n in range(len(active_fmts))), path_stream / "index.m3u8"])

            run(cmd, path_log)
