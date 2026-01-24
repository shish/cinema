import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FAIcon } from '@shish2k/react-faicon';
import { useContext } from 'react';
import { useSessionStorage } from 'usehooks-ts';
import { ServerContext } from '../providers/server';
import { minititle } from '../utils';

export function MovieSelectDialog({
    selectedMovieId,
    send,
    setShowMovieSelect,
}: {
    selectedMovieId: string | null;
    send: (data: any) => void;
    setShowMovieSelect: (show: boolean) => void;
}) {
    const { movies } = useContext(ServerContext);
    const movieList = Object.keys(movies);
    const [folder, setFolder] = useSessionStorage<string>('movieSelectFolder', '');

    const folders = [...new Set(movieList.map((p) => p.split('/')[0]))];
    const filteredMovies = movieList.filter((p) => !folder || p.startsWith(`${folder}/`));

    const handleMovieSelect = (movieId: string) => {
        send({ pause: [movieId, 0] });
        setShowMovieSelect(false);
    };

    const handleClearMovie = () => {
        send({ stop: null });
        setShowMovieSelect(false);
    };

    return (
        <div className={'dialog-overlay'}>
            <div className={'dialog movie-select-dialog'}>
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
                <div className="movie-scroll">
                    <div className="movie-grid">
                        {filteredMovies
                            .map((movieId) => {
                                return { movieId, movie: movies[movieId] };
                            })
                            .map(({ movieId, movie }) => (
                                <div
                                    key={movieId}
                                    className={`movie-item ${movieId === selectedMovieId ? 'selected' : ''}`}
                                    onClick={() => handleMovieSelect(movieId)}
                                >
                                    <img src={`/files/${movie.thumbnail}`} alt={movie.title} />
                                    <div className="movie-title">{minititle(folder, movie.title)}</div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
