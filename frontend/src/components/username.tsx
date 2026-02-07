import type { ReactNode } from 'react';

// Session-only user tracking - maps username to their color index
const allSeenUsers = new Map<string, number>();

function registerUser(cleanName: string): number {
    if (!allSeenUsers.has(cleanName)) {
        const nextIndex = allSeenUsers.size;
        allSeenUsers.set(cleanName, nextIndex);
    }
    return allSeenUsers.get(cleanName)!;
}

export function getUserColor(name: string, isActive: boolean = false): string {
    // We want all these to be treated the same:
    //  - Bob
    //  - @Bob
    //  - @Bob?
    //  - @boB!
    const cleanName = name.replace(/^[^a-zA-Z0-9]*|[^a-zA-Z0-9]*$/g, '').toLowerCase();
    const colorIndex = registerUser(cleanName);

    const hue = (colorIndex * 0.61803 * 360) % 360;
    const chroma = isActive ? 0.15 : 0.02;
    return `oklch(from var(--text) l ${chroma} ${hue})`;
}

interface UsernameProps {
    name: string;
    currentUsers?: string[];
    children?: ReactNode;
}

export function Username({ name, currentUsers = [] }: UsernameProps) {
    const cleanName = name.replace(/^[^a-zA-Z0-9]*|[^a-zA-Z0-9]*$/g, '').toLowerCase();
    const isActive = currentUsers.some((user) => user.split(/[^a-zA-Z0-9]/)[0].toLowerCase() === cleanName);
    const color = getUserColor(name, isActive);

    return <span style={{ color }}>{name}</span>;
}
