import { useState } from 'react';

import { RoomProvider } from '../providers/room';
import { SettingsProvider } from '../providers/settings';

import { LoginScreen } from './login';
import { RoomScreen } from './room';

import '../static/style.scss';
import { ServerProvider } from '../providers/server';

export function Root() {
    const [connData, setConnData] = useState<ConnData | null>(null);

    return (
        <SettingsProvider>
            <ServerProvider>
                {connData ? (
                    <RoomProvider connData={connData}>
                        <RoomScreen connData={connData} />
                    </RoomProvider>
                ) : (
                    <LoginScreen setConnData={setConnData} />
                )}
            </ServerProvider>
        </SettingsProvider>
    );
}
