import { useServerTime } from '@shish2k/react-use-servertime';
import { createContext, useState } from 'react';
import useWebSocket from 'react-use-websocket';
import type { Movie } from '../types';

export type ServerContextType = {
    movies: { [key: string]: Movie };
    now: number;
};

export const ServerContext = createContext<ServerContextType>({} as ServerContextType);

export function ServerProvider({ children }: { children: React.ReactNode }) {
    const [movies, setMovies] = useState<{ [name: string]: Movie }>({});
    const { now } = useServerTime({ url: '/api/time' });

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const moviesSocketUrl = `${proto}//${window.location.host}/api/movies`;
    useWebSocket(moviesSocketUrl, {
        onMessage: (event) => {
            const data = JSON.parse(event.data);
            console.log(`[server] received ${Object.keys(data).length} movies`);
            setMovies(data);
        },
        shouldReconnect: () => true,
        retryOnError: true,
    });

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
