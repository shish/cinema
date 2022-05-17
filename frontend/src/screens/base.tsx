import h from "hyperapp-jsx-pragma";


export const Header = (
    {
        header,
        left = <i class="fas" />,
        right = <i class="fas" />,
    }: { header: string; left?: any; right?: any; },
    children: Array<any>,
) => (
    <header>
        {left}
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
);
