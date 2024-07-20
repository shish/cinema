import { useContext, useEffect, useState } from 'react';

import { SettingsContext } from '../providers/settings';

export function SettingsMenu({
    room,
    admin,
    send,
    setShowSettings,
}: {
    room: RoomData;
    admin: boolean;
    send: (s: any) => void;
    setShowSettings: (b: boolean) => void;
}) {
    const { showChat, setShowChat, showSystem, setShowSystem, showSubs, setShowSubs } = useContext(SettingsContext);
    const [title, setTitle] = useState(room.title);
    const [isPublic, setIsPublic] = useState(room.public);
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
                <h2>Settings</h2>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (admin) {
                            send({ title: title.trim() });
                            send({ public: isPublic });
                        }
                        setShowSettings(false);
                    }}
                >
                    <table>
                        {admin && (
                            <tbody>
                                <tr>
                                    <th colSpan={2}>Room</th>
                                </tr>
                                <tr>
                                    <td>Code</td>
                                    <td>
                                        <input value={room.name} disabled={true} type={'text'} />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Title</td>
                                    <td>
                                        <input
                                            value={title}
                                            type={'text'}
                                            onChange={(e) => setTitle(e.target.value)}
                                            disabled={!admin}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Public</td>
                                    <td>
                                        <input
                                            checked={isPublic}
                                            type={'checkbox'}
                                            onChange={(e) => setIsPublic(e.target.checked)}
                                            disabled={!admin}
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        )}
                        <tbody>
                            {admin && (
                                <tr>
                                    <th colSpan={2}>Viewer</th>
                                </tr>
                            )}
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
                            <tr>
                                <td colSpan={2}>
                                    <button type="submit">Close</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </form>
            </div>
        </div>
    );
}
