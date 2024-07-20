import { useSessionStorage } from '@uidotdev/usehooks';
import { createContext, useEffect, useState } from 'react';

export type SettingsContextType = {
    sess: string;
    setSess: (sess: string) => void;
    user: string;
    setUser: (user: string) => void;
    showChat: boolean;
    setShowChat: (show: boolean) => void;
    showSystem: boolean;
    setShowSystem: (show: boolean) => void;
    showSubs: boolean;
    setShowSubs: (show: boolean) => void;
};

export const SettingsContext = createContext<SettingsContextType>({} as SettingsContextType);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [sess, setSess] = useSessionStorage<string>('sess2', '');
    const [user, setUser] = useSessionStorage<string>('user2', '');
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

    return (
        <SettingsContext.Provider
            value={{
                sess,
                setSess,
                user,
                setUser,
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
