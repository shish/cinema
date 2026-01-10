import { useContext, useEffect, useState } from 'react';
import { faCircleInfo, faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import { FAIcon } from '@shish2k/react-faicon';

import { InfoMenu } from '../components/info';

import { SettingsContext } from '../providers/settings';
import { ServerContext } from '../providers/server';

export function LoginScreen({ setConnData }: { setConnData: (connData: ConnData) => void }) {
    const { loading, rooms } = useContext(ServerContext);
    const { sess, user, setUser } = useContext(SettingsContext);
    const [showInfo, setShowInfo] = useState(false);
    const [manualEntry, setManualEntry] = useState(false);
    const [room, setRoom] = useState<string>('');

    useEffect(() => {
        if (!room && Object.keys(rooms).length > 0) {
            setRoom(Object.keys(rooms)[0]);
        }
    }, [rooms, room]);

    function login(event: any) {
        event.preventDefault();
        if (!user || !room) return null;
        // console.log('Logging in as', user, 'to', room);
        setConnData({ sess, room, user });
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
                        onChange={(e) => setUser(e.target.value)}
                        defaultValue={user}
                        autoComplete="off"
                        autoFocus={user.length === 0}
                        required={true}
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
