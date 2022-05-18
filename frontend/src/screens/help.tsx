import h from "hyperapp-jsx-pragma";


const HideHelp = (state: State): State => ({ ...state, help: false });

export const Help = () => (
    <main class="login">
        <header>
            <i class="fas" />
            <h1>About</h1>
            <i class="fas fa-times-circle" onclick={HideHelp} />
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
        {/* just have a footer so that flow layout works */}
        <footer />
    </main>
);
