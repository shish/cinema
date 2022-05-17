import h from "hyperapp-jsx-pragma";
import { WebSocketSend } from "hyperapp-fx";
import { Screen } from "./base";
import { socket_name, sync_movie_state } from "../theatre";

const LoadAction = (state: State) => [
    { ...state } as State,
    WebSocketSend({
        url: socket_name(state),
        data: JSON.stringify({
            pause: [
                (document.getElementById("movie_list") as HTMLFormElement).value,
                0
            ]
        }),
    }),
];
const PauseAction = (state: State) => [
    { ...state } as State,
    WebSocketSend({
        url: socket_name(state),
        data: JSON.stringify({
            pause: [
                (document.getElementById("movie_list") as HTMLFormElement).value,
                (document.getElementById("movie") as HTMLVideoElement).currentTime,
            ]
        }),
    }),
];
const PlayAction = (state: State) => [
    { ...state } as State,
    WebSocketSend({
        url: socket_name(state),
        data: JSON.stringify({
            play: [
                (document.getElementById("movie_list") as HTMLFormElement).value,
                ((new Date()).getTime() / 1000) - (document.getElementById("movie") as HTMLVideoElement).currentTime
            ],
        }),
    }),
];
const ChatAction = function(state: State, event: SubmitEvent) {
    let text = (document.getElementById("chat_input") as HTMLFormElement).value;
    (document.getElementById("chat_input") as HTMLFormElement).value = "";
    event.preventDefault();
    return [
        { ...state } as State,
        WebSocketSend({
            url: socket_name(state),
            data: JSON.stringify({
                chat: text,
            }),
        }),
    ];
};
const SyncAction = function(state: State, event: Event) {
    sync_movie_state(state);
    return state;
}

const MainVideo = ({state, admin}: {state: RoomState, admin: boolean}) => (
    (state.playing || state.paused) && 
        <video
            id="movie"
            src={"/movies/" + (state.playing || state.paused)[0]}
            controls={admin}
            onplay={admin && PlayAction}
            onpause={admin && PauseAction}
            onseeked={admin && PauseAction}
            onloadedmetadata={SyncAction}
        ></video>    
);

const MovieList = ({movies, state, admin}) => (
    <select id="movie_list" class="movie_list" onchange={LoadAction} readonly={!admin}>
        <option value="">Select Movie</option>
        {movies.map((p) => (
            <option selected={
                (state.playing && state.playing[0] == p) ||
                (state.paused && state.paused[0] == p)
            }>{p}</option>
        ))}
    </select>
);

const ViewerList = ({viewers, admins}) => (
    <ul class="viewers">
        {viewers.map((p) => (
            <li class={admins.includes(p.name) ? "admin" : ""}>{p.name}</li>
        ))}
    </ul>
);

const Chat = ({log}) => (
    <div class="chat">
        <ul class="chat_log" id="chat_log">
            {log.map((p) => (<li class={p[0] == "system" ? "system" : "user"}>
                <span class="user">{p[0]}</span>
                <span class="message">{p[1]}</span>
            </li>))}
        </ul>
        <form class="chat_input" onsubmit={ChatAction}>
            <input id="chat_input"></input>
            <button>Send</button>
        </form>
    </div>
);

export const RoomRender = ({ state }: { state: State }) => (
    <Screen
        settings={state.settings}
        header={state.room.name + ": " + state.room.title}
        right={state.room.admins.includes(state.conn.user) ? <i class="fas fa-cogs" />: <i class="fas" />}
        article_class={"room"}
    >
        <MainVideo
            state={state.room.state}
            admin={state.room.admins.includes(state.conn.user)}
        />
        <Chat
            log={state.room.chat}
        />
        <ViewerList
            viewers={state.room.viewers}
            admins={state.room.admins}
        />
        <MovieList
            movies={state.movies}
            state={state.room.state}
            admin={state.room.admins.includes(state.conn.user)}
        />
    </Screen>
);
