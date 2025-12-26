import { useContext, useState } from 'react';
import { faCircleInfo, faGears } from '@fortawesome/free-solid-svg-icons';
import { FAIcon } from '@shish2k/react-faicon';

import { RoomContext } from '../providers/room';

import { Chat } from '../components/chat';
import { InfoMenu } from '../components/info';
import { MainVideo } from '../components/main_video';
import { MovieList } from '../components/movie_list';
import { SettingsMenu } from '../components/settings';
import { ViewerList } from '../components/viewer_list';
import { SettingsContext } from '../providers/settings';

function Header({
    setShowInfo,
    setShowSettings,
}: {
    setShowInfo: (show: boolean) => void;
    setShowSettings: (show: boolean) => void;
}) {
    const { room } = useContext(RoomContext);

    return (
        <header>
            <FAIcon icon={faCircleInfo} onClick={() => setShowInfo(true)} />
            <h1>{room.title}</h1>
            <FAIcon icon={faGears} onClick={() => setShowSettings(true)} />
        </header>
    );
}

export function RoomScreen({ connData }: { connData: ConnData }) {
    const { room, send } = useContext(RoomContext);
    const { showChat } = useContext(SettingsContext);
    const [showInfo, setShowInfo] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const isAdmin = room.admins.includes(connData.user);

    return (
        <main className={`room ${isAdmin ? 'admin' : 'user'} ${showChat ? 'chat' : 'nochat'}`}>
            <Header setShowInfo={setShowInfo} setShowSettings={setShowSettings} />
            {isAdmin && <MovieList movieFile={room.video_state.video?.[0] || null} send={send} />}
            {room.video_state.video ? (
                <MainVideo movieFile={room.video_state.video[0]} playingState={room.video_state.video[1]} send={send} />
            ) : (
                <div className="blackout" />
            )}
            <Chat log={room.chat} send={send} />
            <ViewerList viewers={room.viewers} admins={room.admins} send={send} />
            {showSettings && <SettingsMenu room={room} admin={isAdmin} send={send} setShowSettings={setShowSettings} />}
            {showInfo && <InfoMenu setShowInfo={setShowInfo} />}
        </main>
    );
}
