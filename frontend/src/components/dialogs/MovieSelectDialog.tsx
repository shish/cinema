import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FAIcon } from '@shish2k/react-faicon';
import { useSessionStorage } from 'usehooks-ts';

import type { Movie } from '../../types';
import { minititle } from '../../utils';
import css from './MovieSelectDialog.module.scss';

export function MovieSelectDialog({
    movies,
    selectedMovieId,
    setMovie,
    setShowMovieSelect,
}: {
    movies: { [key: string]: Movie };
    selectedMovieId: string | null;
    setMovie: (movieId: string | null) => void;
    setShowMovieSelect: (show: boolean) => void;
}) {
    const movieList = Object.keys(movies);
    const [folder, setFolder] = useSessionStorage<string>('movieSelectFolder', '');

    const folders = [...new Set(movieList.map((p) => p.split('/')[0]))];
    const filteredMovies = movieList.filter((p) => !folder || p.startsWith(`${folder}/`));

    const handleMovieSelect = (movieId: string) => {
        setMovie(movieId);
        setShowMovieSelect(false);
    };

    const handleClearMovie = () => {
        setMovie(null);
        setShowMovieSelect(false);
    };

    return (
        <div id="dialog_overlay">
            <div id="dialog" className={css.movieSelectDialog}>
                <h2>
                    {selectedMovieId && (
                        <button type="button" onClick={handleClearMovie} className="clear-button">
                            Clear Selection
                        </button>
                    )}
                    <select
                        onChange={(e) => setFolder(e.target.value)}
                        value={folder}
                        disabled={movieList.length === 0}
                        aria-label="Filter movies by folder"
                    >
                        <option value="">All Folders</option>
                        {folders.map((f) => (
                            <option key={f} value={f}>
                                {f}
                            </option>
                        ))}
                    </select>
                    <FAIcon
                        icon={faXmark}
                        onClick={() => setShowMovieSelect(false)}
                        style={{
                            cursor: 'pointer',
                            height: '1em',
                        }}
                    />
                </h2>
                <div className={css.movieScroll}>
                    <div className={css.movieGrid}>
                        {filteredMovies
                            .map((movieId) => {
                                return { movieId, movie: movies[movieId] };
                            })
                            .map(({ movieId, movie }) => (
                                <div
                                    key={movieId}
                                    className={`${css.movieItem} ${movieId === selectedMovieId ? css.selected : ''}`}
                                    onClick={() => handleMovieSelect(movieId)}
                                >
                                    <img src={`/files/${movie.thumbnail}`} alt={movie.title} />
                                    <div className={css.movieTitle} title={minititle(folder, movie.title)}>
                                        {minititle(folder, movie.title)}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
