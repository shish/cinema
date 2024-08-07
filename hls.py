#!/usr/bin/env python3

import os
import sys
import subprocess
import shlex

for fn_in in sys.argv[1:]:
    fn_base, fn_ext = os.path.splitext(fn_in)
    fn_srt = f"{fn_base}.srt"
    fn_vtt = f"{fn_base}.vtt"

    # height, video bandwidth, audio bandwidth
    fmts = [
        (720, "3M", "256k"),
        (480, "2M", "192k"),
        (360, "1M", "128k"),
    ]

    if os.path.exists(fn_in):
        # generate VTT subtitles if needed
        if not os.path.exists(fn_vtt):
            if os.path.exists(fn_srt):
                # convert .srt to .vtt
                subprocess.run(["ffmpeg", "-i", fn_srt, fn_vtt])
            else:
                # extract subtitles from the video container
                subprocess.run(["ffmpeg", "-i", fn_in, fn_vtt])

        cmd = ["ffmpeg", "-i", fn_in]

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
            "-hls_segment_filename", f"{fn_base}_%v/data%02d.ts",
            "-master_pl_name", f"{fn_base}.m3u8"
        ])

        cmd.extend(["-var_stream_map", " ".join(f"v:{n},a:{n}" for n in range(len(fmts))), f"{fn_base}_%v/index.m3u8"])
        subprocess.run(cmd)
        # print(shlex.join(cmd))
