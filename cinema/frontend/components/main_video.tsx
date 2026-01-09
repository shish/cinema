import Hls from 'hls.js';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { faPause, faPlay } from '@fortawesome/free-solid-svg-icons';
import { FAIcon } from '@shish2k/react-faicon';

import { RoomContext } from '../providers/room';
import { SettingsContext } from '../providers/settings';

class HLSVideoElement extends HTMLVideoElement {
    static observedAttributes = ['src'];
    hls: Hls | null = null;

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'src' && oldValue !== newValue) {
            if (this.hls && newValue.endsWith('.m3u8')) {
                this.hls.loadSource(newValue);
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

export function MainVideo({
    movie,
    playingState,
    send,
}: {
    movie: Movie;
    playingState: PlayingState;
    send: (data: any) => void;
}) {
    const movieRef = useRef<HTMLVideoElement>(null);
    const { now } = useContext(RoomContext);
    const { showSubs } = useContext(SettingsContext);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [videoHint, setVideoHint] = useState<string | null>(null);

    // If there is a warning, show the controls so the user can deal with it
    useEffect(() => {
        movieRef.current!.controls = !!videoHint;
    }, [videoHint]);

    // Try to keep the video element in-sync with our goal time and playing state
    useEffect(() => {
        const movie = movieRef.current!;

        // Sanity-check the goal state
        let goalTime = playingState.paused ?? now - (playingState.playing || 0);
        let goalPaused = playingState.paused !== undefined;
        if (goalTime < 0) {
            goalTime = 0;
            goalPaused = true;
        }
        if (duration && goalTime > duration) {
            goalTime = duration;
            goalPaused = true;
        }

        // If we're supposed to be at time X, make sure we're at time X
        // (Allow a couple of seconds of desync while playing to avoid stuttering).
        if (movie.paused || Math.abs(movie.currentTime - goalTime) > 3) {
            if (!movie.paused) console.log(`Time is ${movie.currentTime} and should be ${goalTime}`);
            movie.currentTime = goalTime;
        }

        // If we're supposed to be paused
        if (goalPaused) {
            // Make sure we're paused
            if(!movie.paused) movie.pause();
            setVideoHint(null);
        }
        // If we're supposed to be playing
        if (!goalPaused) {
            // Make sure we're playing
            if (movie.paused) {
                movie
                    .play()
                    .then((_) => {
                        // everything is awesome
                        setVideoHint(null);
                    })
                    .catch((error) => {
                        console.log('Loud auto-play failed, trying muted auto-play...', error);
                        movie.muted = true;
                        movie
                            .play()
                            .then((_) => {
                                setVideoHint('Auto-play failed, you will need to tap the video and then un-mute it manually');
                                console.log("Muted auto-play succeeded");
                            })
                            .catch((error) => {
                                setVideoHint('Auto-play failed, you will need to tap the video and then push the play button manually');
                                console.log('Auto-play while muted also failed.', error);
                                movie.muted = false;
                            });
                    });
            }
            if (!movie.paused && !movie.muted) {
                setVideoHint(null);
            }
        }
    }, [now, playingState]);

    useEffect(() => {
        const movie = movieRef.current!;
        if (movie.textTracks.length > 0) {
            movie.textTracks[0].mode = showSubs ? 'showing' : 'hidden';
        }
    }, [showSubs]);

    function updateDuration(movie: HTMLVideoElement) {
        setCurrentTime(movie.currentTime);
        setDuration(movie.duration || 0);
    }
    function pause() {
        send({ pause: [movie.id, currentTime] });
    }
    function play() {
        send({ play: [movie.id, now - currentTime] });
    }
    function seek(time: number) {
        send({ pause: [movie.id, time] });
    }

    return (
        <div className="video">
            <div className="videoScaler">
                <video
                    ref={movieRef}
                    id="movie"
                    key={movie.id}
                    src={`/files/${movie.video}`}
                    poster={`/files/${movie.thumbnail}`}
                    playsInline={true}
                    // Keep the progress bar in the controls section in-sync with
                    // the playing movie.
                    onTimeUpdate={(e) => updateDuration(e.currentTarget)}
                    // load metadata and update duration ASAP
                    preload="metadata"
                    onCanPlay={(e) => updateDuration(e.currentTarget)}
                    is="hls-video"
                >
                    <track kind="captions" src={`/files/${movie.subtitles}`} default />
                </video>
            </div>
            {videoHint && <div className="video_hint">{videoHint}</div>}
            <form className="controls">
                {playingState.playing ? (
                    <button type="button" onClick={() => pause()}>
                        <FAIcon icon={faPause} />
                    </button>
                ) : (
                    <button type="button" onClick={() => play()}>
                        <FAIcon icon={faPlay} />
                    </button>
                )}
                <input
                    id="seekbar"
                    type="range"
                    onChange={(e) => seek(e.target.valueAsNumber)}
                    min={0}
                    max={duration}
                    value={currentTime}
                />
                <span>
                    {ts2hms(currentTime)} / {ts2hms(duration)}
                </span>
            </form>
        </div>
    );
}
