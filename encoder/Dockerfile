FROM astral/uv:0.13.6-alpine
WORKDIR /app
COPY --from=mwader/static-ffmpeg:9.0.2 /ffmpeg /ffprobe /usr/local/bin/
RUN --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    uv sync --locked --no-dev
COPY . /app
RUN uv sync --locked --no-dev

VOLUME /source
VOLUME /processed
ENTRYPOINT ["/app/.venv/bin/encoder", "--source", "/media/source", "--processed", "/media/processed"]
CMD ["all", "--loop", "600"]
