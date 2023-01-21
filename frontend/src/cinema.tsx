/// <reference path='./cinema.d.ts'/>
import h from "hyperapp-jsx-pragma";

import { app } from "hyperapp";
import { WebSocketListen, Http, Interval } from "hyperapp-fx";
import { Root } from "./screens/root";
import { v4 as uuidv4 } from "uuid";
import * as jsonpatch from "jsonpatch";

const DEV = false;

let sess = sessionStorage.getItem("sess") ?? uuidv4();
sessionStorage.setItem("sess", sess);

let state: State = {
    conn: {
        user: DEV ? "Shish" : sessionStorage.getItem("user") || "",
        room: DEV ? "ASDF" : null,
        sess: sess,
    },
    loading: null,
    // @ts-expect-error
    room: null,
    movies: [],
    rooms: {},
    ws_errors: 0,
    error: null,
    fullscreen: document.fullscreenElement != null,
    manual_entry: false,
    help: false,
    currentTime: 0,
    duration: 0,
    show_settings: false,
    show_chat: true,
    title_edit: "",
    show_system: true,
    video_hint: null,
    show_subs: true,
};

let mySubs = {};

export function socket_name(state: State): string {
    return (
        (window.location.protocol == "https:" ? "wss:" : "ws:") +
        "//" +
        window.location.host +
        "/room" +
        "?room=" +
        state.conn.room +
        "&user=" +
        state.conn.user +
        "&sess=" +
        state.conn.sess +
        "&_=" +
        state.ws_errors
    );
}

function getOpenWebSocketListener(state: State): WebSocketListen {
    let url = socket_name(state);
    if (!mySubs[url]) {
        mySubs[url] = WebSocketListen({
            url: url,
            open(state: State): State {
                return {
                    ...state,
                    loading: "Syncing...",
                    // @ts-expect-error
                    room: null,
                };
            },
            close(state: State): State {
                delete mySubs[url];
                return {
                    ...state,
                    ws_errors: state.ws_errors + 1,
                    loading: "Connection to server was closed. Reconnecting...",
                };
            },
            action(state: State, msg: MessageEvent): State {
                let resp = JSON.parse(msg.data);
                if (state.room) {
                    resp = jsonpatch.apply_patch(state.room, resp);
                }

                let new_state = { ...state, loading: null, room: resp };
                // After we have appended new messages to the chat log,
                // make sure it's scrolled to the bottom
                setTimeout(() => {
                    let log = document.getElementById("chat_log");
                    if (log) log.scroll(0, log.scrollHeight);
                }, 10);
                return new_state;
            },
            error(state: State, error: Event): State {
                console.log("Error listening to websocket:", error);
                return {
                    ...state,
                    ws_errors: state.ws_errors + 1,
                    loading: "Reconnecting...",
                };
            },
        });
    }
    return mySubs[url];
}

function SyncMovieState(state: State): State {
    let movie = document.getElementById("movie") as HTMLVideoElement;
    let video_state = state.room?.video_state?.video;
    if (!movie || !video_state) {
        // we need both an HTML video element, and a video to be playing in it
        return state;
    }

    function setCurrentTimeIsh(movie: HTMLVideoElement, goal: number) {
        // if our time is nearly-correct, leave it as-is
        let diff = Math.abs(movie.currentTime - goal);
        if (diff > 3) {
            console.log(`Time is ${movie.currentTime} and should be ${goal}`);
            movie.currentTime = goal;
        }
    }

    function tryToPlay(movie: HTMLVideoElement) {
        var promise = movie.play();
        if (promise !== undefined) {
            promise
                .then((_) => {
                    // everything is awesome
                })
                .catch((error) => {
                    movie.muted = true;
                    movie.controls = true;
                    movie
                        .play()
                        .then((_) => {
                            // next sync will detect that we're muted and tell the user to unmute
                        })
                        .catch((error) => {
                            movie.muted = false;
                            // next sync will detect that we failed to play and tell the user to play
                        });
                });
        }
    }

    if (movie.textTracks.length > 0) {
        movie.textTracks[0].mode = state.show_subs ? "showing" : "hidden";
    }

    if (video_state[1].paused != undefined) {
        if (!movie.paused) movie.pause();
        setCurrentTimeIsh(movie, video_state[1].paused);
    }
    if (video_state[1].playing != undefined) {
        let goal_time = new Date().getTime() / 1000 - video_state[1].playing;
        if (goal_time < 0 || goal_time > (movie.duration || 9999)) {
            // if we haven't yet started, or we have already finished, then pause at the start
            if (!movie.paused) movie.pause();
            setCurrentTimeIsh(movie, 0);
        } else {
            setCurrentTimeIsh(movie, goal_time);

            // if we're supposed to be playing, but we're paused, attempt to
            // trigger auto-play
            if (movie.paused) tryToPlay(movie);

            // if everything is ok, remove any warning
            if (
                movie.paused == false &&
                movie.muted == false &&
                state.video_hint != ""
            ) {
                movie.controls = false;
                state = {
                    ...state,
                    video_hint: null,
                };
            }
            // if we only managed to mute-play, warn about that
            if (movie.paused == false && movie.muted == true) {
                movie.controls = true;
                state = {
                    ...state,
                    video_hint:
                        "Auto-play failed, you will need to tap the video and then un-mute it manually",
                };
            }
            // if we didn't manage to play at all, warn about that
            if (movie.paused == true) {
                movie.controls = true;
                state = {
                    ...state,
                    video_hint:
                        "Auto-play failed, you will need to tap the video and then push the play button manually",
                };
            }
        }
    }

    return state;
}

function viewportHandler() {
    var main = document.getElementsByTagName("MAIN")[0] as HTMLElement;
    if (main && window.visualViewport) {
        main.style.top = window.visualViewport.offsetTop + "px";
        main.style.height = window.visualViewport.height + "px";
    }
}
window.visualViewport?.addEventListener("resize", viewportHandler);

app({
    init: [
        state,
        Http({
            url: "/movies",
            action(state, movies) {
                return { ...state, movies };
            },
            error(state, error) {
                console.log(error);
                return state;
            },
        }),
        Http({
            url: "/rooms",
            action(state, rooms) {
                return { ...state, rooms };
            },
            error(state, error) {
                console.log(error);
                return state;
            },
        }),
    ],
    view: (state) => <Root state={state} />,
    subscriptions: (state: State) => [
        state.conn.room && getOpenWebSocketListener(state),
        state.conn.room &&
            Interval({
                every: 1000,
                action: SyncMovieState,
            }),
    ],
    node: document.body,
});
