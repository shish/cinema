import { faCircleInfo, faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import { FAIcon } from '@shish2k/react-faicon';
import { useContext, useEffect, useState } from 'react';

import { InfoMenu } from '../components/info';
import { SettingsContext } from '../providers/settings';

export function LoginScreen() {
    const { user, setUser, room, setRoom } = useContext(SettingsContext);
    const [showInfo, setShowInfo] = useState(false);
    const [roomInput, setRoomInput] = useState<string>('');
    const [userInput, setUserInput] = useState<string>(user);

    // Set room input from context if present
    useEffect(() => {
        if (room) {
            setRoomInput(room);
        }
    }, [room]);

    function login(event: any) {
        event.preventDefault();
        if (!userInput.trim() || !roomInput) return null;
        // Save user to context and set room which will update the URL
        setUser(userInput.trim());
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
                        maxLength={16}
                        placeholder="Enter Your Name"
                        onChange={(e) => setUserInput(e.target.value)}
                        value={userInput}
                        autoComplete="off"
                        autoFocus={userInput.length === 0}
                        required={true}
                    />
                    <input
                        type="text"
                        id="room"
                        maxLength={4}
                        onChange={(e) => setRoomInput(e.target.value)}
                        value={roomInput}
                        placeholder="Enter Room Code"
                        autoComplete="off"
                        disabled={room !== null}
                        pattern="[A-Za-z0-9]{4}"
                        required={true}
                    />
                    <button type="submit">Join</button>
                </form>
            </article>
            {showInfo && <InfoMenu setShowInfo={setShowInfo} />}
        </main>
    );
}
