import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SettingsContext, type SettingsContextType } from '../../providers/settings';
import { SettingsDialog } from './SettingsDialog';

// Wrapper component that provides the SettingsContext
function SettingsDialogWrapper({
    initialShowChat = true,
    initialShowSystem = true,
    initialShowSubs = false,
}: {
    initialShowChat?: boolean;
    initialShowSystem?: boolean;
    initialShowSubs?: boolean;
}) {
    const [showSettings, setShowSettings] = useState(true);
    const [showChat, setShowChat] = useState(initialShowChat);
    const [showSystem, setShowSystem] = useState(initialShowSystem);
    const [showSubs, setShowSubs] = useState(initialShowSubs);
    const [room, setRoom] = useState<string | null>('test-room');

    const contextValue: SettingsContextType = {
        sess: 'test-session',
        setSess: () => {},
        user: 'TestUser',
        setUser: () => {},
        room,
        setRoom: (newRoom) => {
            console.log('Leave room:', room, '→', newRoom);
            setRoom(newRoom);
        },
        showChat,
        setShowChat: (value) => {
            console.log('Show chat:', value);
            setShowChat(value);
        },
        showSystem,
        setShowSystem: (value) => {
            console.log('Show system messages:', value);
            setShowSystem(value);
        },
        showSubs,
        setShowSubs: (value) => {
            console.log('Show subtitles:', value);
            setShowSubs(value);
        },
    };

    if (!showSettings) {
        return (
            <div style={{ padding: '2rem' }}>
                <h2>Dialog closed</h2>
                <p>Settings:</p>
                <ul>
                    <li>Show Chat: {showChat ? 'Yes' : 'No'}</li>
                    <li>Show System Messages: {showSystem ? 'Yes' : 'No'}</li>
                    <li>Show Subtitles: {showSubs ? 'Yes' : 'No'}</li>
                    <li>Room: {room || 'Left room'}</li>
                </ul>
            </div>
        );
    }

    return (
        <div style={{minHeight: '200px'}}>
        <SettingsContext.Provider value={contextValue}>
            <SettingsDialog setShowSettings={setShowSettings} />
            </SettingsContext.Provider>
        </div>
    );
}

const meta: Meta<typeof SettingsDialogWrapper> = {
    title: 'Components/Dialogs/SettingsDialog',
    component: SettingsDialogWrapper,
    parameters: {
        layout: 'fullscreen',
    },
};

export default meta;
type Story = StoryObj<typeof SettingsDialogWrapper>;

export const Default: Story = {
    args: {
        initialShowChat: true,
        initialShowSystem: true,
        initialShowSubs: false,
    },
    parameters: {
        docs: {
            description: {
                story: 'Default settings dialog with typical initial state. Try toggling the checkboxes to see console logs.',
            },
        },
    },
};
