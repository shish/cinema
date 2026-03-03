import { faRightFromBracket, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FAIcon } from '@shish2k/react-faicon';
import { useContext, useEffect, useState } from 'react';

import { SettingsContext } from '../../providers/settings';
import css from './SettingsDialog.module.scss';

export function SettingsDialog({ setShowSettings }: { setShowSettings: (b: boolean) => void }) {
    const { showChat, setShowChat, showSystem, setShowSystem, showSubs, setShowSubs, setRoom } =
        useContext(SettingsContext);
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
        <div id="dialog_overlay">
            <div id="dialog" className={css.settingsDialog}>
                <h2>
                    <FAIcon
                        icon={faRightFromBracket}
                        onClick={() => {
                            setRoom(null);
                            setShowSettings(false);
                        }}
                        style={{
                            height: '1em',
                            color: '#c44',
                            cursor: 'pointer',
                        }}
                    />
                    <div>Settings</div>
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
                                <td>
                                    <label htmlFor="show-chat">Show Chat</label>
                                </td>
                                <td>
                                    <input
                                        id="show-chat"
                                        checked={showChat}
                                        type={'checkbox'}
                                        onChange={(e) => setShowChat(e.target.checked)}
                                    />
                                </td>
                            </tr>
                            {document.body.requestFullscreen && (
                                <tr>
                                    <td>
                                        <label htmlFor="fullscreen">Fullscreen</label>
                                    </td>
                                    <td>
                                        <input
                                            id="fullscreen"
                                            checked={isFullscreen}
                                            type={'checkbox'}
                                            onChange={(_e) => {
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
                                <td>
                                    <label htmlFor="show-subtitles">Show Subtitles</label>
                                </td>
                                <td>
                                    <input
                                        id="show-subtitles"
                                        checked={showSubs}
                                        type={'checkbox'}
                                        onChange={(e) => setShowSubs(e.target.checked)}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <label htmlFor="show-system">
                                        Show System
                                        <br />
                                        Messages
                                    </label>
                                </td>
                                <td>
                                    <input
                                        id="show-system"
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
