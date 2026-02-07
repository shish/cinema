import { MqttProvider } from '@shish2k/react-mqtt';
import { useServerTime } from '@shish2k/react-use-servertime';
import { createContext, useEffect, useState } from 'react';
import type { Movie } from '../types';

export type ServerContextType = {
    movies: { [key: string]: Movie };
    now: number;
};

export const ServerContext = createContext<ServerContextType>({} as ServerContextType);

function InternalServerProvider({ children }: { children: React.ReactNode }) {
    const [movies, setMovies] = useState<{ [name: string]: Movie }>({});
    const { now } = useServerTime({ url: '/api/time' });

    useEffect(() => {
        fetch(`/files/movies.json?_=${Date.now()}`)
            .then((res) => res.json())
            .then((data) => setMovies(data))
            .catch((error) => {
                console.error('Error loading movies:', error);
            });
    }, []);

    return (
        <ServerContext.Provider
            value={{
                movies,
                now,
            }}
        >
            {children}
        </ServerContext.Provider>
    );
}

export function ServerProvider({ children }: { children: React.ReactNode }) {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const mqtt_url = `${protocol}://${window.location.host}/api/mqtt`;
    return (
        <MqttProvider url={mqtt_url}>
            <InternalServerProvider>{children}</InternalServerProvider>
        </MqttProvider>
    );
}
