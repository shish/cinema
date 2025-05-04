import Hls from 'hls.js';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';

import { RoomContext } from '../providers/room';
import { SettingsContext } from '../providers/settings';
import Pause from '../static/icons/pause.svg?react';
import Play from '../static/icons/play.svg?react';

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
    movieFile,
    playingState,
    send,
}: {
    movieFile: string;
    playingState: PlayingState;
    send: (data: any) => void;
}) {
    const movieRef = useRef<HTMLVideoElement>(null);
    const { now } = useContext(RoomContext);
    const { showSubs } = useContext(SettingsContext);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isMuted, setIsMuted] = useState<boolean>(false);

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

        // Figure out the goal time, whether we're goal-paused or goal-playing.
        // If our goal time is invalid, then pause at the start
        // (goal time may become valid, eg if it is set to the future and then
        // we wait for the the future to arrive)
        let goalTime = playingState.paused || now - (playingState.playing || 0);
        if (goalTime < 0 || goalTime > (movie.duration || 9999)) {
            movie.pause();
            goalTime = 0;
        }

        // Set the movie time, whether we're movie-paused or movie-playing.
        // If we're currently playing, then only bother to set the time if it's
        // more than 3 seconds off, to avoid stuttering.
        if (movie.paused || Math.abs(movie.currentTime - goalTime) > 3) {
            if (!movie.paused) console.log(`Time is ${movie.currentTime} and should be ${goalTime}`);
            movie.currentTime = goalTime;
        }

        if (playingState.paused && !movie.paused) {
            movie.pause();
        }
        if (playingState.playing && movie.paused) {
            // if we're supposed to be playing, but we're paused, attempt to
            // trigger auto-play
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
    }, [now, playingState]);

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
        // console.log('updateDuration', currentTime, duration);
    }
    function pause() {
        send({ pause: [movieFile, currentTime] });
    }
    function play() {
        send({ play: [movieFile, now - currentTime] });
    }
    function seek(time: number) {
        send({ pause: [movieFile, time] });
    }

    return (
        <div className="video">
            <div className="videoScaler">
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
            </div>
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
