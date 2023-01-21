import h from "hyperapp-jsx-pragma";

import { WebSocketCommand } from "./room";

export const SettingsMenu = ({
    state,
    admin,
}: {
    state: State;
    admin: boolean;
}): VNode => (
    <div class={"settings"}>
        <div>
            <h2
                onclick={function (state: State): State {
                    console.log(state);
                    (window as any).state = state;
                    return state;
                }}
            >
                Settings
            </h2>
            <form
                onsubmit={function (
                    state: State,
                    event: SubmitEvent,
                ): Dispatchable {
                    event.preventDefault();
                    return [
                        {
                            ...state,
                            show_settings: false,
                            room: {
                                ...state.room,
                                title: state.title_edit,
                            },
                            //root: state.root_edit,
                            //room_name: state.room_name_edit.toLowerCase().trim(),
                            //room_password: state.room_password_edit,
                        },
                        WebSocketCommand(state, {
                            title: state.title_edit,
                        }),
                        WebSocketCommand(state, { public: state.room.public }),
                    ];
                }}
            >
                <table>
                    {admin && (
                        <tbody>
                            <tr>
                                <th colspan="2">Room</th>
                            </tr>
                            <tr>
                                <td>Code</td>
                                <td>
                                    <input
                                        value={state.room.name}
                                        disabled={true}
                                        type={"text"}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>Title</td>
                                <td>
                                    <input
                                        value={state.title_edit}
                                        type={"text"}
                                        oninput={(
                                            state: State,
                                            event: FormInputEvent,
                                        ): State => ({
                                            ...state,
                                            title_edit: event.target.value,
                                        })}
                                        disabled={!admin}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>Public</td>
                                <td>
                                    <input
                                        checked={state.room.public}
                                        type={"checkbox"}
                                        oninput={(state: State): State => ({
                                            ...state,
                                            room: {
                                                ...state.room,
                                                public: !state.room.public,
                                            },
                                        })}
                                        disabled={!admin}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    )}
                    <tbody>
                        {admin && (
                            <tr>
                                <th colspan="2">Viewer</th>
                            </tr>
                        )}
                        {!admin && (
                            <tr>
                                <td>Show Chat</td>
                                <td>
                                    <input
                                        checked={state.show_chat}
                                        type={"checkbox"}
                                        onchange={function (
                                            state: State,
                                            event: FormInputEvent,
                                        ): State {
                                            return {
                                                ...state,
                                                show_chat: !state.show_chat,
                                            };
                                        }}
                                    />
                                </td>
                            </tr>
                        )}
                        {document.body.requestFullscreen && (
                            <tr>
                                <td>Fullscreen</td>
                                <td>
                                    <input
                                        checked={state.fullscreen}
                                        type={"checkbox"}
                                        onchange={function (
                                            state: State,
                                            event: FormInputEvent,
                                        ): State {
                                            if (state.fullscreen) {
                                                document.exitFullscreen();
                                            } else {
                                                document.body.requestFullscreen();
                                            }
                                            return {
                                                ...state,
                                                fullscreen: !state.fullscreen,
                                            };
                                        }}
                                    />
                                </td>
                            </tr>
                        )}
                        <tr>
                            <td>Show Subtitles</td>
                            <td>
                                <input
                                    checked={state.show_subs}
                                    type={"checkbox"}
                                    onchange={function (
                                        state: State,
                                        event: FormInputEvent,
                                    ): State {
                                        return {
                                            ...state,
                                            show_subs: !state.show_subs,
                                        };
                                    }}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                Show System
                                <br />
                                Messages
                            </td>
                            <td>
                                <input
                                    checked={state.show_system}
                                    type={"checkbox"}
                                    onchange={function (
                                        state: State,
                                        event: FormInputEvent,
                                    ): State {
                                        return {
                                            ...state,
                                            show_system: !state.show_system,
                                        };
                                    }}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td colspan={2}>
                                <button>Close</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </form>
        </div>
    </div>
);
