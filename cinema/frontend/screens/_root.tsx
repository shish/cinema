import { useContext } from 'react';

import { RoomProvider } from '../providers/room';
import { SettingsContext, SettingsProvider } from '../providers/settings';

import { LoginScreen } from './login';
import { RoomScreen } from './room';

import '../static/style.scss';
import { ServerProvider } from '../providers/server';

export function Root() {
    return (
        <SettingsProvider>
            <ServerProvider>
                <RootInner />
            </ServerProvider>
        </SettingsProvider>
    );
}

function RootInner() {
    const { user, room } = useContext(SettingsContext);

    // Show room if we have both a user and a room code
    const shouldShowRoom = room && user;

    return shouldShowRoom ? (
        <RoomProvider>
            <RoomScreen />
        </RoomProvider>
    ) : (
        <LoginScreen />
    );
}