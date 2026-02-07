import type { Meta, StoryObj } from '@storybook/react';
import type { ChatMessage, MessageType } from '../types';
import { Chat } from './chat';

const meta: Meta<typeof Chat> = {
    title: 'Components/Chat/Messages',
    component: Chat,
    parameters: {
        layout: 'padded',
        height: '200px',
        docs: {
            description: {
                component:
                    'A chat component with message log and input. Supports @mentions, emoji autocomplete, slash commands, and markdown formatting including spoilers (||text||).',
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

export const Empty: Story = {
    args: {
        log: [],
        users: ['Alice', 'Bob', 'Charlie'],
        commands: mockCommands,
    },
};

export const BasicMessages: Story = {
    args: {
        log: [
            createMessage('Alice', 'Hello everyone!'),
            createMessage('Bob', 'Hi @Alice!'),
            createMessage('Charlie', 'Hey there!'),
        ],
        users: ['Alice', 'Bob', 'Charlie'],
        commands: mockCommands,
    },
};

export const OnlineUserMentions: Story = {
    args: {
        log: [
            createMessage('Alice', 'Hey @Bob, how are you?'),
            createMessage('Bob', '@Alice doing great, thanks!'),
            createMessage('Charlie', '@Bob @Alice can I join the conversation?'),
            createMessage('Alice', 'Of course @charlie!'),
        ],
        users: ['Alice', 'Bob', 'Charlie'],
        commands: mockCommands,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows mentions of users who are currently online. Notice how mentioned usernames are highlighted with vibrant colors when the users are online.',
            },
        },
    },
};

export const OfflineUserMentions: Story = {
    args: {
        log: [
            createMessage('Alice', 'Has anyone seen @David lately?'),
            createMessage('Bob', 'No, @David has been offline for a while'),
            createMessage('Charlie', 'I think @Eve and @Frank are also away'),
            createMessage('Alice', '@David @Eve @Frank hope you come back soon!'),
        ],
        users: ['Alice', 'Bob', 'Charlie'],
        commands: mockCommands,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows mentions of users who are NOT currently online. Notice how @David, @Eve, and @Frank appear in muted/desaturated colors compared to the online users Alice, Bob, and Charlie.',
            },
        },
    },
};

export const MixedOnlineOfflineMentions: Story = {
    args: {
        log: [
            createMessage('Alice', 'Hey @Bob and @David, are you there?'),
            createMessage('Bob', "I'm here @Alice! But I haven't seen @David"),
            createMessage('Charlie', "@Alice @Bob I'm online, but @Eve @Frank @Grace are all offline"),
            createMessage('Alice', 'Thanks @Charlie and @Bob for responding!'),
            createMessage('Bob', 'No problem @Alice! Hope @David @Eve @Frank @Grace come back soon'),
        ],
        users: ['Alice', 'Bob', 'Charlie'],
        commands: mockCommands,
    },
    parameters: {
        docs: {
            description: {
                story: 'Demonstrates the key feature: mixing online and offline user mentions. Online users (Alice, Bob, Charlie) appear in vibrant colors, while offline users (David, Eve, Frank, Grace) appear in muted/desaturated colors. This helps users quickly identify who is available.',
            },
        },
    },
};

export const SystemMessages: Story = {
    args: {
        log: [
            createMessage('System', 'Welcome to the chat!', 'system'),
            createMessage('Alice', 'Hello!'),
            createMessage('System', 'Bob has joined the room', 'system'),
            createMessage('Bob', 'Hi everyone!'),
            createMessage('System', 'Charlie has joined the room', 'system'),
            createMessage('Charlie', 'Hey!'),
        ],
        users: ['Alice', 'Bob', 'Charlie'],
        commands: mockCommands,
    },
};

export const ActionMessages: Story = {
    args: {
        log: [
            createMessage('Alice', 'waves hello', 'action'),
            createMessage('Bob', 'waves back at @Alice', 'action'),
            createMessage('Charlie', 'joins the party', 'action'),
            createMessage('Alice', 'dances with @Charlie', 'action'),
        ],
        users: ['Alice', 'Bob', 'Charlie'],
        commands: mockCommands,
    },
};

export const WithSpoilers: Story = {
    args: {
        log: [
            createMessage('Alice', 'Did you see the latest episode?'),
            createMessage('Bob', 'Yes! ||The main character died|| was shocking!'),
            createMessage('Charlie', 'OMG @Bob please use spoiler tags!'),
            createMessage('Bob', 'Sorry @Charlie, I did use ||spoiler tags||'),
            createMessage('Alice', 'Click on the black boxes to reveal spoilers'),
        ],
        users: ['Alice', 'Bob', 'Charlie'],
        commands: mockCommands,
    },
    parameters: {
        docs: {
            description: {
                story: 'Demonstrates spoiler tags using ||text||. Click on the blacked-out text to reveal it.',
            },
        },
    },
};

export const LongConversation: Story = {
    args: {
        log: [
            createMessage('Alice', 'Good morning everyone!', 'chat', 1000000),
            createMessage('Bob', 'Morning @Alice!', 'chat', 1000100),
            createMessage('Charlie', 'Hey @Alice and @Bob!', 'chat', 1000200),
            createMessage('Alice', 'How are you all doing today?', 'chat', 1000300),
            createMessage('Bob', 'Pretty good! Working on a new project', 'chat', 1000400),
            createMessage('Charlie', 'Same here @Bob, what are you working on?', 'chat', 1000500),
            createMessage('Bob', 'A chat application actually!', 'chat', 1000600),
            createMessage('Alice', "That's cool @Bob!", 'chat', 1000700),
            createMessage('System', 'David has joined the room', 'system', 1000800),
            createMessage('David', 'Hi everyone!', 'chat', 1000900),
            createMessage('Alice', 'Welcome @David!', 'chat', 1001000),
            createMessage('Bob', 'Hey @David!', 'chat', 1001100),
            createMessage('Charlie', 'Hi @David!', 'chat', 1001200),
            createMessage('David', 'What are you all talking about?', 'chat', 1001300),
            createMessage('Bob', '@David was just telling about my chat app project', 'chat', 1001400),
            createMessage('David', 'Sounds interesting @Bob!', 'chat', 1001500),
            createMessage('System', 'Eve has joined the room', 'system', 1001600),
            createMessage('Eve', 'Hello!', 'chat', 1001700),
            createMessage('Alice', 'Hi @Eve!', 'chat', 1001800),
            createMessage('System', 'David has left the room', 'system', 1001900),
            createMessage('Charlie', 'Bye @David!', 'chat', 1002000),
            createMessage('Eve', 'Did @David leave already?', 'chat', 1002100),
            createMessage(
                'Alice',
                'Yeah @Eve, @David just left. But @Bob @Charlie and I are still here!',
                'chat',
                1002200,
            ),
        ],
        users: ['Alice', 'Bob', 'Charlie', 'Eve'],
        commands: mockCommands,
    },
    parameters: {
        docs: {
            description: {
                story: 'A longer conversation showing users joining and leaving.',
            },
        },
    },
};
