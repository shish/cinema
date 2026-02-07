import type { Viewer } from '../types';
import { Username } from './username';
import css from './viewer_list.module.scss';

export function ViewerList({ viewers, admins, send }: { viewers: Viewer[]; admins: string[]; send: (s: any) => void }) {
    const unique_viewers = Array.from(new Set(viewers.map((p) => p.name)));

    function toggle(name: string) {
        if (admins.includes(name)) {
            send({ unadmin: name });
        } else {
            send({ admin: name });
        }
    }
    return (
        <ul className={css.viewers} id="viewer_list">
            {unique_viewers.map((name) => (
                <li
                    key={name}
                    className={admins.includes(name) ? css.admin : ''}
                    onClick={() => toggle(name)}
                    onKeyDown={() => toggle(name)}
                >
                    <Username name={name} currentUsers={unique_viewers} />
                </li>
            ))}
        </ul>
    );
}
