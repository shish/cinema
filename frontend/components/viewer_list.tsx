export function ViewerList({
    viewers,
    admins,
    send,
}: {
    viewers: Viewer[];
    admins: string[];
    send: (s: any) => void;
}) {
    const unique_viewers = Array.from(new Set(viewers.map((p) => p.name)));

    function toggle(name: string) {
        if (admins.includes(name)) {
            send({ unadmin: name });
        } else {
            send({ admin: name });
        }
    }
    return (
        <ul className="viewers">
            {unique_viewers.map((name) => (
                <li
                    key={name}
                    className={admins.includes(name) ? 'admin' : ''}
                    onClick={() => toggle(name)}
                    onKeyDown={() => toggle(name)}
                >
                    {name}
                </li>
            ))}
        </ul>
    );
}
