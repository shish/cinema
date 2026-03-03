import type { Preview } from "storybook-react-rsbuild";
import { themes } from "storybook/theming";
import "../src/static/style.scss";

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        docs: {
            theme: themes.dark,
        },
    },
};

export default preview;
