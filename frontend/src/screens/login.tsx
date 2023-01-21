import h from "hyperapp-jsx-pragma";
import * as icons from "../static/icons";

function LoginAction(state: State, event: Event): State {
    event.preventDefault();

    let user = (document.getElementById("user") as HTMLFormElement).value;
    let room = (document.getElementById("room") as HTMLFormElement).value;

    sessionStorage.setItem("user", user);

    if(!user || !room) return state;

    return {
        ...state,
        conn: {
            ...state.conn,
            user: user,
            room: room,
        },
        loading: "Connecting...",
    };
}

function UpdateUser(state: State): State {
    let user = (document.getElementById("user") as HTMLFormElement).value;
    sessionStorage.setItem("user", user);
    return {
        ...state,
        conn: {
            ...state.conn,
            user: user,
        },
    };
}

const MaybeManual = (state: State, event: Event): State => ({
    ...state,
    manual_entry: (document.getElementById("room") as HTMLInputElement).value == ""
});

const ShowHelp = (state: State): State => ({ ...state, help: true });

export const Login = ({ state }: { state: State }) => (
    <main class="login">
        <header>
            <icons.CircleXmark style={{opacity: 0}} />
            <h1>Join a Room</h1>
            <icons.CircleInfo class="x2" onclick={ShowHelp} />
        </header>
        <article>
            <form onsubmit={LoginAction}>
                <input
                    type="text"
                    id="user"
                    placeholder="Enter Your Name"
                    onchange={UpdateUser}
                    value={state.conn.user}
                />
                {Object.entries(state.rooms).length > 0 && !state.manual_entry ?
                    <select id="room" onchange={MaybeManual}>
                        {Object.entries(state.rooms).map((k) => <option value={k[0]}>{k[1]}</option>)}
                        <option value="">Enter a code</option>
                    </select> :
                    <input type="text" id="room" maxlength="4" placeholder="Enter Room Code" />
                }
                <input type="button" value="Join" onclick={LoginAction} />
            </form>
        </article>
    </main>
);
