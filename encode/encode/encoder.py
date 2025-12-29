import hashlib
import json
import logging
import re
import shlex
import subprocess
from abc import ABC, abstractmethod
from pathlib import Path

from tqdm import tqdm

from encode.util import SUBTITLE_EXTS, VIDEO_EXTS

from .source import Source

log = logging.getLogger(__name__)


def ffprobe(path_in: Path) -> dict:
    # fmt: off
    args = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_streams",
        "-show_format",
        "-of", "json",
        str(path_in),
    ]
    # fmt: on
    return json.loads(subprocess.check_output(args).decode().strip())


class Encoder(ABC):
    FFMPEG_BASE: list[str] = ["ffmpeg", "-hide_banner", "-loglevel", "quiet", "-stats"]

    def __init__(self, sources: list[Source], source: Path, processed: Path) -> None:
        self.source = source
        self.processed = processed
        self.sources = self.find_relevant_sources(sources)
        # combine the hashes of all relevant sources
        combined_hash = hashlib.md5()
        for h in sorted([s.hash for s in self.sources]):
            combined_hash.update(h.encode())
        self.hash = combined_hash.hexdigest()

    @abstractmethod
    def find_relevant_sources(self, sources: list[Source]) -> list[Source]: ...

    @abstractmethod
    def get_output_path(self) -> Path: ...

    @abstractmethod
    def encode(self) -> None: ...

    def encode_if_needed(self) -> None:
        if not self.get_output_path().exists():
            log.info(f"Encoding: {self}")
            self.encode()
        else:
            log.debug(f"Already done: {self}")

    def __str__(self) -> str:
        return f"{self.__class__.__name__}({str(self.get_output_path().relative_to(self.processed))!r}, {[str(s.path.relative_to(self.source)) for s in self.sources]})"

    def run(self, cmd, duration: float | None = None):
        log.info(shlex.join(str(x) for x in cmd))

        with (
            tqdm(
                total=int(duration) if duration else None,
                unit="s",
                disable=duration is None,
                leave=False,
            ) as pbar,
        ):
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                errors="ignore",  # some files contain non-utf8 metadata
            )

            assert proc.stdout is not None
            while line := proc.stdout.readline():
                # f.write(line)
                if match := re.search(r"time=(\d+):(\d+):(\d+.\d+)", line):
                    hours, minutes, seconds = match.groups()
                    current_s = int(
                        int(hours) * 60 * 60 + int(minutes) * 60 + float(seconds)
                    )
                    if duration:
                        pbar.update(current_s - pbar.n)

            proc.stdout.close()
            proc.wait()

            # if proc.returncode != 0:
            #    log.error(f"Command failed with return code {proc.returncode}")
            #    raise subprocess.CalledProcessError(proc.returncode, cmd)


class EncodeVideo(Encoder):
    # height, video bandwidth, audio bandwidth
    FMTS = [
        (720, "3M", "256k"),
        (480, "2M", "192k"),
        (360, "1M", "128k"),
    ]

    def find_relevant_sources(self, sources: list[Source]) -> list[Source]:
        return [s for s in sources if s.path.suffix in VIDEO_EXTS]

    def get_output_path(self) -> Path:
        return self.processed / Path(self.hash)

    # fmt: off
    def encode(self) -> None:
        source_path = self.sources[0].path
        output_path = self.get_output_path()
        log.info(f"Encoding video from {source_path} to {output_path}")

        path_stream = output_path / "stream_%v"

        ffprobe_json = ffprobe(source_path)
        input_height = ffprobe_json["streams"][0]["height"]
        input_duration = float(ffprobe_json["format"]["duration"])

        cmd = self.FFMPEG_BASE + ["-i", source_path]

        active_fmts = []
        for fmt in self.FMTS:
            if input_height < fmt[0]:
                log.warning(
                    f"Input video height {input_height} is less than {fmt[0]} - skipping instead of upscaling"
                )
                continue
            active_fmts.append(fmt)
        if not active_fmts:
            log.warning(f"Input video too small, using {input_height}")
            active_fmts.append((input_height, "1M", "128k"))

        # clone input video stream, resize clone #n to height=fmts[n][0]
        filt = "[0:v]split=%d" % len(active_fmts)
        filt += "".join(f"[v{d + 1}]" for d in range(len(active_fmts))) + "; "
        filt += "; ".join([
            f"[v{n}]scale=w=-2:h={px}[v{n}out]"
            for n, (px, bw, abw) in enumerate(active_fmts, start=1)
        ])
        cmd.extend(["-filter_complex", filt])

        cmd.extend(["-filter:a", "loudnorm"])

        for n, (px, bw, abw) in enumerate(active_fmts):
            # video encoding settings
            cmd.extend([
                "-map", f"[v{n + 1}out]",
                # codec for video stream n
                f"-c:v:{n}", "libx264",
                # browsers support high 8-bit; need to specify this because otherwise
                # ffmpeg will attempt to transcode a 10-bit source to 10-bit output
                "-profile:v", "high",
                "-pix_fmt",  "yuv420p",
                # ???
                "-x264-params", "nal-hrd=cbr:force-cfr=1",
                # bitrate for video stream n
                f"-b:v:{n}", bw,
                f"-maxrate:v:{n}", bw,
                f"-minrate:v:{n}", bw,
                f"-bufsize:v:{n}", bw,
                # ???
                "-preset", "slow",
                "-g", "48",
                "-sc_threshold", "0",
                "-keyint_min", "48",
            ])

            # audio encoding settings
            cmd.extend([
                "-map", "a:0",
                # codec for audio stream n
                f"-c:a:{n}", "aac",
                # bitrate for audio stream n
                f"-b:a:{n}", abw,
                # stereo
                "-ac", "2",
            ])

        cmd.extend([
            "-f", "hls",
            "-hls_time", "2",
            "-hls_playlist_type", "vod",
            "-hls_flags", "independent_segments",
            "-hls_segment_type", "mpegts",
            "-hls_segment_filename", path_stream / "data%04d.ts",
            "-master_pl_name", "movie.m3u8", #path_index.name,
        ])

        cmd.extend([
            "-var_stream_map",
            " ".join(f"v:{n},a:{n}" for n in range(len(active_fmts))),
            path_stream / "index.m3u8",
        ])

        self.run(cmd, duration=input_duration)


class EncodeSubs(Encoder):
    def find_relevant_sources(self, sources: list[Source]) -> list[Source]:
        return [s for s in sources if s.path.suffix in SUBTITLE_EXTS] or [
            s for s in sources if s.path.suffix in VIDEO_EXTS
        ]

    def get_output_path(self) -> Path:
        return self.processed / Path(self.hash).with_suffix(".vtt")

    def encode(self) -> None:
        source_path = self.sources[0].path
        output_path = self.get_output_path()
        log.info(f"Encoding subtitles from {source_path} to {output_path}")
        cmd = self.FFMPEG_BASE + ["-i", source_path, output_path]
        self.run(cmd)


class EncodeThumb(Encoder):
    def find_relevant_sources(self, sources: list[Source]) -> list[Source]:
        return [s for s in sources if s.path.suffix in VIDEO_EXTS]

    def get_output_path(self) -> Path:
        return self.processed / Path(self.hash).with_suffix(".jpg")

    def encode(self) -> None:
        source_path = self.sources[0].path
        output_path = self.get_output_path()
        log.info(f"Encoding thumbnail from {source_path} to {output_path}")
        # fmt: off
        cmd = self.FFMPEG_BASE + [
            "-i", source_path,
            "-ss", "00:02:00",
            "-vf", "thumbnail",
            "-frames:v", "1",
            "-update", "true",
            "-y",
            output_path,
        ]
        self.run(cmd)
