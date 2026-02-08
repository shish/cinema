import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import { useState } from 'react';
import type { Movie } from '../../types';
import { MovieSelectDialog } from './MovieSelectDialog';

// Interactive wrapper component that maintains selection state
function InteractiveMovieSelectDialog({
    movies,
    initialSelectedMovieId,
}: {
    movies: { [key: string]: Movie };
    initialSelectedMovieId: string | null;
}) {
    const [selectedMovieId, setSelectedMovieId] = useState<string | null>(initialSelectedMovieId);
    const [isOpen, setIsOpen] = useState(true);

    if (!isOpen) {
        return <div>Dialog closed. Selected: {selectedMovieId || 'None'}</div>;
    }

    return (
        <MovieSelectDialog
            movies={movies}
            selectedMovieId={selectedMovieId}
            setMovie={setSelectedMovieId}
            setShowMovieSelect={setIsOpen}
        />
    );
}

const meta: Meta<typeof InteractiveMovieSelectDialog> = {
    title: 'Components/Dialogs/MovieSelectDialog',
    component: InteractiveMovieSelectDialog,
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'A dialog for selecting movies from a collection. Supports filtering by folder and displays movie thumbnails in a grid.',
            },
        },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof InteractiveMovieSelectDialog>;

// Helper to create mock movies
const createMovie = (id: string, title: string): Movie => ({
    id,
    title,
    video: `${id}/video.mp4`,
    subtitles: `${id}/subtitles.vtt`,
    thumbnail: `https://via.placeholder.com/300x450/333/fff?text=${encodeURIComponent(title)}`,
});

const singleFolderMovies: { [key: string]: Movie } = {
    'movies/The Matrix': createMovie('movies/The Matrix', 'The Matrix'),
    'movies/Inception': createMovie('movies/Inception', 'Inception'),
    'movies/Interstellar': createMovie('movies/Interstellar', 'Interstellar'),
    'movies/The Dark Knight': createMovie('movies/The Dark Knight', 'The Dark Knight'),
    'movies/Pulp Fiction': createMovie('movies/Pulp Fiction', 'Pulp Fiction'),
};

const multipleFolderMovies: { [key: string]: Movie } = {
    'action/The Matrix': createMovie('action/The Matrix', 'The Matrix'),
    'action/Die Hard': createMovie('action/Die Hard', 'Die Hard'),
    'action/Mad Max': createMovie('action/Mad Max', 'Mad Max'),
    'scifi/Blade Runner': createMovie('scifi/Blade Runner', 'Blade Runner'),
    'scifi/Inception': createMovie('scifi/Inception', 'Inception'),
    'scifi/Interstellar': createMovie('scifi/Interstellar', 'Interstellar'),
    'drama/The Shawshank Redemption': createMovie('drama/The Shawshank Redemption', 'The Shawshank Redemption'),
    'drama/Forrest Gump': createMovie('drama/Forrest Gump', 'Forrest Gump'),
    'comedy/Superbad': createMovie('comedy/Superbad', 'Superbad'),
    'comedy/The Hangover': createMovie('comedy/The Hangover', 'The Hangover'),
};

const manyMovies: { [key: string]: Movie } = {};
for (let i = 1; i <= 50; i++) {
    const folder = ['action', 'scifi', 'drama', 'comedy', 'thriller'][i % 5];
    manyMovies[`${folder}/Movie ${i}`] = createMovie(`${folder}/Movie ${i}`, `Movie ${i}`);
}

export const Empty: Story = {
    args: {
        movies: {},
        initialSelectedMovieId: null,
    },
};

export const SingleFolder: Story = {
    args: {
        movies: singleFolderMovies,
        initialSelectedMovieId: null,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows movies from a single folder.',
            },
        },
    },
};

export const SingleFolderWithSelection: Story = {
    args: {
        movies: singleFolderMovies,
        initialSelectedMovieId: 'movies/Inception',
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows a movie already selected (highlighted with border).',
            },
        },
    },
};

export const MultipleFolders: Story = {
    args: {
        movies: multipleFolderMovies,
        initialSelectedMovieId: null,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows movies organized into multiple folders with a folder filter dropdown.',
            },
        },
    },
};

export const ManyMovies: Story = {
    args: {
        movies: manyMovies,
        initialSelectedMovieId: null,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows a large collection of movies with scrollable grid.',
            },
        },
    },
};

export const SelectMovie: Story = {
    args: {
        movies: singleFolderMovies,
        initialSelectedMovieId: null,
    },
    parameters: {
        docs: {
            description: {
                story: 'Interactive test: Clicks on a movie to select it.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Find all movie items
        const movieItems = canvasElement.querySelectorAll('[class*="movieItem"]');
        expect(movieItems.length).toBeGreaterThan(0);

        // Click the first movie
        const firstMovie = movieItems[0] as HTMLElement;
        await userEvent.click(firstMovie);

        // The dialog should close after selection
        // (In the interactive wrapper, it shows "Dialog closed" message)
    },
};

export const FilterByFolder: Story = {
    args: {
        movies: multipleFolderMovies,
        initialSelectedMovieId: null,
    },
    parameters: {
        docs: {
            description: {
                story: 'Interactive test: Uses the folder dropdown to filter movies.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Find the folder select dropdown
        const select = canvas.getByRole('combobox');
        expect(select).toBeInTheDocument();

        // Get initial movie count
        const initialMovieItems = canvasElement.querySelectorAll('[class*="movieItem"]');
        const initialCount = initialMovieItems.length;

        // Select "action" folder
        await userEvent.selectOptions(select, 'action');

        // Check that movies are filtered
        const filteredMovieItems = canvasElement.querySelectorAll('[class*="movieItem"]');
        expect(filteredMovieItems.length).toBeLessThan(initialCount);
        expect(filteredMovieItems.length).toBeGreaterThan(0);
    },
};

export const ClearSelection: Story = {
    args: {
        movies: singleFolderMovies,
        initialSelectedMovieId: 'movies/Inception',
    },
    parameters: {
        docs: {
            description: {
                story: 'Interactive test: Clicks the "Clear Selection" button.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Find the clear button (only visible when a movie is selected)
        const clearButton = canvas.getByRole('button', { name: /clear selection/i });
        expect(clearButton).toBeInTheDocument();

        // Click the clear button
        await userEvent.click(clearButton);

        // Dialog should close
    },
};

export const CloseDialog: Story = {
    args: {
        movies: singleFolderMovies,
        initialSelectedMovieId: null,
    },
    parameters: {
        docs: {
            description: {
                story: 'Interactive test: Clicks the X button to close the dialog.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Find the close icon (X button)
        const closeButton = canvasElement.querySelector('svg[data-icon="xmark"]')?.parentElement as HTMLElement;
        expect(closeButton).toBeInTheDocument();

        // Click to close
        await userEvent.click(closeButton);

        // Dialog should close
    },
};

export const LongTitles: Story = {
    args: {
        movies: {
            'movies/Very Long Movie Title That Should Be Truncated': createMovie(
                'movies/Very Long Movie Title That Should Be Truncated',
                'Very Long Movie Title That Should Be Truncated Because It Is Too Long',
            ),
            'movies/Another Extremely Long Title': createMovie(
                'movies/Another Extremely Long Title',
                'Another Extremely Long Title That Goes On And On',
            ),
            'movies/Short': createMovie('movies/Short', 'Short'),
        },
        initialSelectedMovieId: null,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows how long movie titles are handled (truncation/wrapping).',
            },
        },
    },
};