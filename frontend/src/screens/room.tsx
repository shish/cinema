import h from "hyperapp-jsx-pragma";
import { WebSocketSend } from "hyperapp-fx";
import { socket_name, sync_movie_state } from "../cinema";
import { Http } from "hyperapp-fx";
import { SettingsMenu } from "./settings";
import dashjs from "dashjs";

class DASHVideoElement extends HTMLVideoElement {
    dashPlayer: dashjs.MediaPlayerClass|null = null;

    get src() {
        return this.getAttribute('src') || "";
    }
  
    set src(val) {
        if (val !== this.src) {
            this.setAttribute('src', val);
        }
        this.updatePlayer();
    }

    updatePlayer() {
        let val = this.getAttribute("src") || "";
        if(!this.dashPlayer) {
            return;
        }
        // console.log("Set video to ", val);
        if(val.startsWith("blob:")) {
            // leave this alone
        }
        else if(val.endsWith(".mpd")) {
            this.dashPlayer.attachView(this);
            this.dashPlayer.attachSource(val);
        }
        else {
            this.dashPlayer.reset();
        }
    }
  
    connectedCallback() {
        this.dashPlayer = dashjs.MediaPlayer().create();
        this.dashPlayer.initialize();
        this.updatePlayer();
    }
}
  
window.customElements.define('dash-video', DASHVideoElement, {extends: "video"});

export function WebSocketCommand(state: State, command: object) {
    return WebSocketSend({
        url: socket_name(state),
        data: JSON.stringify(command),
    });
}

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
const RefreshMovies = (state: State) => [
    state,
    Http({
        url: "/movies",
        action(state, movies) {
            return { ...state, movies };
        },
        error(state, error) {
            console.log(error);
            return state;
        }
    })
];
const NullSubmit = function (state: State, event: Event): State {
    event.preventDefault();
    return state;
}
const MovieList = ({ movies, video_state }: {movies: any, video_state: VideoState}) => (
    <form class="movie_list" onsubmit={NullSubmit}>
        <select id="movie_list" onchange={LoadAction}>
            <option value="">Select Movie</option>
            {movies.map((p) => (
                <option selected={video_state.video?.[0] == p}>{p}</option>
            ))}
        </select>
        <button onclick={RefreshMovies}>&nbsp;<i class="fas fa-sync"></i>&nbsp;</button>
    </form>
);

/**********************************************************************
 * Video
 */
const SetCanPlayAndSyncMovieState = function (state: State, event: Event) {
    sync_movie_state(state);
    return { ...state, can_play: true };
}
const SyncMovieState = function (state: State, event: Event) {
    sync_movie_state(state);
    return UpdateDuration(state);
}
const UpdateDuration = function (state: State) {
    return {
        ...state,
        currentTime: (document.getElementById("movie") as HTMLVideoElement).currentTime,
        duration: (document.getElementById("movie") as HTMLVideoElement).duration || 0,
    };
}
function iOS() {
    return [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ].includes(navigator.platform)
        // iPad on iOS 13 detection
        || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}
const MainVideo = ({ video_state, can_play }: { video_state: VideoState, can_play: boolean }) => (
    (video_state.video) ?
        <video
            id="movie"
            src={"/movies/" + video_state.video[0]}
            // iOS needs the user to press "play" for themselves. Once we've
            // detected that the movie can start playing, then they don't
            // need controls any more, so hide them to avoid desyncs.
            controls={iOS() && !can_play}
            onplay={SetCanPlayAndSyncMovieState}
            playsinline={true}
            // Once a new joiner has loaded enough data to be able to seek,
            // then make sure we've seeked to the right place.
            onloadeddata={SyncMovieState}
            // Keep the progress bar in the controls section in-sync with
            // the playing movie.
            ontimeupdate={UpdateDuration}
            is="dash-video"
        ></video> : <div class="blackout" />
);

/**********************************************************************
 * Controls
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
const SeekAction = (state: State) => [
    { ...state } as State,
    WebSocketCommand(state, {
        pause: [
            (document.getElementById("movie_list") as HTMLFormElement).value,
            (document.getElementById("seekbar") as HTMLFormElement).valueAsNumber
        ],
    })
];
function ts2hms(ts: number): string {
    return new Date(ts * 1000).toISOString().substring(11, 19);
}
const Controls = ({ state, enabled }: { state: State, enabled: boolean }) => (
    <form class="controls" onsubmit={function (s, e) { e.preventDefault(); return s; }}>
        {state.room.video_state.video?.[1].playing ?
            <button onclick={PauseAction} disabled={!enabled}>&nbsp;<i class="fas fa-pause"></i>&nbsp;</button> :
            <button onclick={PlayAction} disabled={!enabled}>&nbsp;<i class="fas fa-play"></i>&nbsp;</button>}
        <input id="seekbar" type="range" onchange={SeekAction} disabled={!enabled} min={0} max={state.duration} value={state.currentTime} />
        <span>{ts2hms(state.currentTime)} / {ts2hms(state.duration)}</span>
    </form>
);

/**********************************************************************
 * Viewers
 */
const AdminAction = (user: string) => (state: State) => [
    { ...state } as State,
    WebSocketCommand(state, { admin: user })
];
const UnadminAction = (user: string) => (state: State) => [
    { ...state } as State,
    WebSocketCommand(state, { unadmin: user })
];
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
function absolute_timestamp(ts: number): string {
    function convertUTCDateToLocalDate(date) {
        var newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);

        var offset = date.getTimezoneOffset() / 60;
        var hours = date.getHours();

        newDate.setHours(hours - offset);

        return newDate;
    }
    return convertUTCDateToLocalDate(new Date(ts * 1e3)).toISOString().slice(-13, -8);
}
function name2color(name: string): string {
    var hash = name.split(/[^a-zA-Z0-9]/)[0].toLowerCase().split('').reduce((prevHash, currVal) => (((prevHash << 5) - prevHash) + currVal.charCodeAt(0))|0, 0);
    var b1 = 0x77 + (hash & 0xFF) / 2;
    var b2 = 0x77 + ((hash >> 8) & 0xFF) / 2;
    var b3 = 0x77 + ((hash >> 16) & 0xFF) / 2;
    return `rgb(${b1}, ${b2}, ${b3})`;
}
function addAts(message: string) {
    return message.split(/(@[a-zA-Z0-9]+)/).map(
        x => x.startsWith("@") ?
            <span style={{color: name2color(x.substring(1))}}>{x}</span> :
            x
    );
}
const Chat = ({ log, show_system }: { log: Array<ChatMessage>, show_system: boolean }) => (
    <div class="chat">
        <ul class="chat_log" id="chat_log">
            {log
                .filter(p => (show_system || p.user != "system"))
                .map((p) => (
                    <li class={p.user == "system" ? "system" : "user"}>
                        <span class="absolute_timestamp">{absolute_timestamp(p.absolute_timestamp)}</span>
                        <span class="user" style={{color: name2color(p.user)}}>{p.user}</span>
                        <span class="message">{addAts(p.message)}</span>
                    </li>
                ))
            }
        </ul>
        <form class="chat_input" onsubmit={ChatAction}>
            <input id="chat_input" autocomplete={"off"} enterkeyhint={"send"} placeholder="Type to chat"></input>
        </form>
    </div>
);

/**********************************************************************
 * Header
 */
const ShowSettings = (state: State) => ({
    ...state,
    show_settings: true,
    title_edit: state.room.title,
});

export const Header = ({ state, admin }: { state: State, admin: boolean }) => (
    <header>
        <i class="fas" />
        <h1>{state.room.title}</h1>
        <i class="fas fa-cogs" onclick={ShowSettings} />
    </header>
);

/**********************************************************************
 * Layout
 */
export const RoomRender = ({ state, admin }: { state: State, admin: boolean }) => (
    <main class={{
        room: true,
        admin: admin,
        user: !admin,
        chat: state.show_chat,
        nochat: !state.show_chat,
    }}>
        <Header state={state} admin={admin} />
        <MovieList movies={state.movies} video_state={state.room.video_state} />
        <MainVideo video_state={state.room.video_state} can_play={state.can_play} />
        <Controls state={state} enabled={!!(state.room.video_state.video)} />
        <Chat log={state.room.chat} show_system={state.show_system} />
        <ViewerList viewers={state.room.viewers} admins={state.room.admins} />
        {state.show_settings && <SettingsMenu state={state} admin={admin} />}
    </main>
);
