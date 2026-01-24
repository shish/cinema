export type PlayingState = {
    paused?: number;
    playing?: number;
};

export type VideoState = {
    novideo?: null;
    video?: [string, PlayingState];
};

export type Viewer = {
    name: string;
};

export type ChatMessage = {
    absolute_timestamp: number;
    user: string;
    message: string;
};

export type RoomData = {
    name: string;
    video_state: VideoState;
    admins: Array<string>;
    viewers: Array<Viewer>;
    chat: Array<ChatMessage>;
    movie: string | null;
};

export type ConnData = {
    sess: string;
    room: string;
    user: string;
};

export type Movie = {
    id: string;
    title: string;
    video: string;
    subtitles: string;
    thumbnail: string;
};
