import { useContext, useEffect, useState } from 'react';
import { faCircleInfo, faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import { FAIcon } from '@shish2k/react-faicon';

import { InfoMenu } from '../components/info';

import { SettingsContext } from '../providers/settings';
import { ServerContext } from '../providers/server';

export function LoginScreen() {
    const { loading, rooms } = useContext(ServerContext);
    const { user, setUser, room, setRoom } = useContext(SettingsContext);
    const [showInfo, setShowInfo] = useState(false);
    const [manualEntry, setManualEntry] = useState(false);
    const [roomInput, setRoomInput] = useState<string>('');
    const [userInput, setUserInput] = useState<string>(user);

    // Set room input from context if present
    useEffect(() => {
        if (room) {
            setRoomInput(room);
            setManualEntry(true);
        } else if (!roomInput && Object.keys(rooms).length > 0) {
            setRoomInput(Object.keys(rooms)[0]);
        }
    }, [rooms, roomInput, room]);

    function login(event: any) {
        event.preventDefault();
        if (!userInput || !roomInput) return null;
        // Save user to context and set room which will update the URL
        setUser(userInput);
        setRoom(roomInput.toUpperCase());
    }

    return (
        <main className="login">
            <header>
                <FAIcon icon={faCircleInfo} onClick={() => setShowInfo(true)} />
                <h1>Join a Room</h1>
                <FAIcon icon={faCircleXmark} style={{ opacity: 0 }} />
            </header>
            <article>
                <form onSubmit={(e) => login(e)}>
                    <input
                        type="text"
                        id="user"
                        placeholder="Enter Your Name"
                        onChange={(e) => setUserInput(e.target.value)}
                        value={userInput}
                        autoComplete="off"
                        autoFocus={userInput.length === 0}
                        required={true}
                    />
                    {room ? (
                        <input
                            type="text"
                            id="room"
                            value={room}
                            disabled={true}
                        />
                    ) : Object.entries(rooms).length > 0 && !manualEntry ? (
                        <select
                            id="room"
                            onChange={(e) => (e.target.value === '' ? setManualEntry(true) : setRoomInput(e.target.value))}
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
                            onChange={(e) => setRoomInput(e.target.value)}
                            placeholder="Enter Room Code"
                            autoComplete="off"
                            required={true}
                        />
                    )}
                    <button type="submit" disabled={loading}>
                        {loading ? 'Loading...' : 'Join'}
                    </button>
                </form>
            </article>
            {showInfo && <InfoMenu setShowInfo={setShowInfo} />}
        </main>
    );
}
