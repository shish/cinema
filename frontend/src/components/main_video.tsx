import Hls from 'hls.js';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';

import { SettingsContext } from '../providers/settings';
import Pause from '../static/icons/pause.svg?react';
import Play from '../static/icons/play.svg?react';
import { RoomContext } from '../providers/room';

class HLSVideoElement extends HTMLVideoElement {
    hls: Hls | null = null;

    get src() {
        return this.getAttribute('src') || '';
    }

    set src(val) {
        if (val !== this.src) {
            if (this.hls && val.endsWith('.m3u8')) {
                this.hls.loadSource(val);
            } else {
                this.setAttribute('src', val);
            }
        }
    }

    connectedCallback() {
        if (Hls.isSupported()) {
            this.hls = new Hls({});
            this.hls.loadSource(this.src);
            this.hls.attachMedia(this);
        }
    }
}

window.customElements.define('hls-video', HLSVideoElement, {
    extends: 'video',
});

function ts2hms(ts: number): string {
    return new Date(ts * 1000).toISOString().substring(11, 19);
}

function setCurrentTimeIsh(movie: HTMLVideoElement, goal: number) {
    // if our time is nearly-correct, leave it as-is
    const diff = Math.abs(movie.currentTime - goal);
    if (diff > 3) {
        console.log(`Time is ${movie.currentTime} and should be ${goal}`);
        movie.currentTime = goal;
    }
}

export function MainVideo({
    movieFile,
    playingState,
    send,
}: {
    movieFile: string;
    playingState: PlayingState;
    send: (data: any) => void;
}) {
    const movieRef = useRef<HTMLVideoElement>(null);
    const { getServerTime } = useContext(RoomContext);
    const { showSubs } = useContext(SettingsContext);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isMuted, setIsMuted] = useState<boolean>(true);

    // Monitor HTML video element for changes
    useEffect(() => {
        const movie = movieRef.current!;
        movie.onplay = () => setIsPlaying(true);
        movie.onpause = () => setIsPlaying(false);
        movie.onvolumechange = () => setIsMuted(movie.muted);
    }, []);
    // If the HTML video element seems to be having issues, show a warning
    const videoHint = useMemo(() => {
        if (playingState.playing) {
            if (!isPlaying) {
                return 'Auto-play failed, you will need to tap the video and then push the play button manually';
            }
            if (isMuted) {
                return 'Auto-play failed, you will need to tap the video and then un-mute it manually';
            }
        }
        return null;
    }, [playingState, isPlaying, isMuted]);
    // If there is a warning, show the controls so the user can deal with it
    useEffect(() => {
        movieRef.current!.controls = !!videoHint;
    }, [videoHint]);

    useEffect(() => {
        const movie = movieRef.current!;
        if (playingState.paused !== undefined) {
            if (!movie.paused) movie.pause();
            setCurrentTimeIsh(movie, playingState.paused);
        }
        if (playingState.playing !== undefined) {
            const goalTime = getServerTime() - playingState.playing;
            if (goalTime < 0 || goalTime > (movie.duration || 9999)) {
                // if we haven't yet started, or we have already finished, then pause at the start
                if (!movie.paused) movie.pause();
                setCurrentTimeIsh(movie, 0);
            } else {
                setCurrentTimeIsh(movie, goalTime);

                // if we're supposed to be playing, but we're paused, attempt to
                // trigger auto-play
                if (movie.paused) {
                    movie
                        .play()
                        .then((_) => {
                            // everything is awesome
                        })
                        .catch((error) => {
                            // attempt to play while muted
                            movie.muted = true;
                            movie
                                .play()
                                .then((_) => {
                                    // playing but muted
                                })
                                .catch((error) => {
                                    movie.muted = false;
                                });
                        });
                }
            }
        }
    }, [playingState]);

    useEffect(() => {
        const movie = movieRef.current!;
        if (movie.textTracks.length > 0) {
            movie.textTracks[0].mode = showSubs ? 'showing' : 'hidden';
        }
    }, [showSubs]);

    function updateDuration() {
        const movie = movieRef.current!;
        setCurrentTime(movie.currentTime);
        setDuration(movie.duration || 0);
        console.log('updateDuration', currentTime, duration);
    }
    function pause() {
        send({ pause: [movieFile, currentTime] });
    }
    function play() {
        send({ play: [movieFile, getServerTime() - currentTime] });
    }
    function seek() {
        send({ pause: [movieFile, currentTime] });
    }

    return (
        <div className="video">
            <video
                ref={movieRef}
                id="movie"
                src={`/movies/${movieFile}`}
                poster={`/movies/${movieFile.replace('.m3u8', '.jpg')}`}
                playsInline={true}
                // Keep the progress bar in the controls section in-sync with
                // the playing movie.
                onTimeUpdate={() => updateDuration()}
                // load metadata and update duration ASAP
                preload="metadata"
                onCanPlay={() => updateDuration()}
                is="hls-video"
            >
                <track kind="captions" src={`/movies/${movieFile.replace('.m3u8', '.vtt')}`} default />
            </video>
            {videoHint && <div className="video_hint">{videoHint}</div>}
            <form className="controls">
                {playingState.playing ? (
                    <button type="button" onClick={() => pause()}>
                        <Pause />
                    </button>
                ) : (
                    <button type="button" onClick={() => play()}>
                        <Play />
                    </button>
                )}
                <input id="seekbar" type="range" onChange={() => seek()} min={0} max={duration} value={currentTime} />
                <span>
                    {ts2hms(currentTime)} / {ts2hms(duration)}
                </span>
            </form>
        </div>
    );
}
