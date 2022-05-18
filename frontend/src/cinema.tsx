/// <reference path='./cinema.d.ts'/>
import h from "hyperapp-jsx-pragma";
import { app } from "hyperapp";
import { WebSocketListen, Http } from "hyperapp-fx";
import { Help } from "./screens/help";
import { Login } from "./screens/login";
import { RoomRender } from "./screens/room";
import { v4 as uuidv4 } from "uuid";

const DEV = false;

let sess = sessionStorage.getItem("sess");
if (!sess) {
    sess = uuidv4();
    sessionStorage.setItem("sess", sess);
}

let state: State = {
    conn: {
        user: DEV ? "Shish" : sessionStorage.getItem("user") || "",
        room: DEV ? "ASDF" : null,
        sess: sess,
    },
    loading: null,
    room: null,
    movies: [],
    rooms: {},
    ws_errors: 0,
    error: null,
    settings: {
        sound: false,
    },
    fullscreen: document.fullscreenElement != null,
    manual_entry: false,
    help: false,
};

try {
    state.settings = {
        ...state.settings,
        ...JSON.parse(localStorage.getItem("settings") || "{}"),
    };
} catch (err) {
    console.log("Error loading state:", err);
}

const ResetErrorAction = (state: State) => ({
    ...state,
    error: null,
});

function view(state: State) {
    (window as any).state = state;

    let screen = null;
    if (state.error !== null) {
        screen = (
            <main class="login">
                <header>
                    <i class="fas" />
                    <h1>Error</h1>
                    <i class="fas" />
                </header>
                <article>{state.error}</article>
                <footer>
                    <input type="button" value="Leave" onclick={ResetErrorAction} />
                </footer>
            </main>
        );
    } else if (state.loading !== null) {
        screen = (
            <main class="login">
                <header>
                    <i class="fas" />
                    <h1>Loading</h1>
                    <i class="fas" />
                </header>
                <article>{state.loading}</article>
            </main>
        );
    } else if (state.help) {
        screen = <Help />;
    } else if (state.room !== null) {
        screen = <RoomRender state={state} admin={state.room.admins.includes(state.conn.user)} />;
    } else {
        screen = <Login state={state} />;
    }
    return <body>{screen}</body>;
}

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
                return { ...state, loading: "Syncing..." };
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
                // TODO: separate room-state updates and chat-broadcast updates
                let resp = JSON.parse(msg.data);

                if (resp.error) {
                    return {
                        ...state,
                        loading: null,
                        error: resp.error,
                        conn: { ...state.conn, room: null },
                    };
                }
                let new_state = { ...state, loading: null, room: resp };
                // After we have loaded the movie player HTML, make sure
                // the timestamp is synced
                setTimeout(() => sync_movie_state(new_state), 10);
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

export function sync_movie_state(state: State) {
    function setCurrentTimeIsh(movie: HTMLVideoElement, goal: number) {
        // if our time is nearly-correct, leave it as-is
        let diff = Math.abs(movie.currentTime - goal);
        if (diff > 3) {
            console.log(`Time is ${movie.currentTime} and should be ${goal}`);
            movie.currentTime = goal;
        }
    }

    let movie = document.getElementById("movie") as HTMLVideoElement;
    if (movie && state.room && state.room.state) {
        if (state.room.state.paused != undefined) {
            if (!movie.paused) movie.pause();
            setCurrentTimeIsh(movie, state.room.state.paused[1]);
        }
        if (state.room.state.playing != undefined) {
            //console.log(((new Date()).getTime() / 1000), state.room.state.playing, ((new Date()).getTime() / 1000) - state.room.state.playing);
            setCurrentTimeIsh(movie, ((new Date()).getTime() / 1000) - state.room.state.playing[1]);
            if (movie.paused) movie.play();
        }
    }
}

function viewportHandler() {
    var main = document.getElementsByTagName("MAIN")[0] as HTMLElement;
    if (main) {
        main.style.top = window.visualViewport.offsetTop + "px";
        main.style.height = window.visualViewport.height + "px";
    }
}
window.visualViewport.addEventListener('resize', viewportHandler);

app({
    init: [state, Http({
        url: "/movies",
        action(state, movies) {
            return { ...state, movies };
        },
        error(state, error) {
            console.log(error);
            return state;
        }
    }), Http({
        url: "/rooms",
        action(state, rooms) {
            return { ...state, rooms };
        },
        error(state, error) {
            console.log(error);
            return state;
        }
    })],
    view: view,
    subscriptions: (state: State) => [
        state.conn.room && getOpenWebSocketListener(state),
    ],
    node: document.body,
});
