import { useCallback, useEffect, useState } from 'react';

import Rotate from '../static/icons/rotate.svg?react';

export function MovieList({
    movieFile,
    send,
}: {
    movieFile: string | null;
    send: (data: any) => void;
}) {
    const [movies, setMovies] = useState<string[]>([]);
    const [folder, setFolder] = useState<string>('');

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

    useEffect(() => {
        refreshMovies();
    }, [refreshMovies]);

    return (
        <form className="movie_list">
            <select
                id="movie_dirs"
                onChange={(e) => setFolder(e.target.value)}
                defaultValue={folder}
                disabled={movies.length === 0}
            >
                <option value="">Folder{movies.length === 0 && ' (Loading...)'}</option>
                {[...new Set(movies.map((p) => p.split('/')[0]))].map((p) => (
                    <option key={p}>{p}</option>
                ))}
            </select>
            <select
                id="movie_list"
                onChange={(e) => send(e.target.value ? { pause: [e.target.value, 0] } : { stop: null })}
                value={movieFile || ''}
                disabled={movies.length === 0}
            >
                <option value="">Select Movie{movies.length === 0 && ' (Loading...)'}</option>
                {movies
                    .filter((p) => !folder || p.startsWith(`${folder}/`))
                    .map((p) => (
                        <option key={p} value={p}>
                            {folder ? p.replace(`${folder}/`, '') : p}
                        </option>
                    ))}
            </select>
            <button type="button" onClick={(e) => refreshMovies()}>
                <Rotate />
            </button>
        </form>
    );
}
