import { createContext, useEffect, useState } from 'react';

export type ServerContextType = {
    movies: { [key: string]: Movie };
    rooms: { [key: string]: string };
    loading: boolean;
};

export const ServerContext = createContext<ServerContextType>({} as ServerContextType);

export function ServerProvider({ children }: { children: React.ReactNode }) {
    const [movies, setMovies] = useState<{ [name: string]: Movie }>({});
    const [rooms, setRooms] = useState<{ [name: string]: string }>({});
    const loading = Object.keys(movies).length === 0;

    useEffect(() => {
        fetch('/api/rooms')
            .then((response) => response.json())
            .then((rooms) => setRooms(rooms))
            .catch((error) => {
                console.error('Error loading rooms:', error);
            });
    }, []);

    useEffect(() => {
        fetch('/files/movies.json')
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
                rooms,
                loading,
            }}
        >
            {children}
        </ServerContext.Provider>
    );
}
