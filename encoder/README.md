# Cinema Encoder

Monitors a folder for new video files and encodes them into HLS format with metadata for use with Cinema Viewer.

```bash
uv run encoder \
    --loop 60 \
    --source /data/cinema-files/source/ \
    --processed /data/cinema-files/processed/
```

or

```bash
docker compose run encoder
```
