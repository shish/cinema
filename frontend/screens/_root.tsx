import { useState } from 'react';

import { RoomProvider } from '../providers/room';
import { SettingsProvider } from '../providers/settings';

import { LoginScreen } from './login';
import { RoomScreen } from './room';

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
                    <RoomScreen connData={connData} />
                </RoomProvider>
            ) : (
                <LoginScreen setConnData={setConnData} />
            )}
        </SettingsProvider>
    );
}
