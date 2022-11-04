declare module '*.png';
declare module 'hyperapp';

type FormInputEvent = {
    target: HTMLTextAreaElement;
};

type Viewer = {
    name: string,
}

type ChatMessage = {
    absolute_timestamp: number,
    user: string,
    message: string,
}

type PlayingState = {
    paused?: number,
    playing?: number,
}

type VideoState = {
    novideo?: null,
    video?: [string, PlayingState],
}

type Room = {
    name: string,
    title: string,
	video_state: VideoState,
    admins: Array<string>,
    viewers: Array<Viewer>,
	chat: Array<ChatMessage>,
    movie: string | null,
    public: boolean,
}

interface Dictionary<T> {
    [Key: string]: T;
}

type State = {
    conn: {
        user: string,
        room: string | null,
        sess: string,
    },
    movies: Array<string>,
    rooms: Dictionary<string>,
    error: string | null,
    room: Room,
    ws_errors: number,
    loading: string | null,
    fullscreen: boolean,
    manual_entry: boolean,
    help: boolean,
    currentTime: number,
    duration: number,
    show_settings: boolean,
    show_chat: boolean,
    title_edit: string,
    show_system: boolean,
    video_hint: string | null,
}

declare type Action = import('hyperapp').Action<State>;
declare type Effect = import('hyperapp').Effect<State>;
declare type Dispatchable = import('hyperapp').Dispatchable<State>;
declare type Subscription = import('hyperapp').Subscription<State>;
declare type VNode = import('hyperapp').VNode<State>;
