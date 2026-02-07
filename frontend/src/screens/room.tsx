import { faCircleInfo, faFilm, faGears, faShareFromSquare } from '@fortawesome/free-solid-svg-icons';
import { FAIcon } from '@shish2k/react-faicon';
import { useContext, useState } from 'react';
import { Chat, type Commands } from '../components/chat';
import { InfoMenu } from '../components/info';
import { MainVideo } from '../components/main_video';
import { MovieSelectDialog } from '../components/movie_select_dialog';
import { SettingsMenu } from '../components/settings';
import { ViewerList } from '../components/viewer_list';
import { RoomContext } from '../providers/room';
import { ServerContext } from '../providers/server';
import { SettingsContext } from '../providers/settings';

function Header({ isAdmin }: { isAdmin: boolean }) {
    const { room, send } = useContext(RoomContext);
    const { movies } = useContext(ServerContext);
    const [showInfo, setShowInfo] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [showMovieSelect, setShowMovieSelect] = useState<boolean>(false);
    const [showCopiedNotification, setShowCopiedNotification] = useState<boolean>(false);

    const handleTitleClick = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setShowCopiedNotification(true);
            setTimeout(() => setShowCopiedNotification(false), 2000);
        } catch (err) {
            console.error('Failed to copy URL:', err);
        }
    };

    return (
        <>
            <header>
                <FAIcon icon={faCircleInfo} onClick={() => setShowInfo(true)} />
                {isAdmin && <FAIcon icon={faShareFromSquare} onClick={handleTitleClick} />}
                <h1>{room.video_state.video?.[0].split('/').pop() || '(no movie selected)'}</h1>
                {isAdmin && <FAIcon icon={faFilm} onClick={() => setShowMovieSelect(true)} />}
                <FAIcon icon={faGears} onClick={() => setShowSettings(true)} />
            </header>
            {showCopiedNotification && <div className="notification">Room link copied to clipboard!</div>}
            {showSettings && <SettingsMenu setShowSettings={setShowSettings} />}
            {showInfo && <InfoMenu setShowInfo={setShowInfo} />}
            {showMovieSelect && (
                <MovieSelectDialog
                    selectedMovieId={room.video_state.video?.[0] || null}
                    movies={movies}
                    setMovie={(movieId) => {
                        if (movieId) {
                            send({ pause: [movieId, 0] });
                        } else {
                            send({ stop: null });
                        }
                    }}
                    setShowMovieSelect={setShowMovieSelect}
                />
            )}
        </>
    );
}

export function RoomScreen() {
    const { movies, now } = useContext(ServerContext);
    const { room, send } = useContext(RoomContext);
    const { showChat, user } = useContext(SettingsContext);
    const isAdmin = room.admins.includes(user);
    const { showSystem } = useContext(SettingsContext);

    const chatLog = showSystem ? room.chat : room.chat.filter((msg) => msg.type !== 'system');

    // Chat commands
    const commands: Commands = {
        '': {
            description: 'Send a chat message',
            handler: (text) => {
                send({ chat: text });
            },
        },
        '/me': {
            description: 'Send an action message',
            handler: (text) => {
                send({ act: text });
            },
        },
        '/op': {
            description: 'Make a user an admin',
            handler: (text) => {
                const username = text.trim().replace(/^@/, '');
                if (username) {
                    send({ admin: username });
                }
            },
        },
        '/deop': {
            description: 'Remove admin privs from a user',
            handler: (text) => {
                const username = text.trim().replace(/^@/, '');
                if (username) {
                    send({ unadmin: username });
                }
            },
        },
        '/pause': {
            description: 'Pause the video',
            handler: () => {
                if (room.video_state.video) {
                    const [movieId, playingState] = room.video_state.video;
                    const currentTime = playingState.paused ?? now - (playingState.playing || 0);
                    send({ pause: [movieId, currentTime] });
                }
            },
        },
        '/play': {
            description: 'Play the video',
            handler: () => {
                if (room.video_state.video) {
                    const [movieId, playingState] = room.video_state.video;
                    const currentTime = playingState.paused ?? now - (playingState.playing || 0);
                    send({ play: [movieId, now - currentTime] });
                }
            },
        },
    };

    return (
        <main className={`room ${isAdmin ? 'admin' : 'user'} ${showChat ? 'chat' : 'nochat'}`}>
            <Header isAdmin={isAdmin} />
            {room.video_state.video && movies[room.video_state.video[0]] ? (
                <MainVideo
                    // Change key to force remount when changing movies
                    // so that no metadata from the previous video lingers
                    key={room.video_state.video[0]}
                    movie={movies[room.video_state.video[0]]}
                    playingState={room.video_state.video[1]}
                    send={send}
                />
            ) : (
                <div id="blackout" />
            )}
            <Chat log={chatLog} users={[...new Set(room.viewers.map((v) => v.name))]} commands={commands} />
            <ViewerList viewers={room.viewers} admins={room.admins} send={send} />
        </main>
    );
}
