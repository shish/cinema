import { createContext, useEffect, useState } from 'react';
import type { Movie } from '../types';

export type ServerContextType = {
    movies: { [key: string]: Movie };
};

export const ServerContext = createContext<ServerContextType>({} as ServerContextType);

export function ServerProvider({ children }: { children: React.ReactNode }) {
    const [movies, setMovies] = useState<{ [name: string]: Movie }>({});

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
            }}
        >
            {children}
        </ServerContext.Provider>
    );
}
