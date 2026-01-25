import SimpleMarkdown, { type ReactRules } from '@khanacademy/simple-markdown';
import Picker from 'emoji-picker-react';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types';

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

function CustomSpoiler({ children }: { children: any }) {
    const [show, setShow] = useState(false);
    return (
        <span
            className={`spoiler ${show ? 'show' : ''}`}
            onClick={() => setShow(!show)}
            onKeyDown={(e) => {
                if (e.key === 'Space') {
                    setShow(!show);
                }
            }}
        >
            {children}
        </span>
    );
}

// @ts-expect-error - I'm not sure what type this is supposed to be,
// some combination of ParserRules and OutputRules<ReactRule> ?
const rules: ReactRules = {
    ...SimpleMarkdown.defaultRules,
    user: {
        order: 1, // ???
        match: (source, _state, _lookbehind) => /^(@[a-zA-Z0-9]+)/.exec(source),
        parse: (capture, _recurseParse, _state) => ({ content: capture[1] }),
        react: (node, _recurseOutput) => (
            <span style={{ color: name2color(node.content.substring(1)) }}>{node.content}</span>
        ),
    },
    spoiler: {
        order: 1, // ???
        match: (source, _state, _lookbehind) => /^\|\|([^|]+)\|\|/.exec(source),
        parse: (capture, recurseParse, state) => ({ content: recurseParse(capture[1], state) }),
        react: (node, recurseOutput) => <CustomSpoiler>{recurseOutput(node.content)}</CustomSpoiler>,
    },
};
const parser = SimpleMarkdown.parserFor(rules);
const reactOutput = SimpleMarkdown.outputFor(rules, 'react');
function md(source: string) {
    const parseTree = parser(source, { inline: true });
    const outputResult = reactOutput(parseTree);
    return outputResult;
}

export function Chat({ log, onSend }: { log: Array<ChatMessage>; onSend: (text: string) => void }) {
    return (
        <div className="chat">
            <ChatLog log={log} />
            <ChatInput onSend={onSend} users={[]} />
        </div>
    );
}

export function ChatLog({ log }: { log: Array<ChatMessage> }) {
    const logBox = useRef<HTMLDivElement>(null);

    // we really *do* want to run this every time `log` changes, even though
    // the code "doesn't depend on log" (logBox.scrollHeight *does* depend on
    // log)
    // biome-ignore lint/correctness/useExhaustiveDependencies: see above
    useEffect(() => {
        if (logBox.current === null) return;
        logBox.current.scrollTop = logBox.current.scrollHeight;
    }, [log]);

    return (
        <div className="chat_log" ref={logBox}>
            <ul>
                {log.map((p) => (
                    <li key={p.absolute_timestamp} className={p.user === 'system' ? 'system' : 'user'}>
                        <span className="absolute_timestamp">{absolute_timestamp(p.absolute_timestamp)}</span>
                        <span className="user" style={{ color: name2color(p.user) }}>
                            {p.user}
                        </span>
                        <span className="message">{md(p.message)}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/**
 * A generic instant-messenger style chat input box.
 *
 * TODO list:
 *   * Preview-rendered basic markdown (*bold* and _italic_ rendered as such)
 *   * Emoji autocompletion with ":"
 *   * Username autocompletion with "@"
 *
 * Params:
 *   * `onSend` is a callback that is called when the user hits enter.
 *   * `users` is a list of usernames to use for autocompletion.
 *
 * biome-ignore lint/correctness/noUnusedFunctionParameters: users will be used later
 */
export function ChatInput({ onSend, users = [] }: { onSend: (text: string) => void; users: string[] }) {
    const chatInput = useRef<HTMLInputElement>(null);
    const pickerButton = useRef<HTMLButtonElement>(null);
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
                        position: 'absolute',
                        bottom:
                            document.getElementsByTagName('main')[0].offsetHeight -
                            (pickerButton.current?.offsetTop || 0),
                        right: 0,
                    }}
                >
                    <Picker onEmojiClick={onEmojiClick} previewConfig={{ showPreview: false }} />
                </div>
            )}
        </form>
    );
}
