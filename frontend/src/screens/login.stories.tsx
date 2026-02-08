import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import { LoginScreen } from './login';
import { SettingsProvider } from '../providers/settings';

const meta: Meta<typeof LoginScreen> = {
    title: 'Screens/Login',
    component: LoginScreen,
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'Login screen where users enter their name and room code to join a Cinema room. Tests various screen sizes from mobile to desktop.',
            },
        },
    },
    decorators: [
        (Story) => (
            <SettingsProvider>
                <Story />
            </SettingsProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof LoginScreen>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Default login screen at standard desktop size.',
            },
        },
    },
};

export const DisplayMobilePortrait: Story = {
    globals: {
      viewport: { value: 'mobile1', isRotated: false },
    },
};

export const DisplayMobileLandscape: Story = {
    globals: {
      viewport: { value: 'mobile1', isRotated: true },
    },
};

export const DisplayTablet: Story = {
    globals: {
      viewport: { value: 'tablet', isRotated: true },
    },
};

export const DisplayDesktop: Story = {
    globals: {
      viewport: { value: 'desktop', isRotated: false },
    },
};

export const InteractiveLogin: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Interactive test: Fills in username and room code, then submits the form.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Find the input fields
        const userInput = canvas.getByPlaceholderText('Enter Your Name') as HTMLInputElement;
        const roomInput = canvas.getByPlaceholderText('Enter Room Code') as HTMLInputElement;

        // Fill in the user name
        await userEvent.clear(userInput);
        await userEvent.type(userInput, 'TestUser');
        expect(userInput.value).toBe('TestUser');

        // Fill in the room code
        await userEvent.type(roomInput, 'ABCD');
        expect(roomInput.value).toBe('ABCD');

        // Verify the join button is present
        const joinButton = canvas.getByRole('button', { name: 'Join' });
        expect(joinButton).toBeInTheDocument();
    },
};

export const InfoMenuDesktop: Story = {
    globals: {
      viewport: { value: 'desktop', isRotated: false },
    },
    parameters: {
        docs: {
            description: {
                story: 'Interactive test: Opens the info menu by clicking the info icon.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Find and click the info icon
        const infoIcon = canvasElement.querySelector('[data-title="info"]') as HTMLElement;
        await userEvent.click(infoIcon);

        // Wait for the info dialog to appear
        const dialog = canvasElement.querySelector('#dialog');
        expect(dialog).toBeInTheDocument();

        // Verify the dialog contains expected content
        const githubLink = canvas.getByRole('link', { name: /Cinema/ });
        expect(githubLink).toBeInTheDocument();
        expect(githubLink).toHaveAttribute('href', 'https://github.com/shish/cinema');
    },
};

export const InfoMenuMobile: Story = {
    globals: {
      viewport: { value: 'mobile1', isRotated: false },
    },
    parameters: {
        docs: {
            description: {
                story: 'Info menu opened on a mobile device to verify responsive layout.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Find and click the info icon
        const infoIcon = canvasElement.querySelector('[data-title="info"]') as HTMLElement;
        await userEvent.click(infoIcon);

        // Verify the info dialog appears
        const dialog = canvasElement.querySelector('#dialog');
        expect(dialog).toBeInTheDocument();
    },
};
