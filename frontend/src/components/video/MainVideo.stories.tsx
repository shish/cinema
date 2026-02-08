import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import type { Movie, PlayingState } from '../../types';
import { MainVideo } from './MainVideo';

const meta: Meta<typeof MainVideo> = {
    title: 'Components/Video/MainVideo',
    component: MainVideo,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Main video player component with play/pause controls, seek bar, and subtitle support. Syncs playback state with server time.',
            },
        },
    },
    tags: ['autodocs'],
    decorators: [
        (Story: any) => (
            <div style={{ position: 'fixed', inset: '1rem' }}>
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof MainVideo>;

// Mock movie data
const mockMovie: Movie = {
    id: 'test-movie-1',
    title: 'Big Buck Bunny',
    video: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    subtitles: '',
    thumbnail: 'https://via.placeholder.com/640x360/333/fff?text=Big+Buck+Bunny',
};

// Mock callbacks
const mockCallbacks = {
    onPause: fn(),
    onPlay: fn(),
    onSeek: fn(),
};

// Current server time (in seconds)
const now = Date.now() / 1000;

export const Paused: Story = {
    args: {
        movie: mockMovie,
        playingState: {
            paused: 30, // Paused at 30 seconds
        } as PlayingState,
        now,
        showSubs: false,
        ...mockCallbacks,
    },
    parameters: {
        docs: {
            description: {
                story: 'Video paused at 30 seconds. Click play to resume.',
            },
        },
    },
};

export const PausedAtStart: Story = {
    args: {
        movie: mockMovie,
        playingState: {
            paused: 0, // Paused at start
        } as PlayingState,
        now,
        showSubs: false,
        ...mockCallbacks,
    },
    parameters: {
        docs: {
            description: {
                story: 'Video paused at the beginning.',
            },
        },
    },
};

export const Playing: Story = {
    args: {
        movie: mockMovie,
        playingState: {
            playing: now - 60, // Started 60 seconds ago
        } as PlayingState,
        now,
        showSubs: false,
        ...mockCallbacks,
    },
    parameters: {
        docs: {
            description: {
                story: 'Video playing, started 60 seconds ago. Should be at the 60 second mark.',
            },
        },
    },
};

export const PlayingFromStart: Story = {
    args: {
        movie: mockMovie,
        playingState: {
            playing: now, // Just started playing
        } as PlayingState,
        now,
        showSubs: false,
        ...mockCallbacks,
    },
    parameters: {
        docs: {
            description: {
                story: 'Video just started playing from the beginning.',
            },
        },
    },
};

export const WithSubtitles: Story = {
    args: {
        movie: {
            ...mockMovie,
            subtitles: 'https://example.com/subtitles.vtt',
        },
        playingState: {
            paused: 45,
        } as PlayingState,
        now,
        showSubs: true, // Subtitles enabled
        ...mockCallbacks,
    },
    parameters: {
        docs: {
            description: {
                story: 'Video with subtitles enabled. The showSubs prop controls whether subtitles are visible.',
            },
        },
    },
};

export const WithoutSubtitles: Story = {
    args: {
        movie: {
            ...mockMovie,
            subtitles: 'https://example.com/subtitles.vtt',
        },
        playingState: {
            paused: 45,
        } as PlayingState,
        now,
        showSubs: false, // Subtitles disabled
        ...mockCallbacks,
    },
    parameters: {
        docs: {
            description: {
                story: 'Video with subtitles available but disabled. Even though the movie has subtitles, they are hidden.',
            },
        },
    },
};

export const CustomPoster: Story = {
    args: {
        movie: {
            ...mockMovie,
            thumbnail: 'https://via.placeholder.com/640x360/6366f1/fff?text=Custom+Poster',
        },
        playingState: {
            paused: 0,
        } as PlayingState,
        now,
        showSubs: false,
        ...mockCallbacks,
    },
    parameters: {
        docs: {
            description: {
                story: 'Video with a custom poster/thumbnail image displayed before playback.',
            },
        },
    },
};

export const MidPlayback: Story = {
    args: {
        movie: mockMovie,
        playingState: {
            playing: now - 120, // Playing for 2 minutes
        } as PlayingState,
        now,
        showSubs: true,
        ...mockCallbacks,
    },
    parameters: {
        docs: {
            description: {
                story: 'Video currently playing, about 2 minutes in with subtitles enabled.',
            },
        },
    },
};

export const InteractiveControls: Story = {
    args: {
        movie: mockMovie,
        playingState: {
            paused: 15,
        } as PlayingState,
        now,
        showSubs: false,
        onPause: (movieId: string, time: number) => {
            console.log('Pause requested:', { movieId, time });
        },
        onPlay: (movieId: string, startedAt: number) => {
            console.log('Play requested:', { movieId, startedAt });
        },
        onSeek: (movieId: string, time: number) => {
            console.log('Seek requested:', { movieId, time });
        },
    },
    parameters: {
        docs: {
            description: {
                story: 'Try interacting with the controls! Click play/pause and drag the seek bar. Check the Actions panel to see callback events.',
            },
        },
    },
};
