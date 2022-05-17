# Theatre

A thing to watch videos at the same time as other people

## Frontend setup:

```
cd frontend
npm install
npm run watch
```

The frontend will then be auto-compiled each time it changes, run
the backend if you want to have a web server to view it.

## Backend setup:

```
cd backend
RUST_LOG=theatre_be=debug cargo run
```

Traffic served on http://localhost:8000/

## Protocol

* User checks `/rooms` to get a list of existing public rooms
* User checks `/movies` to get a list of movies
* User connects to `/room?room=...&user=...&sess=...` to get a websocket connection
  * `room` -- room code, a new room will be created if one doesn't exist
  * `user` -- username, any arbitrary text
  * `sess` -- client-chosen GUID
* Websocket will broadcast updates to the `Room` state
* User can send commands in the websocket:
  * `{"pause", ["foo.mp4", 20.4]}` -- timestamp inside the file where we paused
  * `{"play", ["bar.mp4", 1652775941.2]]` -- absolute timestamp for "the moment
    when the movie started" (specified this way so that people who arrive late
	and receive this message after everybody else will still be in sync)
  * `{"chat", "Hello there friends"}`
