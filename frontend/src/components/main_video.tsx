import { faPause, faPlay } from '@fortawesome/free-solid-svg-icons';
import { FAIcon } from '@shish2k/react-faicon';
import { useContext, useEffect, useRef, useState } from 'react';

import { RoomContext } from '../providers/room';
import { ServerContext } from '../providers/server';
import { SettingsContext } from '../providers/settings';
import type { Movie, PlayingState } from '../types';
import { HLSVideoElement } from './hls_video';

// Apparently we need to define the custom element here, it doesn't
// work when done in hls_video.tsx o_O
if (!window.customElements.get('hls-video')) {
    window.customElements.define('hls-video', HLSVideoElement);
}

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
    const hlsRef = useRef<HLSVideoElement>(null);
    const { now } = useContext(ServerContext);
    const { showSubs } = useContext(SettingsContext);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [videoHint, setVideoHint] = useState<string | null>(null);

    // Get the actual video element from the custom element
    // We want this to run when the ref changes (TODO: *does* it run when the ref changes?)
    // biome-ignore lint/correctness/useExhaustiveDependencies: see above
    useEffect(() => {
        if (hlsRef.current) {
            const video = hlsRef.current.getVideoElement();

            function updateDuration() {
                setCurrentTime(video.currentTime);
                setDuration(video.duration || 0);
            }

            video.addEventListener('timeupdate', updateDuration);
            video.addEventListener('canplay', updateDuration);

            return () => {
                video.removeEventListener('timeupdate', updateDuration);
                video.removeEventListener('canplay', updateDuration);
            };
        }
    }, [hlsRef.current]);

    // Try to keep the video element in-sync with our goal time and playing state
    useEffect(() => {
        const video = hlsRef.current!.getVideoElement();

        // Sanity-check the goal state
        let goalTime = playingState.paused ?? now - (playingState.playing || 0);
        let goalPaused = playingState.paused !== undefined;
        if (goalTime < 0) {
            goalTime = 0;
            goalPaused = true;
        }
        if (video.duration > 0 && goalTime > video.duration) {
            goalTime = video.duration;
            goalPaused = true;
        }

        // If we're supposed to be at time X, make sure we're at time X
        // (Allow a couple of seconds of desync while playing to avoid stuttering).
        if (video.paused || Math.abs(video.currentTime - goalTime) > 3) {
            if (!video.paused) console.log(`Time is ${video.currentTime} and should be ${goalTime}`);
            video.currentTime = goalTime;
        }

        // If we're supposed to be paused
        if (goalPaused) {
            // Make sure we're paused
            if (!video.paused) video.pause();
            setVideoHint(null);
        }
        // If we're supposed to be playing
        if (!goalPaused) {
            // Make sure we're playing
            if (video.paused) {
                video
                    .play()
                    .then((_) => {
                        // everything is awesome
                        setVideoHint(null);
                    })
                    .catch((error) => {
                        console.log('Loud auto-play failed, trying muted auto-play...', error);
                        video.muted = true;
                        video
                            .play()
                            .then((_) => {
                                setVideoHint(
                                    'Auto-play failed, you will need to tap the video and then un-mute it manually',
                                );
                                console.log('Muted auto-play succeeded');
                            })
                            .catch((error) => {
                                setVideoHint(
                                    'Auto-play failed, you will need to tap the video and then push the play button manually',
                                );
                                console.log('Auto-play while muted also failed.', error);
                                video.muted = false;
                            });
                    });
            }
            if (!video.paused && !video.muted) {
                setVideoHint(null);
            }
        }
    }, [now, playingState]);

    useEffect(() => {
        const video = hlsRef.current!.getVideoElement();
        if (video.textTracks.length > 0) {
            video.textTracks[0].mode = showSubs ? 'showing' : 'hidden';
        }
    }, [showSubs]);

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
                <hls-video
                    ref={hlsRef}
                    // use key to force reloading the video element when movie
                    // changes so that subtitle tracks are reloaded properly
                    key={movie.id}
                    src={`/files/${movie.video}`}
                    poster={`/files/${movie.thumbnail}`}
                    plays-inline="true"
                    preload="metadata"
                    controls={`${!!videoHint}`}
                >
                    <track kind="captions" src={`/files/${movie.subtitles}`} default />
                </hls-video>
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
