import { useContext, useEffect, useState } from 'react';

import { InfoMenu } from '../components/info';

import { SettingsContext } from '../providers/settings';
import CircleInfo from '../static/icons/circle-info.svg?react';
import CircleXmark from '../static/icons/circle-xmark.svg?react';

export function LoginScreen({
    setConnData,
}: {
    setConnData: (connData: ConnData) => void;
}) {
    const { sess, user, setUser } = useContext(SettingsContext);
    const [showInfo, setShowInfo] = useState(false);
    const [manualEntry, setManualEntry] = useState(false);
    const [rooms, setRooms] = useState<{ [name: string]: string }>({});
    const [room, setRoom] = useState<string>('');

    // we only want to run this once, not every time `room` changes
    // biome-ignore lint/correctness/useExhaustiveDependencies:
    useEffect(() => {
        fetch('/rooms')
            .then((response) => response.json())
            .then((rooms) => {
                setRooms(rooms);
                if (!room && Object.keys(rooms).length > 0) {
                    setRoom(Object.keys(rooms)[0]);
                }
                // console.log('Rooms:', rooms);
            })
            .catch((error) => {
                console.error('Error loading logs:', error);
            });
    }, []);

    function login(event: any) {
        event.preventDefault();
        if (!user || !room) return null;
        // console.log('Logging in as', user, 'to', room);
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
                        autoComplete="off"
                        autoFocus={user.length === 0}
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
                            autoComplete="off"
                        />
                    )}
                    <button type="submit">Join</button>
                </form>
            </article>
            {showInfo && <InfoMenu setShowInfo={setShowInfo} />}
        </main>
    );
}
