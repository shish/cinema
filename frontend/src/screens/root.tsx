import h from "hyperapp-jsx-pragma";

import { Help } from "./help";
import { Login } from "./login";
import { RoomRender } from "./room";

export const Root = ({state}: {state: State}) => {
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
};
