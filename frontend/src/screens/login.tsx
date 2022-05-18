import h from "hyperapp-jsx-pragma";
import { Header } from "./base";

function LoginAction(state: State): State {
    let user = (document.getElementById("user") as HTMLFormElement).value;
    let room = (document.getElementById("room") as HTMLFormElement).value;

    sessionStorage.setItem("user", user);

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

const MaybeManual = (state: State, event: Event): State => ({
    ...state,
    manual_entry: (document.getElementById("room") as HTMLInputElement).value == ""
});

const ShowHelp = (state: State): State => ({...state, help: true});

export const Login = ({ state }: { state: State }) => (
    <main class="login">
        <Header
            header={"Join a Room"}
            right={<i class="fas fa-info-circle" onclick={ShowHelp} />}
        />
        <article>
            <input
                type="text"
                id="user"
                placeholder="Enter Your Name"
                value={state.conn.user}
            />
            {Object.entries(state.rooms).length > 0 && !state.manual_entry ?
                <select id="room" onchange={MaybeManual}>
                    {Object.entries(state.rooms).map((k) => <option value={k[0]}>{k[1]}</option>)}
                    <option value="">Enter a code</option>
                </select> :
                <input type="text" id="room" placeholder="Enter Room Code" />
            }
            <input type="button" value="Join" onclick={LoginAction} />
        </article>
        {/* just have a footer so that flow layout works */}
        <footer />
    </main>
);
