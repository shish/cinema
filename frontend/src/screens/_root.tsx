import { useContext } from 'react';

import { RoomProvider } from '../providers/room';
import { SettingsContext, SettingsProvider } from '../providers/settings';

import { LoginScreen } from './login';
import { RoomScreen } from './room';

import '../static/style.scss';
import { ServerContext, ServerProvider } from '../providers/server';

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
    const { user, room, sess } = useContext(SettingsContext);
    const { loading } = useContext(ServerContext);

    // Show room if we have both a user and a room code
    const shouldShowRoom = room && user && !loading;

    return shouldShowRoom ? (
        <RoomProvider user={user} sess={sess} roomCode={room}>
            <RoomScreen />
        </RoomProvider>
    ) : (
        <LoginScreen />
    );
}
