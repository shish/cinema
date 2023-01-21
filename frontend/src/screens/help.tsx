import h from "hyperapp-jsx-pragma";
import * as icons from "../static/icons";


const HideHelp = (state: State): State => ({ ...state, help: false });

export const Help = () => (
    <main class="login">
        <header>
            <icons.CircleXmark style={{opacity: 0}} />
            <h1>About</h1>
            <icons.CircleXmark class="x2" onclick={HideHelp} />
        </header>
        <article>
            <p>
                <a href={"https://github.com/shish/cinema"}>Cinema</a>
                &nbsp;by&nbsp;
                <a href={"mailto:s@shish.io"}>Shish</a>
            </p>
            <p className={"donate"}>
                If you like this app and find it fun,
                <br />
                feel free to donate via{" "}
                <a href={"https://paypal.me/shish2k"}>PayPal</a>
            </p>
        </article>
    </main>
);
