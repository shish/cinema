import h from "hyperapp-jsx-pragma";
import { Screen } from "./base";

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

const About = () => (
    <div>
        <h2>
            <a href={"https://github.com/shish/theatre"}>Theatre</a>
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
    </div>
);

export const Login = ({ state }: { state: State }) => (
    <Screen
        settings={state.settings}
        header={"Join a Room"}
        footer={<About />}
    >
        <input
            type="text"
            id="user"
            placeholder="Enter Your Name"
            value={state.conn.user}
        />
        <input type="text" id="room" placeholder="Enter Room Code" value={state.conn.room} />
        <input type="button" value="Join" onclick={LoginAction} />
    </Screen>
);
