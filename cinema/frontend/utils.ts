/**
 * @param folder eg 'My Series'
 * @param title eg 'My Series - S01E01 - Pilot.mkv'
 * @returns eg 'S01E01 - Pilot.mkv'
 */
export function minititle(folder: string, title: string): string {
    if (folder === "") {
        return title;
    }
    if (title.toLocaleLowerCase().startsWith(folder.toLocaleLowerCase())) {
        title = title.slice(folder.length);
    }
    title = title.replace(/^[-_ .]+/, "");
    return title;
}
