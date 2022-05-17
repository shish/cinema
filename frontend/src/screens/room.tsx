import h from "hyperapp-jsx-pragma";
import { WebSocketSend } from "hyperapp-fx";
import { Header } from "./base";
import { socket_name, sync_movie_state } from "../theatre";

function WebSocketCommand(state: State, command: object) {
    return WebSocketSend({
        url: socket_name(state),
        data: JSON.stringify(command),
    });
}

/**********************************************************************
 * Video
 */
const PauseAction = (state: State) => [
    { ...state } as State,
    WebSocketCommand(state, {
        pause: [
            (document.getElementById("movie_list") as HTMLFormElement).value,
            (document.getElementById("movie") as HTMLVideoElement).currentTime,
        ]
    })
];
const PlayAction = (state: State) => [
    { ...state } as State,
    WebSocketCommand(state, {
        play: [
            (document.getElementById("movie_list") as HTMLFormElement).value,
            ((new Date()).getTime() / 1000) - (document.getElementById("movie") as HTMLVideoElement).currentTime
        ],
    })
];
const SyncAction = function (state: State, event: Event) {
    sync_movie_state(state);
    return state;
}
const MainVideo = ({ state, admin }: { state: RoomState, admin: boolean }) => (
    (state.playing || state.paused) ?
        <video
            id="movie"
            src={"/movies/" + (state.playing || state.paused)[0]}
            controls={admin}
            onplay={admin && PlayAction}
            onpause={admin && PauseAction}
            onseeked={admin && PauseAction}
            onloadedmetadata={SyncAction}
        ></video> : <div class="blackout" />
);

/**********************************************************************
 * Movie List
 */
const LoadAction = function (state: State) {
    let movie = (document.getElementById("movie_list") as HTMLFormElement).value;
    let command = movie ? { pause: [movie, 0] } : { stop: null };
    return [
        { ...state } as State,
        WebSocketCommand(state, command)
    ];
};
const MovieList = ({ movies, state, admin }) => (
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

/**********************************************************************
 * Viewers
 */
const AdminAction = (user: string) => function (state: State) {
    return [
        { ...state } as State,
        WebSocketCommand(state, { admin: user })
    ];
};
const UnadminAction = (user: string) => function (state: State) {
    return [
        { ...state } as State,
        WebSocketCommand(state, { unadmin: user })
    ];
};
const ViewerList = ({ viewers, admins }) => (
    <ul class="viewers">
        {viewers.map((p) => (
            <li
                class={admins.includes(p.name) ? "admin" : ""}
                onclick={admins.includes(p.name) ? UnadminAction(p.name) : AdminAction(p.name)}
            >{p.name}</li>
        ))}
    </ul>
);

/**********************************************************************
 * Chat
 */
const ChatAction = function (state: State, event: SubmitEvent) {
    let text = (document.getElementById("chat_input") as HTMLFormElement).value;
    (document.getElementById("chat_input") as HTMLFormElement).value = "";
    event.preventDefault();
    return [
        { ...state } as State,
        WebSocketCommand(state, {
            chat: text,
        })
    ];
};
const Chat = ({ log }) => (
    <div class="chat">
        <ul class="chat_log" id="chat_log">
            {log.map((p) => (<li class={p[0] == "system" ? "system" : "user"}>
                <span class="user">{p[0]}</span>
                <span class="message">{p[1]}</span>
            </li>))}
        </ul>
        <form class="chat_input" onsubmit={ChatAction}>
            <input id="chat_input" autocomplete={"off"}></input>
            <button>Send</button>
        </form>
    </div>
);

/**********************************************************************
 * Layout
 */
 const TitleAction = function (state: State, event: SubmitEvent) {
    return [
        { ...state } as State,
        WebSocketCommand(state, {
            title: (document.getElementById("title") as HTMLFormElement).value,
        })
    ];
};
function ToggleSound(state: State): State {
    let new_state = {
        ...state,
        settings: {
            ...state.settings,
            sound: !state.settings.sound,
        },
    };
    localStorage.setItem("settings", JSON.stringify(new_state.settings));
    return new_state;
}
function GoFullscreen(state: State): State {
    requestAnimationFrame(() => document.documentElement.requestFullscreen());
    return {...state, fullscreen: !state.fullscreen};
}
function ExitFullscreen(state: State): State {
    if (document.exitFullscreen) {
        requestAnimationFrame(() => document.exitFullscreen());
    }
    return {...state, fullscreen: !state.fullscreen};
}
export const RoomRender = ({ state, admin }: { state: State, admin: boolean }) => (
    <main class={admin ? "room admin" : "room user"}>
        <Header
            header={<span>
                {state.room.name}:{" "}
                {admin ?
                    <input id="title" value={state.room.title} onchange={TitleAction} /> :
                    state.room.title
                }
            </span>}
            left={state.settings.sound ? (
                <i class="fas fa-bell" onclick={ToggleSound} />
            ) : (
                <i class="fas fa-bell-slash" onclick={ToggleSound} />
            )}
            right={state.fullscreen ?
                <i class="fas fa-compress-arrows-alt" onclick={ExitFullscreen} /> :
                <i class="fas fa-expand-arrows-alt" onclick={GoFullscreen} />}
        />
        <MainVideo
            state={state.room.state}
            admin={admin}
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
            admin={admin}
        />
    </main>
);
