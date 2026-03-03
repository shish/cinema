import type { StorybookConfig } from "storybook-react-rsbuild";

const config: StorybookConfig = {
    stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
    addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
    framework: "storybook-react-rsbuild",
};
export default config;
