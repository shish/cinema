import { useServerTime } from '@shish2k/react-use-servertime';
import { createContext, useEffect, useState } from 'react';
import type { Movie } from '../types';
import { MqttProvider, useSubscription } from "@shish2k/react-mqtt";
import { useServerTime } from '@shish2k/react-use-servertime';

export type ServerContextType = {
    movies: { [key: string]: Movie };
    connected: boolean;
    loading: boolean;
    now: number;
};

export const ServerContext = createContext<ServerContextType>({} as ServerContextType);

function InternalServerProvider({ children }: { children: React.ReactNode }) {
    const [movies, setMovies] = useState<{ [name: string]: Movie }>({});
    const [loading, setLoading] = useState(true);
    const { now } = useServerTime({ url: '/api/time' });

    const { connected } = useSubscription(`global/movies`, (pkt: any) => {
        console.groupCollapsed(`mqtt_msg(${pkt.topic})`);
        console.log(pkt.json());
        console.groupEnd();
        setMovies(pkt.json());
        setLoading(false);
    });

    return (
        <ServerContext.Provider
            value={{
                movies,
                connected,
                loading,
                now,
            }}
        >
            {children}
        </ServerContext.Provider>
    );
}

export function ServerProvider({ children }: { children: React.ReactNode }) {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const mqtt_url = `${protocol}://${window.location.host}/mqtt`;
    return (
        <MqttProvider url={mqtt_url}>
            <InternalServerProvider>{children}</InternalServerProvider>
        </MqttProvider>
    );
}
