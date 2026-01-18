import { createContext, useEffect, useState } from 'react';
import { useLocalStorage, useSessionStorage } from 'usehooks-ts';

export type SettingsContextType = {
    sess: string;
    setSess: (sess: string) => void;
    user: string;
    setUser: (user: string) => void;
    room: string | null;
    setRoom: (room: string | null) => void;
    showChat: boolean;
    setShowChat: (show: boolean) => void;
    showSystem: boolean;
    setShowSystem: (show: boolean) => void;
    showSubs: boolean;
    setShowSubs: (show: boolean) => void;
};

export const SettingsContext = createContext<SettingsContextType>({} as SettingsContextType);

function getRoomFromUrl(): string | null {
    const path = window.location.pathname;
    const match = path.match(/^\/r\/([a-zA-Z0-9]{4})$/i);
    return match ? match[1].toUpperCase() : null;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [sess, setSess] = useLocalStorage<string>('sess', '');
    const [user, setUser] = useLocalStorage<string>('user', '');
    const [room, _setRoom] = useState<string | null>(getRoomFromUrl());
    const [showChat, setShowChat] = useSessionStorage<boolean>('showChat', true);
    const [showSystem, setShowSystem] = useSessionStorage<boolean>('showSystem', false);
    const [showSubs, setShowSubs] = useSessionStorage<boolean>('showSubs', true);

    useEffect(() => {
        if (!sess) {
            // call setSess to ensure it gets saved, rather than setting
            // the default to random which would be regenerated each refresh
            setSess((Math.random() + 1).toString(36).substring(2));
        }
    }, [sess, setSess]);

    // Sync room state with URL
    useEffect(() => {
        const handlePopState = () => {
            _setRoom(getRoomFromUrl());
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const setRoom = (newRoom: string | null) => {
        _setRoom(newRoom);
        if (newRoom) {
            window.history.pushState({}, '', `/r/${newRoom}`);
        } else {
            window.history.pushState({}, '', '/');
        }
        // Trigger popstate so other components can react
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    return (
        <SettingsContext.Provider
            value={{
                sess,
                setSess,
                user,
                setUser,
                room,
                setRoom,
                showChat,
                setShowChat,
                showSystem,
                setShowSystem,
                showSubs,
                setShowSubs,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}
