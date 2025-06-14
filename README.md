# Cinema

A thing to watch videos at the same time as other people

## Frontend setup:

```bash
npm install
npm run dev
```

The frontend will then be auto-compiled each time it changes, run
the backend if you want to have a web server to view it.

## Backend setup:

```bash
cargo run -- -m /path/to/some/hls/videos/
```

Or to run with logging and auto-restart whenever the code changes:

```bash
cargo watch -s 'cargo run -- -m /Users/shish2k/Movies/Cinema/'
```

Traffic served on http://localhost:8074/

## Media setup:

Use `hls.py` to convert videos to a variety of HLS streams with different
quality settings that the client can then select from based on bandwidth.

```
$ ls
blah.mp4    # original video
blah.srt    # subtitles (optional)

$ ~/Projects/cinema/hls.py blah.mp4

$ ls
blah.mp4
blah.srt
blah.m3u8   # index of available quality streams
blah.vtt    # web-format subtitles
blah_0      # folder full of high-quality stream chunks
blah_1      # folder full of mid-quality stream chunks
blah_2      # folder full of low-quality stream chunks
```

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
