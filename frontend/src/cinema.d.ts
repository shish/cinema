declare module '*.png';
declare module 'hyperapp';

type FormInputEvent = {
    target: HTMLTextAreaElement;
};

type Viewer = {
    name: string,
}

type Message = {
    user: string,
    message: string,
}

type RoomState = {
    stopped?: null,
    paused?: [string, number],
    playing?: [string, number],
}

type Room = {
    name: string,
    title: string,
	state: RoomState,
    admins: Array<string>,
    viewers: Array<Viewer>,
	chat: Array<Message>,
    movie: string | null,
}

type Settings = {
    sound: boolean,
}

interface Dictionary<T> {
    [Key: string]: T;
}

type State = {
    conn: {
        user: string,
        room: string,
        sess: string,
    },
    movies: Array<string>,
    rooms: Dictionary<string>,
    error: string,
    room: Room,
    ws_errors: number,
    loading: string,
    settings: Settings,
    fullscreen: boolean,
    manual_entry: boolean,
}