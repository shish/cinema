# Cinema

A thing to watch videos at the same time as other people

## Quickstart

* `docker compose up --build`
* Drop some `.mp4` or `.mkv` files into `./media/source/`
* Wait for the encoder to finish encoding them
* Visit http://127.0.0.1:2001 from several browsers
* Log in with different usernames and the same room code (rooms are created on-demand, whoever uses a code first is that room's admin)

# Components

## Frontend

Send commands to the backend, handles broadcast messages like "begin playing blah.mp4" ([Docs](./frontend/README.md))

## Backend

Accepts commands, authenticates, broadcasts state updates ([Docs](./backend/README.md))

## Encoder

Monitors a folder for new video files and encodes them into HLS format with metadata for use with Cinema Viewer ([Docs](./encode/README.md))
