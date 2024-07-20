import { useState } from 'react';

import { RoomProvider } from '../providers/room';
import { SettingsProvider } from '../providers/settings';

import { Login } from './login';
import { Room } from './room';

import '../static/style.scss';

/*
FIXME: handle viewport resizing when mobile keyboard is shown and hidden

function viewportHandler() {
    const main = document.getElementsByTagName("MAIN")[0] as HTMLElement;
    if (main && window.visualViewport) {
        main.style.top = window.visualViewport.offsetTop + "px";
        main.style.height = window.visualViewport.height + "px";
    }
}
window.visualViewport?.addEventListener("resize", viewportHandler);
*/

export function Root() {
    const [connData, setConnData] = useState<ConnData | null>(null);

    return (
        <SettingsProvider>
            {connData ? (
                <RoomProvider connData={connData}>
                    <Room connData={connData} />
                </RoomProvider>
            ) : (
                <Login setConnData={setConnData} />
            )}
        </SettingsProvider>
    );
}
