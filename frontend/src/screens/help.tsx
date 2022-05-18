import h from "hyperapp-jsx-pragma";
import { Header } from "./base";


const HideHelp = (state: State): State => ({...state, help: false});

export const Help = () => (
    <main class="login">
        <Header
            header={"About"}
            right={<i class="fas fa-times-circle" onclick={HideHelp} />}
        />
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
        {/* just have a footer so that flow layout works */}
        <footer />
    </main>
);
