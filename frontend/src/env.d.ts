/// <reference types="@rsbuild/core/types" />

declare module '*.svg?react' {
    const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
    export default ReactComponent;
}

type PlayingState = {
    paused?: number;
    playing?: number;
};

type VideoState = {
    novideo?: null;
    video?: [string, PlayingState];
};

type Viewer = {
    name: string;
};

type ChatMessage = {
    absolute_timestamp: number;
    user: string;
    message: string;
};

type RoomData = {
    name: string;
    title: string;
    video_state: VideoState;
    admins: Array<string>;
    viewers: Array<Viewer>;
    chat: Array<ChatMessage>;
    movie: string | null;
    public: boolean;
};

type ConnData = {
    sess: string;
    room: string;
    user: string;
};
