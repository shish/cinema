import { useState } from 'react';

import { RoomProvider } from '../providers/room';
import { SettingsProvider } from '../providers/settings';

import { LoginScreen } from './login';
import { RoomScreen } from './room';

import '../static/style.scss';

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
