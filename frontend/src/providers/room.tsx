import { useServerTime } from '@shish2k/react-use-servertime';
import * as jsonpatch from 'jsonpatch';
import { createContext, useEffect, useState } from 'react';

export type RoomContextType = {
    conn: WebSocket;
    room: RoomData;
    send: (data: any) => void;
    now: number;
};

export const RoomContext = createContext<RoomContextType>({} as RoomContextType);

export function getSocketName(connData: ConnData, errors: number): string {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const params = new URLSearchParams({
        room: connData.room,
        user: connData.user,
        sess: connData.sess,
        errors: errors.toString(),
    });
    return `${proto}//${window.location.host}/room?${params.toString()}`;
}

export function RoomProvider({ connData, children }: { connData: ConnData; children: React.ReactNode }) {
    const [conn, setConn] = useState<WebSocket | null>(null);
    const [room, setRoom] = useState<RoomData | null>(null);
    const [errors, setErrors] = useState(0);
    const socketName = getSocketName(connData, errors);
    const { now } = useServerTime({ url: '/time' });

    // console.log('Socket name:', socketName);
    useEffect(() => {
        const conn = new WebSocket(socketName);
        let lastResp: any = null;
        conn.onopen = () => {
            setConn(conn);
        };
        conn.onerror = (err) => {
            console.error('WebSocket error:', err);
            setErrors(errors + 1);
            setRoom(null);
            setConn(null);
        };
        conn.onclose = () => {
            console.log('WebSocket closed');
            // "closed" indicates intentional closing, but we never intentionally close,
            // so let's treat "something in the middle of the stack closed the connection"
            // as an error
            setErrors(errors + 1);
            setConn(null);
            setRoom(null);
        };
        conn.onmessage = (msg) => {
            let resp = JSON.parse(msg.data);
            if (lastResp) {
                resp = jsonpatch.apply_patch(lastResp, resp);
            }
            lastResp = resp;
            // console.log('Room:', resp);
            setRoom(resp);
        };
    }, [socketName, errors]);

    // FIXME: allow the user to keep watching while the connection
    // is down, but disable sending messages
    if (conn === null) {
        return (
            <main className="login">
                <header>
                    <h1>Connecting...</h1>
                </header>
                <article>Connecting...</article>
            </main>
        );
    }
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
        if (conn === null) {
            console.error('No connection to send data to');
            return;
        }
        conn.send(JSON.stringify(data));
    }

    return <RoomContext.Provider value={{ room, conn, send, now }}>{children}</RoomContext.Provider>;
}
