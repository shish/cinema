import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { expect } from 'storybook/test';
import type { Viewer } from '../types';
import { ViewerList } from './viewer_list';
import css from './viewer_list.module.scss';

// Interactive wrapper component that maintains admin state
function InteractiveViewerList({ viewers, initialAdmins }: { viewers: Viewer[]; initialAdmins: string[] }) {
    const [admins, setAdmins] = useState<string[]>(initialAdmins);

    const send = (data: any) => {
        console.log('Send called with:', data);
        if (data.admin) {
            setAdmins([...admins, data.admin]);
        } else if (data.unadmin) {
            setAdmins(admins.filter((name) => name !== data.unadmin));
        }
    };

    return <ViewerList viewers={viewers} admins={admins} send={send} />;
}

const meta: Meta<typeof InteractiveViewerList> = {
    title: 'Components/ViewerList',
    component: InteractiveViewerList,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'An interactive viewer list. Click on any viewer to toggle their admin status (indicated by 🕹️ icon).',
            },
        },
    },
    tags: ['autodocs'],
    decorators: [(Story) => <Story />],
};

export default meta;
type Story = StoryObj<typeof InteractiveViewerList>;

// Helper to generate viewers
const generateViewers = (count: number): Viewer[] => {
    const names = [
        'Alice',
        'Bob',
        'Charlie',
        'Diana',
        'Eve',
        'Frank',
        'Grace',
        'Henry',
        'Ivy',
        'Jack',
        'Kate',
        'Leo',
        'Mia',
        'Noah',
        'Olivia',
        'Pete',
        'Quinn',
        'Ruby',
        'Sam',
        'Tina',
        'Uma',
        'Victor',
        'Wendy',
        'Xander',
        'Yara',
        'Zoe',
        'Alex',
        'Blake',
        'Casey',
        'Drew',
    ];

    const viewers: Viewer[] = [];
    for (let i = 0; i < count; i++) {
        viewers.push({
            name: names[i % names.length] + (i >= names.length ? `${Math.floor(i / names.length)}` : ''),
        });
    }
    return viewers;
};

export const Empty: Story = {
    args: {
        viewers: [],
        initialAdmins: [],
    },
};

export const SingleUser: Story = {
    args: {
        viewers: [{ name: 'Alice' }],
        initialAdmins: [],
    },
};

export const SingleAdmin: Story = {
    args: {
        viewers: [{ name: 'Alice' }],
        initialAdmins: ['Alice'],
    },
};

export const FewUsers: Story = {
    args: {
        viewers: generateViewers(3),
        initialAdmins: [],
    },
};

export const FewUsersWithAdmin: Story = {
    args: {
        viewers: generateViewers(4),
        initialAdmins: ['Bob'],
    },
    play: async ({ args, canvas, userEvent }) => {
        const button = canvas.getByText(args.viewers[0].name).parentElement as HTMLElement;

        await userEvent.click(button);
        await expect(button).toBeVisible();
        await expect(button).toHaveClass(css.admin);

        await userEvent.click(button);
        await expect(button).not.toHaveClass(css.admin);
    },
};

export const SeveralUsersOneLine: Story = {
    args: {
        viewers: generateViewers(8),
        initialAdmins: ['Alice', 'Charlie'],
    },
};

export const SeveralUsersTwoLines: Story = {
    args: {
        viewers: generateViewers(15),
        initialAdmins: ['Alice', 'Diana', 'Grace'],
    },
};

export const ManyUsers: Story = {
    args: {
        viewers: generateViewers(30),
        initialAdmins: ['Alice', 'Frank', 'Leo'],
    },
};

export const HundredsOfUsers: Story = {
    args: {
        viewers: generateViewers(150),
        initialAdmins: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
    },
};

export const DuplicateUsers: Story = {
    args: {
        viewers: [
            { name: 'Alice' },
            { name: 'Bob' },
            { name: 'Alice' },
            { name: 'Charlie' },
            { name: 'Bob' },
            { name: 'Alice' },
        ],
        initialAdmins: ['Alice'],
    },
};

export const UsersWithSpecialCharacters: Story = {
    args: {
        viewers: [{ name: '@Alice' }, { name: 'Bob!' }, { name: 'Charlie?' }, { name: '@Diana!' }, { name: '!!!Eve' }],
        initialAdmins: ['Bob!'],
    },
};
