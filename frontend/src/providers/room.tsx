import * as jsonpatch from 'jsonpatch';
import { createContext, useContext, useRef, useState } from 'react';
import useWebSocket from 'react-use-websocket';
import type { RoomData } from '../types';
import { SettingsContext } from './settings';

export type RoomContextType = {
    room: RoomData;
    send: (data: any) => void;
};

export const RoomContext = createContext<RoomContextType>({} as RoomContextType);

export function getSocketName(room: string, user: string, sess: string): string {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const params = new URLSearchParams({
        room,
        user,
        sess,
    });
    return `${proto}//${window.location.host}/api/room?${params.toString()}`;
}

export function RoomProvider({
    user,
    sess,
    roomCode,
    children,
}: {
    user: string;
    sess: string;
    roomCode: string;
    children: React.ReactNode;
}) {
    const [room, setRoom] = useState<RoomData | null>(null);
    const lastRespRef = useRef<any>(null);

    const { sendJsonMessage, readyState } = useWebSocket(getSocketName(roomCode, user, sess), {
        onOpen: () => {
            lastRespRef.current = null;
        },
        onMessage: (msg) => {
            let resp = JSON.parse(msg.data);
            if (lastRespRef.current) {
                resp = jsonpatch.apply_patch(lastRespRef.current, resp);
            }
            lastRespRef.current = resp;
            // console.log('Room:', resp);
            setRoom(resp);
        },
        shouldReconnect: () => true,
        retryOnError: true,
    });

    if (room === null) {
        return (
            <main className="login">
                <header>
                    <h1>Loading...</h1>
                </header>
                <article>Loading...</article>
            </main>
        );
    }

    function send(data: any) {
        if (readyState !== WebSocket.OPEN) {
            alert('Failed to send command: not connected to server');
            return;
        }
        sendJsonMessage(data);
    }

    return <RoomContext.Provider value={{ room, send }}>{children}</RoomContext.Provider>;
}
