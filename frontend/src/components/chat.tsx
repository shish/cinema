import { useContext, useEffect, useRef, useState } from 'react';
import Picker from 'emoji-picker-react';

import { SettingsContext } from '../providers/settings';

function absolute_timestamp(ts: number): string {
    function convertUTCDateToLocalDate(date: Date) {
        const newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);

        const offset = date.getTimezoneOffset() / 60;
        const hours = date.getHours();

        newDate.setHours(hours - offset);

        return newDate;
    }
    return convertUTCDateToLocalDate(new Date(ts * 1e3))
        .toISOString()
        .slice(-13, -8);
}

function name2color(name: string): string {
    const hash = name
        .split(/[^a-zA-Z0-9]/)[0]
        .toLowerCase()
        .split('')
        .reduce((prevHash, currVal) => ((prevHash << 5) - prevHash + currVal.charCodeAt(0)) | 0, 0);
    const b1 = 0x77 + (hash & 0xff) / 2;
    const b2 = 0x77 + ((hash >> 8) & 0xff) / 2;
    const b3 = 0x77 + ((hash >> 16) & 0xff) / 2;
    return `rgb(${b1}, ${b2}, ${b3})`;
}

function addAts(message: string) {
    return (
        message
            .split(/(@[a-zA-Z0-9]+)/)
            // biome-ignore lint/correctness/useJsxKeyInIterable: there is no key, and the list doesn't change
            .map((x) => (x.startsWith('@') ? <span style={{ color: name2color(x.substring(1)) }}>{x}</span> : x))
    );
}

export function Chat({
    log,
    send,
}: {
    log: Array<ChatMessage>;
    send: (data: any) => void;
}) {
    const { showSystem } = useContext(SettingsContext);

    // we really do want to run this every time the chat changes, even though
    // the code "doesn't depend on log" (chat_log.scrollHeight does depend on
    // log)
    // biome-ignore lint/correctness/useExhaustiveDependencies:
    useEffect(() => {
        const chat_log = document.getElementById('chat_log');
        if (chat_log) {
            chat_log.scrollTop = chat_log.scrollHeight;
        }
    }, [log]);

    // FIXME markdown support
    return (
        <div className="chat">
            <div className="chat_log" id="chat_log">
                <ul>
                    {log
                        .filter((p) => showSystem || p.user !== 'system')
                        .map((p) => (
                            <li key={p.absolute_timestamp} className={p.user === 'system' ? 'system' : 'user'}>
                                <span className="absolute_timestamp">{absolute_timestamp(p.absolute_timestamp)}</span>
                                <span className="user" style={{ color: name2color(p.user) }}>{p.user}</span>
                                <span className="message">{addAts(p.message)}</span>
                            </li>
                        ))}
                </ul>
            </div>
            <ChatInput
                onSend={(text) => {
                    send({ chat: text });
                }}
                users={[]}
            />
        </div>
    );
}

/**
 * A generic instant-messenger style chat input box.
 * 
 * TODO list:
 *   * Preview-rendered basic markdown (*bold* and _italic_ rendered as such)
 *   * Emoji selector button
 *   * Emoji autocompletion with ":"
 *   * Username autocompletion with "@"
 * 
 * Params:
 *   * `onSend` is a callback that is called when the user hits enter.
 *   * `users` is a list of usernames to use for autocompletion.
 * 
 */
export function ChatInput({
    onSend,
    users = [],
}: {
    onSend: (text: string) => void,
    users: string[],
}) {
    const chatInput = useRef<HTMLInputElement>(null);
    const pickerButton = useRef<HTMLButtonElement>(null);
    const [cursorPos, setCursorPos] = useState(0);
    const [input, setInput] = useState<string>('');
    const [showPicker, setShowPicker] = useState(false);
    const [mouses, setMouses] = useState(0);
    const emojis = ['😃', '😁', '😀', '🥰', '😂'];

    const onEmojiClick = (emojiObject: any) => {
        // FIXME: insert emoji at cursor
        setInput((prevInput) => prevInput + emojiObject.emoji);
        setShowPicker(false);
        // FIXME: return cursor to where it was before emoji button was clicked
        chatInput.current?.focus();
    };

    return (
        <form
            className="chat_input"
            onSubmit={(e) => {
                e.preventDefault();
                onSend(input);
                setInput('');
            }}
        >
            <input
                ref={chatInput}
                id="chat_input"
                autoComplete={'off'}
                enterKeyHint={'send'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type to chat"
            />
            <button
                ref={pickerButton}
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                onMouseEnter={() => setMouses(mouses + 1)}
                onMouseLeave={() => setMouses(mouses + 1)}
            >
                &nbsp;{emojis[mouses % emojis.length]}&nbsp;
            </button>
            {showPicker && (
                <div
                    className="emoji-picker"
                    style={{
                        position: "absolute",
                        bottom: document.getElementsByTagName("main")[0].offsetHeight - (pickerButton.current?.offsetTop || 0),
                        right: 0,
                    }}
                >
                    <Picker onEmojiClick={onEmojiClick} previewConfig={{ showPreview: false }} />
                </div>
            )}
        </form>
    );
}
