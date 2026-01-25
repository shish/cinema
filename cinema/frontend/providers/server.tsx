import { createContext, useEffect, useState } from 'react';
import type { Movie } from '../types';

export type ServerContextType = {
    movies: { [key: string]: Movie };
    loading: boolean;
};

export const ServerContext = createContext<ServerContextType>({} as ServerContextType);

export function ServerProvider({ children }: { children: React.ReactNode }) {
    const [movies, setMovies] = useState<{ [name: string]: Movie }>({});
    const loading = Object.keys(movies).length === 0;

    useEffect(() => {
        fetch(`/files/movies.json?_=${Date.now()}`)
            .then((res) => res.json())
            .then((data) => setMovies(data))
            .catch((error) => {
                console.error('Error loading movies:', error);
            });
    }, []);

    /*
    const refreshMovies = useCallback(() => {
        setMovies([]);
        fetch('/movies')
            .then((response) => response.json())
            .then((movies) => {
                setMovies(movies);
                // console.log('Movies:', movies);
            })
            .catch((error) => {
                console.error('Error loading movies:', error);
            });
    }, []);
*/
    return (
        <ServerContext.Provider
            value={{
                movies,
                loading,
            }}
        >
            {children}
        </ServerContext.Provider>
    );
}
