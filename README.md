# Cinema

A thing to watch videos at the same time as other people

## Quickstart

* `docker compose up --build`
* Drop some `.mp4` or `.mkv` files into `./media/source/`
* Wait for the encoder to finish encoding them
* Visit http://127.0.0.1:2001 from several browsers
* Log in with different usernames and the same room code (rooms are created on-demand, whoever uses a code first is that room's admin)

# Components

## Cinema Viewer

Serves a folder full of HLS-encoded media files with a web frontend to watch them together with friends, in-sync, with a built-in chat room ([Docs](./cinema/README.md))

## Cinema Encoder

Monitors a folder for new video files and encodes them into HLS format with metadata for use with Cinema Viewer ([Docs](./encode/README.md))
