import h from "hyperapp-jsx-pragma";

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

export const Screen = (
    {
        settings,
        header,
        right = <i class="fas" />,
        footer = null,
        article_class = "flow",
    }: { settings: Settings; right?: any; header: string; footer?: any, article_class?: string },
    children: Array<any>,
) => (
    <main>
        <header>
            {settings.sound ? (
                <i class="fas fa-bell" onclick={ToggleSound} />
            ) : (
                <i class="fas fa-bell-slash" onclick={ToggleSound} />
            )}
            <h1
                onclick={function (state: State) {
                    console.log(state);
                    (window as any).state = state;
                    return state;
                }}
            >
                {header}
            </h1>
            {right}
        </header>
        <article class={article_class}>{children}</article>
        <footer>{footer}</footer>
    </main>
);

export const MsgScreen = (
    {
        settings,
        header,
        footer,
    }: { settings: Settings; header: string; footer?: any },
    children: Array<any>,
) => (
    <Screen settings={settings} header={header} footer={footer}>
        <div class={"inputBlock"}>
            <p>{children}</p>
        </div>
    </Screen>
);
