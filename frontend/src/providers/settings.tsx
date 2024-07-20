import { createContext, useState } from 'react';

export type SettingsContextType = {
    showChat: boolean;
    setShowChat: (show: boolean) => void;
    showSystem: boolean;
    setShowSystem: (show: boolean) => void;
    showSubs: boolean;
    setShowSubs: (show: boolean) => void;
};

export const SettingsContext = createContext<SettingsContextType>({} as SettingsContextType);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [showChat, setShowChat] = useState(true);
    const [showSystem, setShowSystem] = useState(false);
    const [showSubs, setShowSubs] = useState(true);

    return (
        <SettingsContext.Provider
            value={{
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
