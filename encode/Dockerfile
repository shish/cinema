FROM python:3.14 AS base
WORKDIR /app
COPY --from=mwader/static-ffmpeg:7.1.1 /ffmpeg /ffprobe /usr/local/bin/
RUN --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    pip install -e .
COPY . /app
RUN pip install -e .

VOLUME /source
VOLUME /processed
CMD ["encode", "--loop", "60", "--source", "/media/source", "--processed", "/media/processed"]
