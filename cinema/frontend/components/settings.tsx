import { useContext, useEffect, useState } from 'react';
import { faXmark, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { FAIcon } from '@shish2k/react-faicon';

import { SettingsContext } from '../providers/settings';

export function SettingsMenu({
    room,
    admin,
    send,
    setShowSettings,
    onLeaveRoom,
}: {
    room: RoomData;
    admin: boolean;
    send: (s: any) => void;
    setShowSettings: (b: boolean) => void;
    onLeaveRoom: () => void;
}) {
    const { showChat, setShowChat, showSystem, setShowSystem, showSubs, setShowSubs } = useContext(SettingsContext);
    const [isFullscreen, setIsFullscreen] = useState(document.fullscreenElement !== null);

    useEffect(() => {
        function handleChange() {
            setIsFullscreen(document.fullscreenElement !== null);
        }
        document.addEventListener('fullscreenchange', handleChange, false);
        return () => {
            document.removeEventListener('fullscreenchange', handleChange);
        };
    }, []);

    return (
        <div className={'settings'}>
            <div>
                <h2>
                    <FAIcon
                        icon={faRightFromBracket}
                        onClick={() => {
                            onLeaveRoom();
                            setShowSettings(false);
                        }}
                        style={{
                            height: '1em',
                            color: '#c44',
                            cursor: 'pointer',
                        }}
                    />
                    <div style={{ padding: '0 1em' }}>Settings</div>
                    <FAIcon
                        icon={faXmark}
                        onClick={() => setShowSettings(false)}
                        style={{
                            cursor: 'pointer',
                            height: '1em',
                        }}
                    />
                </h2>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        setShowSettings(false);
                    }}
                >
                    <table>
                        <tbody>
                            <tr>
                                <td>Show Chat</td>
                                <td>
                                    <input
                                        checked={showChat}
                                        type={'checkbox'}
                                        onChange={(e) => setShowChat(e.target.checked)}
                                    />
                                </td>
                            </tr>
                            {document.body.requestFullscreen && (
                                <tr>
                                    <td>Fullscreen</td>
                                    <td>
                                        <input
                                            checked={isFullscreen}
                                            type={'checkbox'}
                                            onChange={(e) => {
                                                if (isFullscreen) {
                                                    document.exitFullscreen();
                                                } else {
                                                    document.body.requestFullscreen();
                                                }
                                            }}
                                        />
                                    </td>
                                </tr>
                            )}
                            <tr>
                                <td>Show Subtitles</td>
                                <td>
                                    <input
                                        checked={showSubs}
                                        type={'checkbox'}
                                        onChange={(e) => setShowSubs(e.target.checked)}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    Show System
                                    <br />
                                    Messages
                                </td>
                                <td>
                                    <input
                                        checked={showSystem}
                                        type={'checkbox'}
                                        onChange={(e) => setShowSystem(e.target.checked)}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </form>
            </div>
        </div>
    );
}
