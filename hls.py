#!/usr/bin/env python3

import argparse
import shlex
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser(description="Generate HLS stream from video file")
parser.add_argument("--dry-run", action="store_true", help="print commands instead of executing them")
parser.add_argument("files", nargs="+", help="video files to process", type=Path)
args = parser.parse_args()

for path_in in args.files:
    assert isinstance(path_in, Path)
    path_srt = path_in.with_suffix(".srt")
    path_vtt = path_in.with_suffix(".vtt")
    path_thumb = path_in.with_suffix(".jpg")
    path_index = path_in.with_suffix(".m3u8")
    path_stream = path_in.with_name(path_in.stem + "_%v")

    # height, video bandwidth, audio bandwidth
    fmts = [
        (720, "3M", "256k"),
        (480, "2M", "192k"),
        (360, "1M", "128k"),
    ]

    if path_in.exists():
        # generate VTT subtitles if needed
        if not path_vtt.exists():
            if path_srt.exists():
                # convert .srt to .vtt
                cmd = ["ffmpeg", "-i", path_srt, path_vtt]
            else:
                # extract subtitles from the video container
                cmd = ["ffmpeg", "-i", path_in, path_vtt]
            if args.dry_run:
                print(shlex.join(cmd))
            else:
                subprocess.run(cmd)

        # generate thumbnail if needed
        if not path_thumb.exists():
            cmd = [
                "ffmpeg",
                "-i", path_in,
                "-ss", "00:02:00",
                "-vf", "thumbnail",
                "-frames:v", "1",
                "-update", "true",
                path_thumb
            ]
            if args.dry_run:
                print(shlex.join(cmd))
            else:
                subprocess.run(cmd)


        # create HLS stream if needed
        if not path_index.exists():
            cmd = ["ffmpeg", "-i", path_in]

            # clone input video stream, resize clone #n to height=fmts[n][0]
            filt = "[0:v]split=%d" % len(fmts)
            filt += "".join(f"[v{d+1}]" for d in range(len(fmts))) + "; "
            filt += "; ".join([f"[v{n}]scale=w=-2:h={px}[v{n}out]" for n, (px, bw, abw) in enumerate(fmts, start=1)])
            cmd.extend(["-filter_complex", filt])

            cmd.extend(["-filter:a", "loudnorm"])

            for n, (px, bw, abw) in enumerate(fmts, start=0):
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

            for n, (px, bw, abw) in enumerate(fmts, start=0):
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

            cmd.extend(["-var_stream_map", " ".join(f"v:{n},a:{n}" for n in range(len(fmts))), path_stream / "index.m3u8"])

            if args.dry_run:
                print(shlex.join(cmd))
            else:
                subprocess.run(cmd)
