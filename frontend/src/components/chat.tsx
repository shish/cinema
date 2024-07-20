import { useContext, useEffect, useState } from 'react';
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
    const [input, setInput] = useState<string>('');

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

    return (
        <div className="chat">
            <div className="chat_log" id="chat_log">
                <ul>
                    {log
                        .filter((p) => showSystem || p.user !== 'system')
                        .map((p) => (
                            <li key={p.absolute_timestamp} className={p.user === 'system' ? 'system' : 'user'}>
                                <span className="absolute_timestamp">{absolute_timestamp(p.absolute_timestamp)}</span>
                                <span className="user" style={{ color: name2color(p.user) }}>
                                    {p.user}
                                </span>
                                <span className="message">{addAts(p.message)}</span>
                            </li>
                        ))}
                </ul>
            </div>
            <form
                className="chat_input"
                onSubmit={(e) => {
                    e.preventDefault();
                    send({ chat: input });
                    setInput('');
                }}
            >
                <input
                    id="chat_input"
                    autoComplete={'off'}
                    enterKeyHint={'send'}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type to chat"
                />
            </form>
        </div>
    );
}
