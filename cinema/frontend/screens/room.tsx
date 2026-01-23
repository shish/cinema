import { useContext, useState } from 'react';
import { faCircleInfo, faGears, faShareFromSquare } from '@fortawesome/free-solid-svg-icons';
import { FAIcon } from '@shish2k/react-faicon';

import { RoomContext } from '../providers/room';

import { Chat } from '../components/chat';
import { InfoMenu } from '../components/info';
import { MainVideo } from '../components/main_video';
import { MovieList } from '../components/movie_list';
import { SettingsMenu } from '../components/settings';
import { ViewerList } from '../components/viewer_list';
import { SettingsContext } from '../providers/settings';
import { ServerContext } from '../providers/server';

function Header({
    setShowInfo,
    setShowSettings,
}: {
    setShowInfo: (show: boolean) => void;
    setShowSettings: (show: boolean) => void;
}) {
    const { room } = useContext(RoomContext);
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
        <header>
            <FAIcon icon={faCircleInfo} onClick={() => setShowInfo(true)} />
            <FAIcon icon={faShareFromSquare} onClick={handleTitleClick} />
            <h1>{room.video_state.video?.[0].split("/").pop() || '(no movie selected)'}</h1>
            {showCopiedNotification && (
                <div className="notification">
                    Room link copied to clipboard!
                </div>
            )}
            <FAIcon icon={faGears} onClick={() => setShowSettings(true)} />
        </header>
    );
}

export function RoomScreen() {
    const { movies } = useContext(ServerContext);
    const { room, send } = useContext(RoomContext);
    const { showChat, user, setRoom } = useContext(SettingsContext);
    const [showInfo, setShowInfo] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const isAdmin = room.admins.includes(user);

    const handleLeaveRoom = () => {
        setRoom(null);
    };

    return (
        <main className={`room ${isAdmin ? 'admin' : 'user'} ${showChat ? 'chat' : 'nochat'}`}>
            <Header setShowInfo={setShowInfo} setShowSettings={setShowSettings} />
            {isAdmin && <MovieList selectedMovieId={room.video_state.video?.[0] || null} send={send} />}
            {room.video_state.video && movies[room.video_state.video[0]] ? (
                <MainVideo
                    movie={movies[room.video_state.video[0]]}
                    playingState={room.video_state.video[1]}
                    send={send}
                />
            ) : (
                <div className="blackout" />
            )}
            <Chat log={room.chat} send={send} />
            <ViewerList viewers={room.viewers} admins={room.admins} send={send} />
            {showSettings && (
                <SettingsMenu
                    room={room}
                    admin={isAdmin}
                    send={send}
                    setShowSettings={setShowSettings}
                    onLeaveRoom={handleLeaveRoom}
                />
            )}
            {showInfo && <InfoMenu setShowInfo={setShowInfo} />}
        </main>
    );
}
