# Cinema Viewer

## Backend setup

Given a folder full of HLS videos and metadata (created with [encoder](../encode/README.md))

```bash
cargo run -- -m /data/cinema-files/processed/
```

API served on http://localhost:2001/

## Frontend setup

```bash
npm install
npm run serve
```

The frontend serves on http://localhost:2002/ with API requests proxied to the backend.

## Protocol

* User checks `/files/movies.json` to get a list of movies
* User connects to `/api/room?room=...&user=...&sess=...` to get a websocket connection
  * `room` -- room code, a new room will be created if one doesn't exist
  * `user` -- username, any arbitrary text
  * `sess` -- client-chosen GUID
* Websocket will broadcast updates to the `Room` state
* User can send commands in the websocket:
  * `{"pause", ["My Movie", 20.4]}` -- timestamp inside the file where we paused
  * `{"play", ["My Movie", 1652775941.2]]` -- absolute timestamp for "the moment
    when the movie started" (specified this way so that people who arrive late
	  and receive this message after everybody else will still be in sync)
  * `{"chat", "Hello there friends"}`
