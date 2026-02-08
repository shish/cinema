import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { InfoDialog } from './InfoDialog';

const meta: Meta<typeof InfoDialog> = {
    title: 'Components/Dialogs/InfoDialog',
    component: InfoDialog,
    parameters: {
        layout: 'fullscreen',
    },
};

export default meta;
type Story = StoryObj<typeof InfoDialog>;

export const Default: Story = {
    args: {
        setShowInfo: fn(),
    },
    parameters: {
        docs: {
            description: {
                story: 'Default info dialog with GitHub link, author contact, and donation options.',
            },
        },
    },
};
