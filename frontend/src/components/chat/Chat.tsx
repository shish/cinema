import SimpleMarkdown, { type ReactRules } from '@khanacademy/simple-markdown';
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react';
import emojilib from 'emojilib';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../../types';
import css from './Chat.module.scss';
import { Username } from '../user/Username';

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

export interface CommandDef {
    description: string;
    handler: (text: string) => void;
}

export type Commands = Record<string, CommandDef>;

/**
 * Filter items by query, prioritizing items that start with the query over items that contain it.
 */
function filterWithPriority<T>(items: T[], query: string, getText: (item: T) => string, limit: number = 5): T[] {
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

// Module-level variable to store users for markdown parser
let markdownUsers: string[] = [];

function CustomSpoiler({ children }: { children: any }) {
    const [show, setShow] = useState(false);
    return (
        <span
            className={`${css.spoiler} ${show ? css.show : ''}`}
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
            <Username key={node.content} name={node.content} currentUsers={markdownUsers} />
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

export function Chat({ log, users, commands }: { log: Array<ChatMessage>; users?: string[]; commands: Commands }) {
    return (
        <div className={css.chat} id="chat">
            <ChatLog log={log} users={users ?? []} />
            <ChatInput users={users ?? []} commands={commands} />
        </div>
    );
}

export function ChatLog({ log, users }: { log: Array<ChatMessage>; users: string[] }) {
    const logBox = useRef<HTMLDivElement>(null);

    // Update markdown users for color rendering
    useEffect(() => {
        markdownUsers = users;
    }, [users]);

    // we really *do* want to run this every time `log` changes, even though
    // the code "doesn't depend on log" (logBox.scrollHeight *does* depend on
    // log)
    // biome-ignore lint/correctness/useExhaustiveDependencies: see above
    useEffect(() => {
        if (logBox.current === null) return;
        logBox.current.scrollTop = logBox.current.scrollHeight;
    }, [log]);

    return (
        <div className={css.log} ref={logBox}>
            <ul>
                {log.map((p, n) => (
                    // Using index as key is usually bad, but here we assume log entries
                    // are immutable and only ever appended to, so it should be fine
                    // biome-ignore lint/suspicious/noArrayIndexKey: see above
                    <li key={n} className={p.type}>
                        <span className={css.timestamp}>{absolute_timestamp(p.absolute_timestamp)}</span>
                        <span className={css.user}>
                            <Username name={p.user} currentUsers={users} />
                        </span>
                        <span className={css.message}>
                            <Markdown source={p.message} />
                        </span>
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
export function ChatInput({ users = [], commands }: { users: string[]; commands: Commands }) {
    const chatInput = useRef<HTMLTextAreaElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const [input, setInput] = useState<string>('');
    const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

    // Close emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };

        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);

    // Auto-resize textarea based on content
    // This doesn't use `input` itself, but chatInput.current.scrollHeight changes
    // when `input` changes, so we need to run this effect whenever `input` changes
    // biome-ignore lint/correctness/useExhaustiveDependencies: see above
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
        const textToInsert = addSpaceAfter ? `${text} ` : text;
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
            // Filter out the default command (empty string key) from autocomplete
            const commandEntries = Object.entries(commands)
                .filter(([name]) => name !== '')
                .map(([name, def]) => ({ name, ...def }));
            const filtered = filterWithPriority(commandEntries, query, (cmd) => cmd.name.substring(1));
            const matches = filtered.map((cmd) => ({
                text: cmd.name,
                display: cmd.name,
                description: cmd.description,
            }));

            setAutocomplete((prev) => {
                // Only reset selectedIndex if the type changed or items changed
                const itemsChanged = JSON.stringify(prev.items) !== JSON.stringify(matches);
                const typeChanged = prev.type !== 'command';
                return {
                    show: matches.length > 0,
                    items: matches,
                    selectedIndex: itemsChanged || typeChanged ? 0 : Math.min(prev.selectedIndex, matches.length - 1),
                    type: 'command',
                    startPos: 0,
                    query,
                };
            });
            return;
        }

        // Check for emoji autocomplete (: after space or at start)
        const emojiMatch = textBeforeCursor.match(/(^|[\s]):([a-z0-9]{2,})$/);
        if (emojiMatch) {
            const query = emojiMatch[2];
            const startPos = emojiMatch.index! + emojiMatch[1].length;
            const filtered = filterWithPriority(Object.entries(EMOJI_MAP), query, ([name]) => name);
            const matches = filtered.map(([name, emoji]) => ({
                text: emoji,
                display: name,
                description: emoji,
            }));

            setAutocomplete((prev) => {
                // Only reset selectedIndex if the type changed or items changed
                const itemsChanged = JSON.stringify(prev.items) !== JSON.stringify(matches);
                const typeChanged = prev.type !== 'emoji';
                return {
                    show: matches.length > 0,
                    items: matches,
                    selectedIndex: itemsChanged || typeChanged ? 0 : Math.min(prev.selectedIndex, matches.length - 1),
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
            const filtered = filterWithPriority(users, query, (user) => user);
            const matches = filtered.map((user) => ({
                text: `@${user}`,
                display: `@${user}`,
                description: undefined,
            }));

            setAutocomplete((prev) => {
                // Only reset selectedIndex if the type changed or items changed
                const itemsChanged = JSON.stringify(prev.items) !== JSON.stringify(matches);
                const typeChanged = prev.type !== 'user';
                return {
                    show: matches.length > 0,
                    items: matches,
                    selectedIndex: itemsChanged || typeChanged ? 0 : Math.min(prev.selectedIndex, matches.length - 1),
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
            addSpaceAfter: true,
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
    const onEmojiClick = (emojiData: EmojiClickData) => {
        insertTextAtCursor(emojiData.emoji);
        setShowEmojiPicker(false);
        chatInput.current?.focus();
    };

    const handleSend = (text: string) => {
        text = text.trim();

        if (!text) return;

        // Check if text matches a command
        const firstWord = text.split(/\s+/)[0];
        if (firstWord in commands) {
            // Command found, extract the remainder and call its handler
            const remainder = text.substring(firstWord.length).trimStart();
            commands[firstWord].handler(remainder);
            return;
        }

        // No command matched, use default command (empty string key)
        if ('' in commands) {
            commands[''].handler(text);
        }
    };

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
                handleSend(input);
                setInput('');
            }
            return;
        }

        if (!autocomplete.show) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setAutocomplete((prev) => ({
                ...prev,
                selectedIndex: (prev.selectedIndex + 1) % prev.items.length,
            }));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setAutocomplete((prev) => ({
                ...prev,
                selectedIndex: prev.selectedIndex === 0 ? prev.items.length - 1 : prev.selectedIndex - 1,
            }));
        } else if (e.key === 'Tab') {
            if (completeAutocomplete()) {
                e.preventDefault();
            }
        } else if (e.key === 'Escape') {
            setAutocomplete((prev) => ({ ...prev, show: false }));
        }
    };

    return (
        <form
            className={css.input}
            onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) {
                    handleSend(input);
                    setInput('');
                }
            }}
        >
            {autocomplete.show && (
                <div className={css.autocomplete_menu}>
                    {autocomplete.items.map((item, index) => (
                        <div
                            key={item.display}
                            className={`${css.autocomplete_item} ${index === autocomplete.selectedIndex ? css.selected : ''}`}
                            onClick={() => completeAutocomplete(item)}
                            onMouseEnter={() => setAutocomplete((prev) => ({ ...prev, selectedIndex: index }))}
                        >
                            <span className={css.autocomplete_text}>
                                {autocomplete.type === 'user' ? (
                                    <Username name={item.display} currentUsers={users} />
                                ) : (
                                    item.display
                                )}
                            </span>
                            {item.description && (
                                <span className={css.autocomplete_description}>{item.description}</span>
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
            <div style={{ position: 'relative' }} ref={emojiPickerRef}>
                {showEmojiPicker && (
                    <div style={{ position: 'absolute', bottom: '100%', right: 0, zIndex: 1000 }}>
                        <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            theme={Theme.DARK}
                            previewConfig={{ showPreview: false }}
                        />
                    </div>
                )}
                <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                    😃
                </button>
            </div>
        </form>
    );
}
