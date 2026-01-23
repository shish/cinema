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
    video_state: VideoState;
    admins: Array<string>;
    viewers: Array<Viewer>;
    chat: Array<ChatMessage>;
    movie: string | null;
};

type ConnData = {
    sess: string;
    room: string;
    user: string;
};

type Movie = {
    id: string;
    title: string;
    video: string;
    subtitles: string;
    thumbnail: string;
};
