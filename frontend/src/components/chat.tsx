import SimpleMarkdown, { type ReactRules } from '@khanacademy/simple-markdown';
import emojilib from 'emojilib';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types';
import './chat.scss';

// Build emoji keyword-to-emoji mapping from emojilib
// emojilib format: { "😀": ["keyword1", "keyword2", ...], ... }
// We want: { "keyword1": "😀", "keyword2": "😀", ... }
// Prioritize emojis where the keyword is the primary (first) keyword
const EMOJI_MAP: { [key: string]: string } = {};
for (const [emoji, keywords] of Object.entries(emojilib)) {
    for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i];
        // If no emoji for this keyword yet, or this is a primary keyword, use it
        if (!EMOJI_MAP[keyword] || i === 0) {
            EMOJI_MAP[keyword] = emoji;
        }
    }
}

interface AutocompleteItem {
    text: string;
    display: string;
    description?: string;
}

export interface Command {
    name: string;
    description: string;
}

/**
 * Filter items by query, prioritizing items that start with the query over items that contain it.
 */
function filterWithPriority<T>(
    items: T[],
    query: string,
    getText: (item: T) => string,
    limit: number = 5,
): T[] {
    if (query) {
        const lowerQuery = query.toLowerCase();
        const startsWithMatches: T[] = [];
        const containsMatches: T[] = [];

        for (const item of items) {
            const text = getText(item).toLowerCase();
            if (text.startsWith(lowerQuery)) {
                startsWithMatches.push(item);
                if (startsWithMatches.length >= limit) break;
            } else if (text.includes(lowerQuery)) {
                containsMatches.push(item);
            }
        }

        items = [...startsWithMatches, ...containsMatches];
    }
    return items.slice(0, limit);
}

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
    // Alphanumeric only so that eg @bob? and @bob! have same color
    name = name.split(/[^a-zA-Z0-9]/)[0].toLowerCase();

    // Use a hash that distributes colors more evenly
    // Multiply by prime and position to spread out similar names
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    }

    // Rather than mapping hash to hue directly, map it to a number
    // of spins around the colour wheel (for better distribution)
    const spins = 0.61803 * 360;
    const hue = Math.abs(hash * spins) % 360;

    return `hsl(${hue}, 60%, 65%)`;
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
            <span key={node.content} style={{ color: name2color(node.content.substring(1)) }}>{node.content}</span>
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

function Markdown({ source }: { source: string }) {
    const parseTree = parser(source, { inline: true });
    return reactOutput(parseTree);
}

export function Chat({
    log,
    onSend,
    users,
    commands,
}: {
    log: Array<ChatMessage>;
    onSend: (text: string) => void,
    users?: string[];
    commands?: Command[];
}) {
    return (
        <div className="chat_component">
            <ChatLog log={log} />
            <ChatInput onSend={onSend} users={users ?? []} commands={commands ?? []} />
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
        <div className="log" ref={logBox}>
            <ul>
                {log.map((p, n) => (
                    <li key={n} className={p.type}>
                        <span className="absolute_timestamp">{absolute_timestamp(p.absolute_timestamp)}</span>
                        <span className="user" style={{ color: name2color(p.user) }}>
                            {p.user}
                        </span>
                        <span className="message"><Markdown source={p.message} /></span>
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
 *
 * Params:
 *   * `onSend` is a callback that is called when the user hits enter.
 *   * `users` is a list of usernames to use for autocompletion.
 */
export function ChatInput({ onSend, users = [], commands = [] }: { onSend: (text: string) => void; users: string[]; commands: Command[] }) {
    const chatInput = useRef<HTMLTextAreaElement>(null);
    const [input, setInput] = useState<string>('');

    // Auto-resize textarea based on content
    useEffect(() => {
        if (chatInput.current) {
            chatInput.current.style.height = 'auto';
            chatInput.current.style.height = `${chatInput.current.scrollHeight}px`;
        }
    }, [input]);

    // Autocomplete state
    const [autocomplete, setAutocomplete] = useState<{
        show: boolean;
        items: AutocompleteItem[];
        selectedIndex: number;
        type: 'command' | 'emoji' | 'user' | null;
        startPos: number;
        query: string;
    }>({
        show: false,
        items: [],
        selectedIndex: 0,
        type: null,
        startPos: 0,
        query: '',
    });

    // Insert text at cursor position (or replace a range if startPos is provided)
    const insertTextAtCursor = (text: string, options?: { startPos?: number; addSpaceAfter?: boolean }) => {
        const cursorPos = chatInput.current?.selectionStart || 0;
        const startPos = options?.startPos ?? cursorPos;
        const addSpaceAfter = options?.addSpaceAfter ?? false;

        const before = input.substring(0, startPos);
        const after = input.substring(cursorPos);
        const textToInsert = addSpaceAfter ? text + ' ' : text;
        const newInput = before + textToInsert + after;
        setInput(newInput);

        // Set cursor position after insertion
        setTimeout(() => {
            const newCursorPos = before.length + textToInsert.length;
            chatInput.current?.setSelectionRange(newCursorPos, newCursorPos);
            chatInput.current?.focus();
        }, 0);
    };

    // Update autocomplete suggestions based on input
    useEffect(() => {
        const cursorPos = chatInput.current?.selectionStart || 0;
        const textBeforeCursor = input.substring(0, cursorPos);

        // Check for command autocomplete (/ at start of message)
        if (textBeforeCursor.startsWith('/') && !textBeforeCursor.includes(' ')) {
            const query = textBeforeCursor.substring(1);
            const filtered = filterWithPriority(
                commands,
                query,
                cmd => cmd.name.substring(1)
            );
            const matches = filtered.map(cmd => ({
                text: cmd.name,
                display: cmd.name,
                description: cmd.description,
            }));

            setAutocomplete(prev => {
                // Only reset selectedIndex if the type changed or items changed
                const itemsChanged = JSON.stringify(prev.items) !== JSON.stringify(matches);
                const typeChanged = prev.type !== 'command';
                return {
                    show: matches.length > 0,
                    items: matches,
                    selectedIndex: (itemsChanged || typeChanged) ? 0 : Math.min(prev.selectedIndex, matches.length - 1),
                    type: 'command',
                    startPos: 0,
                    query,
                };
            });
            return;
        }

        // Check for emoji autocomplete (: after space or at start)
        const emojiMatch = textBeforeCursor.match(/(^|[\s]):([a-z0-9]*)$/);
        if (emojiMatch) {
            const query = emojiMatch[2];
            const startPos = emojiMatch.index! + emojiMatch[1].length;
            const filtered = filterWithPriority(
                Object.entries(EMOJI_MAP),
                query,
                ([name]) => name
            );
            const matches = filtered.map(([name, emoji]) => ({
                text: emoji,
                display: name,
                description: emoji,
            }));

            setAutocomplete(prev => {
                // Only reset selectedIndex if the type changed or items changed
                const itemsChanged = JSON.stringify(prev.items) !== JSON.stringify(matches);
                const typeChanged = prev.type !== 'emoji';
                return {
                    show: matches.length > 0,
                    items: matches,
                    selectedIndex: (itemsChanged || typeChanged) ? 0 : Math.min(prev.selectedIndex, matches.length - 1),
                    type: 'emoji',
                    startPos,
                    query,
                };
            });
            return;
        }

        // Check for user autocomplete (@ after space or at start)
        const userMatch = textBeforeCursor.match(/(^|[\s])@([\w]*)$/);
        if (userMatch && users.length > 0) {
            const query = userMatch[2];
            const startPos = userMatch.index! + userMatch[1].length;
            const filtered = filterWithPriority(
                users,
                query,
                user => user
            );
            const matches = filtered.map(user => ({
                text: `@${user}`,
                display: `@${user}`,
                description: undefined,
            }));

            setAutocomplete(prev => {
                // Only reset selectedIndex if the type changed or items changed
                const itemsChanged = JSON.stringify(prev.items) !== JSON.stringify(matches);
                const typeChanged = prev.type !== 'user';
                return {
                    show: matches.length > 0,
                    items: matches,
                    selectedIndex: (itemsChanged || typeChanged) ? 0 : Math.min(prev.selectedIndex, matches.length - 1),
                    type: 'user',
                    startPos,
                    query,
                };
            });
            return;
        }

        // No autocomplete
        setAutocomplete({
            show: false,
            items: [],
            selectedIndex: 0,
            type: null,
            startPos: 0,
            query: '',
        });
    }, [input, users, commands]);

    // Handle autocomplete selection
    const completeAutocomplete = (item?: AutocompleteItem) => {
        if (!autocomplete.show) return false;

        const selectedItem = item || autocomplete.items[autocomplete.selectedIndex];
        if (!selectedItem) return false;

        // Use insertTextAtCursor to replace from startPos to cursor with the selected item
        insertTextAtCursor(selectedItem.text, {
            startPos: autocomplete.startPos,
            addSpaceAfter: true
        });

        // Reset autocomplete
        setAutocomplete({
            show: false,
            items: [],
            selectedIndex: 0,
            type: null,
            startPos: 0,
            query: '',
        });

        return true;
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Handle Enter key for sending (unless Shift is held or autocomplete is showing)
        if (e.key === 'Enter' && !e.shiftKey) {
            if (autocomplete.show) {
                if (completeAutocomplete()) {
                    e.preventDefault();
                }
                return;
            }
            // Send the message
            e.preventDefault();
            if (input.trim()) {
                onSend(input);
                setInput('');
            }
            return;
        }

        if (!autocomplete.show) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setAutocomplete(prev => ({
                ...prev,
                selectedIndex: (prev.selectedIndex + 1) % prev.items.length,
            }));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setAutocomplete(prev => ({
                ...prev,
                selectedIndex: prev.selectedIndex === 0 ? prev.items.length - 1 : prev.selectedIndex - 1,
            }));
        } else if (e.key === 'Tab') {
            if (completeAutocomplete()) {
                e.preventDefault();
            }
        } else if (e.key === 'Escape') {
            setAutocomplete(prev => ({ ...prev, show: false }));
        }
    };

    return (
        <form
            className="input"
            onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) {
                    onSend(input);
                    setInput('');
                }
            }}
        >
            {autocomplete.show && (
                <div className="autocomplete-menu">
                    {autocomplete.items.map((item, index) => (
                        <div
                            key={item.display}
                            className={`autocomplete-item ${index === autocomplete.selectedIndex ? 'selected' : ''}`}
                            onClick={() => completeAutocomplete(item)}
                            onMouseEnter={() => setAutocomplete(prev => ({ ...prev, selectedIndex: index }))}
                        >
                            <span
                                className="autocomplete-text"
                                style={autocomplete.type === 'user' ? { color: name2color(item.display.substring(1)) } : undefined}
                            >
                                {item.display}
                            </span>
                            {item.description && (
                                <span className="autocomplete-description">{item.description}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <textarea
                ref={chatInput}
                id="chat_input"
                autoComplete={'off'}
                enterKeyHint={'send'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type to chat"
                rows={1}
            />
            <button
                type="button"
                onClick={() => {
                    // Insert space and colon to trigger emoji autocomplete
                    const needsSpace = input.length > 0 && !input.endsWith(' ');
                    insertTextAtCursor(needsSpace ? ' :' : ':');
                }}
            >
                😃
            </button>
        </form>
    );
}
