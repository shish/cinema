import type { Meta, StoryObj } from '@storybook/react';
import { PointerEventsCheckLevel } from '@testing-library/user-event';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { ChatMessage, MessageType } from '../types';
import { Chat } from './chat';

const meta: Meta<typeof Chat> = {
    title: 'Components/Chat/Emoji Picker',
    component: Chat,
    parameters: {
        layout: 'padded',
        height: '500px',
        docs: {
            description: {
                component:
                    'Interactive tests for the emoji picker button feature. Click the 😃 button to open a full emoji picker menu.',
            },
        },
    },
    tags: ['autodocs'],
    decorators: [
        (Story: any, { parameters }) => (
            <div style={{ height: parameters.height || '500px' }}>
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

export const EmojiPickerButton: Story = {
    args: {
        log: [createMessage('Alice', 'Click the emoji button to open the picker')],
        users: ['Alice', 'Bob', 'Charlie'],
        commands: mockCommands,
    },
    parameters: {
        height: '500px',
        docs: {
            description: {
                story: 'Interactive test: Clicks the emoji button (😃) to open the emoji picker, then selects an emoji from the menu.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Find the textarea
        const textarea = canvas.getByRole('textbox') as HTMLTextAreaElement;

        // Find the emoji button (😃)
        const emojiButton = canvas.getByRole('button', { name: /😃/ });
        expect(emojiButton).toBeInTheDocument();

        // Click the emoji button to open the picker
        await userEvent.click(emojiButton);

        // Wait for emoji picker to appear
        await waitFor(
            async () => {
                const emojiPicker = canvasElement.querySelector('.EmojiPickerReact');
                expect(emojiPicker).toBeInTheDocument();
            },
            { timeout: 3000 },
        );

        // Find and click an emoji in the picker
        // The emoji-picker-react library uses buttons for each emoji
        await waitFor(async () => {
            const emojiButtons = canvasElement.querySelectorAll('.EmojiPickerReact button[data-unified]');
            expect(emojiButtons.length).toBeGreaterThan(0);
        });

        // Click the first available emoji
        const emojiButtons = canvasElement.querySelectorAll('.EmojiPickerReact button[data-unified]');
        const firstEmoji = emojiButtons[0] as HTMLButtonElement;
        // disable pointer events check because the test framework detects
        // "pointer-events: none" for some reason
        await userEvent.click(firstEmoji, { pointerEventsCheck: PointerEventsCheckLevel.Never });

        // Verify the emoji picker closed
        await waitFor(async () => {
            const emojiPicker = canvasElement.querySelector('.EmojiPickerReact');
            expect(emojiPicker).not.toBeInTheDocument();
        });

        // Verify the textarea now contains an emoji
        await waitFor(async () => {
            expect(textarea.value.length).toBeGreaterThan(0);
            // Should contain at least one character (the emoji)
            expect(textarea.value).not.toBe('');
        });

        // Verify textarea has focus after emoji selection
        expect(textarea).toHaveFocus();
    },
};
