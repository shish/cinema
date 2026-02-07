## Protocol

* User subscribes to MQTT topic `global/movies` to get a list of movies
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
