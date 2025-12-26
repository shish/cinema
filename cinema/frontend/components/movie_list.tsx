import { useCallback, useContext, useEffect, useState } from 'react';
import { faRotate } from '@fortawesome/free-solid-svg-icons';
import { FAIcon } from '@shish2k/react-faicon';
import { ServerContext } from '../providers/server';

export function MovieList({ selectedMovieId, send }: { selectedMovieId: string | null; send: (data: any) => void }) {
    const { movies } = useContext(ServerContext);
    const movieList = Object.keys(movies);
    const [folder, setFolder] = useState<string>('');

    return (
        <form className="movie_list">
            <select
                id="movie_dirs"
                onChange={(e) => setFolder(e.target.value)}
                defaultValue={folder}
                disabled={movieList.length === 0}
            >
                <option value="">Folder{movieList.length === 0 && ' (Loading...)'}</option>
                {[...new Set(movieList.map((p) => p.split('/')[0]))].map((p) => (
                    <option key={p}>{p}</option>
                ))}
            </select>
            <select
                id="movie_list"
                onChange={(e) => send(e.target.value ? { pause: [e.target.value, 0] } : { stop: null })}
                value={selectedMovieId || ''}
                disabled={movieList.length === 0}
            >
                <option value="">Select Movie{movieList.length === 0 && ' (Loading...)'}</option>
                {movieList
                    .filter((p) => !folder || p.startsWith(`${folder}/`))
                    .map((p) => (
                        <option key={p} value={p}>
                            {folder ? p.replace(`${folder}/`, '') : p}
                        </option>
                    ))}
            </select>
            {/*
            <button type="button" onClick={(e) => refreshMovies()}>
                <FAIcon icon={faRotate} />
            </button>
            */}
        </form>
    );
}
