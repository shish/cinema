import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { ChatMessage, MessageType } from '../../types';
import { Chat } from './Chat';
import css from './Chat.module.scss';

const meta: Meta<typeof Chat> = {
    title: 'Components/Chat/Autocomplete',
    component: Chat,
    parameters: {
        layout: 'padded',
        height: '200px',
        docs: {
            description: {
                component:
                    'Interactive tests for chat autocomplete features including slash commands, user mentions, and emoji autocomplete.',
            },
        },
    },
    tags: ['autodocs'],
    decorators: [
        (Story: any, { parameters }) => (
            <div style={{ height: parameters.height || '200px' }}>
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof Chat>;

// Helper function to create chat messages
const createMessage = (user: string, message: string, type: MessageType = 'chat', timestamp?: number): ChatMessage => ({
    absolute_timestamp: timestamp || Date.now() / 1000,
    user,
    message,
    type,
});

// Mock command handlers
const mockCommands = {
    '/me': {
        description: 'Perform an action',
        handler: (text: string) => console.log('Action:', text),
    },
    '/shrug': {
        description: 'Append ¯\\_(ツ)_/¯ to your message',
        handler: (text: string) => console.log('Shrug:', text),
    },
};

export const Command: Story = {
    args: {
        log: [createMessage('Alice', 'Try typing /m to autocomplete /me')],
        users: ['Alice', 'Bob', 'Charlie'],
        commands: mockCommands,
    },
    parameters: {
        docs: {
            description: {
                story: 'Interactive test: Types "/m" to trigger slash command autocomplete for "/me".',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Find the textarea
        const textarea = canvas.getByRole('textbox') as HTMLTextAreaElement;

        // Focus and type '/m'
        await userEvent.click(textarea);
        await userEvent.type(textarea, '/m');

        // Wait for autocomplete menu to appear
        await waitFor(async () => {
            const autocompleteMenu = canvasElement.querySelector(`.${css.autocomplete_menu}`);
            expect(autocompleteMenu).toBeInTheDocument();
        });

        // Check that /me command appears in the autocomplete
        await waitFor(async () => {
            const meCommand = canvas.getByText('/me');
            expect(meCommand).toBeInTheDocument();
        });

        // Verify the description is shown
        const description = canvas.getByText('Perform an action');
        expect(description).toBeInTheDocument();

        // Press Tab or Enter to complete
        await userEvent.keyboard('{Tab}');

        // Verify the textarea now contains '/me '
        await waitFor(async () => {
            expect(textarea.value).toBe('/me ');
        });
    },
};

export const User: Story = {
    args: {
        log: [createMessage('Bob', 'Try typing @Al to mention Alice')],
        users: ['Alice', 'Bob', 'Charlie'],
        commands: mockCommands,
    },
    parameters: {
        docs: {
            description: {
                story: 'Interactive test: Types "@Al" to trigger user mention autocomplete for "@Alice".',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Find the textarea
        const textarea = canvas.getByRole('textbox') as HTMLTextAreaElement;

        // Focus and type '@Al'
        await userEvent.click(textarea);
        await userEvent.type(textarea, '@Al');

        // Wait for autocomplete menu to appear
        await waitFor(async () => {
            const autocompleteMenu = canvasElement.querySelector(`.${css.autocomplete_menu}`);
            expect(autocompleteMenu).toBeInTheDocument();
        });

        // Check that @Alice appears in the autocomplete
        await waitFor(async () => {
            const aliceOption = canvas.getByText('@Alice');
            expect(aliceOption).toBeInTheDocument();
        });

        // Press Tab to complete
        await userEvent.keyboard('{Tab}');

        // Verify the textarea now contains '@Alice '
        await waitFor(async () => {
            expect(textarea.value).toBe('@Alice ');
        });
    },
};

export const Emoji: Story = {
    args: {
        log: [createMessage('Charlie', 'Try typing :sm to get smile emojis')],
        users: ['Alice', 'Bob', 'Charlie'],
        commands: mockCommands,
    },
    parameters: {
        height: '300px',
        docs: {
            description: {
                story: 'Interactive test: Types ":sm" to trigger emoji autocomplete for smile-related emojis.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Find the textarea
        const textarea = canvas.getByRole('textbox') as HTMLTextAreaElement;

        // Focus and type ':sm'
        await userEvent.click(textarea);
        await userEvent.type(textarea, ':sm');

        // Wait for autocomplete menu to appear
        await waitFor(async () => {
            const autocompleteMenu = canvasElement.querySelector(`.${css.autocomplete_menu}`);
            expect(autocompleteMenu).toBeInTheDocument();
        });

        // Check that smile-related emojis appear
        await waitFor(async () => {
            // Should show options like 'smile', 'smiley', 'smirk', etc.
            const smileOptions = canvasElement.querySelectorAll(`.${css.autocomplete_item}`);
            expect(smileOptions.length).toBeGreaterThan(0);
        });

        // Verify at least one smile emoji is present in the list
        const autocompleteItems = canvasElement.querySelectorAll(`.${css.autocomplete_text}`);
        const hasSmileEmoji = Array.from(autocompleteItems).some((item) =>
            item.textContent?.toLowerCase().includes('sm'),
        );
        expect(hasSmileEmoji).toBe(true);

        // Press Tab to complete with the first option
        await userEvent.keyboard('{Tab}');

        // Verify the textarea contains an emoji (the exact emoji depends on which matches)
        await waitFor(async () => {
            expect(textarea.value.length).toBeGreaterThan(0);
            // Should have replaced ':sm' with an emoji and space
            expect(textarea.value).not.toBe(':sm');
        });
    },
};

export const Navigation: Story = {
    args: {
        log: [createMessage('Alice', 'Try using arrow keys to navigate autocomplete')],
        users: ['Alice', 'Bob', 'Charlie', 'Carol', 'Chris'],
        commands: mockCommands,
    },
    parameters: {
        docs: {
            description: {
                story: 'Interactive test: Types "@C" and uses arrow keys to navigate through multiple matching users.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Find the textarea
        const textarea = canvas.getByRole('textbox') as HTMLTextAreaElement;

        // Focus and type '@C' to get multiple matches
        await userEvent.click(textarea);
        await userEvent.type(textarea, '@C');

        // Wait for autocomplete menu to appear
        await waitFor(async () => {
            const autocompleteMenu = canvasElement.querySelector(`.${css.autocomplete_menu}`);
            expect(autocompleteMenu).toBeInTheDocument();
        });

        // Should have multiple C-name matches (Charlie, Carol, Chris)
        await waitFor(async () => {
            const items = canvasElement.querySelectorAll(`.${css.autocomplete_item}`);
            expect(items.length).toBeGreaterThanOrEqual(3);
        });

        // Press ArrowDown to select the second item
        await userEvent.keyboard('{ArrowDown}');

        // Verify second item is selected
        await waitFor(async () => {
            const selectedItems = canvasElement.querySelectorAll(`.${css.autocomplete_item}.${css.selected}`);
            expect(selectedItems.length).toBe(1);
        });

        // Press ArrowDown again
        await userEvent.keyboard('{ArrowDown}');

        // Press Tab to complete
        await userEvent.keyboard('{Tab}');

        // Verify autocomplete completed
        await waitFor(async () => {
            expect(textarea.value).toMatch(/@C\w+\s/);
        });
    },
};
