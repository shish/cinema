import { useSessionStorage } from '@uidotdev/usehooks';
import { useEffect, useState } from 'react';

import { InfoMenu } from '../components/info';

import CircleInfo from '../static/icons/circle-info.svg?react';
import CircleXmark from '../static/icons/circle-xmark.svg?react';

export function Login({
    setConnData,
}: {
    setConnData: (connData: ConnData) => void;
}) {
    const [showInfo, setShowInfo] = useState(false);
    const [manualEntry, setManualEntry] = useState(false);
    const [rooms, setRooms] = useState<{ [name: string]: string }>({});
    const [sess, setSess] = useSessionStorage<string>('sess2', '');
    const [user, setUser] = useSessionStorage<string>('user2', '');
    const [room, setRoom] = useState<string>('');

    useEffect(() => {
        if (!sess) {
            // call setSess to ensure it gets saved, rather than setting
            // the default to random which would be regenerated each refresh
            setSess((Math.random() + 1).toString(36).substring(2));
        }
    }, [sess, setSess]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: we only want to run this once
    useEffect(() => {
        fetch('/rooms')
            .then((response) => response.json())
            .then((rooms) => {
                setRooms(rooms);
                if (!room && Object.keys(rooms).length > 0) {
                    setRoom(Object.keys(rooms)[0]);
                }
                console.log('Rooms:', rooms);
            })
            .catch((error) => {
                console.error('Error loading logs:', error);
            });
    }, []);

    function login(event: any) {
        event.preventDefault();
        if (!user || !room) return null;
        console.log('Logging in as', user, 'to', room);
        setConnData({ sess, room, user });
    }

    return (
        <main className="login">
            <header>
                <CircleInfo onClick={() => setShowInfo(true)} />
                <h1>Join a Room</h1>
                <CircleXmark style={{ opacity: 0 }} />
            </header>
            <article>
                <form onSubmit={(e) => login(e)}>
                    <input
                        type="text"
                        id="user"
                        placeholder="Enter Your Name"
                        onChange={(e) => setUser(e.target.value)}
                        defaultValue={user}
                    />
                    {Object.entries(rooms).length > 0 && !manualEntry ? (
                        <select
                            id="room"
                            onChange={(e) => (e.target.value === '' ? setManualEntry(true) : setRoom(e.target.value))}
                        >
                            {Object.entries(rooms).map((k) => (
                                <option key={k[0]} value={k[0]}>
                                    {k[1]}
                                </option>
                            ))}
                            <option key={''} value="">
                                Enter a code
                            </option>
                        </select>
                    ) : (
                        <input
                            type="text"
                            id="room"
                            maxLength={4}
                            onChange={(e) => setRoom(e.target.value)}
                            placeholder="Enter Room Code"
                        />
                    )}
                    <button type="submit">Join</button>
                </form>
            </article>
            {showInfo && <InfoMenu setShowInfo={setShowInfo} />}
        </main>
    );
}
