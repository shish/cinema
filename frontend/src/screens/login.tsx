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

const Footer = () => (
    <footer>
        <h2>
            <a href={"https://github.com/shish/cinema"}>Cinema</a>
            &nbsp;by&nbsp;
            <a href={"mailto:s@shish.io"}>Shish</a>
        </h2>
        {/*
        <p className={"donate"}>
            If you like this app and find it fun,
            <br />
            feel free to donate via{" "}
            <a href={"https://paypal.me/shish2k"}>PayPal</a>
        </p>
        */}
    </footer>
);

const MaybeManual = (state: State, event: Event): State => ({
    ...state,
    manual_entry: (document.getElementById("room") as HTMLInputElement).value == ""
});

export const Login = ({ state }: { state: State }) => (
    <main class="login">
        <Header header={"Join a Room"} />
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
        <Footer />
    </main>
);
