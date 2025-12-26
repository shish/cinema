from pathlib import Path


def get_lang(video: Path, subtitle: Path) -> str:
    """
    Get language code from subtitle filename.
    E.g. "movie.en.srt" -> "en"
    """
    video_stem = video.stem
    subtitle_stem = subtitle.stem
    lang_part = subtitle_stem.replace(video_stem, "").strip(".")
    if lang_part:
        return lang_part
    return "und"  # undefined
