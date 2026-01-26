import Hls from 'hls.js';

const DEBUG = false;

export class HLSVideoElement extends HTMLElement {
    static observedAttributes = ['src', 'poster', 'plays-inline', 'preload', 'controls'];
    hls: Hls | null = null;
    video: HTMLVideoElement;

    constructor() {
        super();
        this.video = document.createElement('video');
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;
        // console.log(name, oldValue, newValue);

        if (name === 'src') {
            if (this.hls) {
                this.hls.destroy();
                this.hls = null;
            }

            if (Hls.isSupported() && newValue.endsWith('.m3u8')) {
                this.hls = new Hls({});
                this.hls.on(Hls.Events.ERROR, (_event, data) => {
                    console.error('[hls] error: ', data);
                });
                if (DEBUG) {
                    for (const eventName of Object.values(Hls.Events)) {
                        this.hls.on(eventName, (event: any, data: any) => {
                            if (
                                event === Hls.Events.FRAG_LOADING ||
                                event === Hls.Events.BUFFER_APPENDING ||
                                event === Hls.Events.BUFFER_APPENDED ||
                                event === Hls.Events.FRAG_BUFFERED ||
                                event === Hls.Events.FRAG_PARSED ||
                                event === Hls.Events.FRAG_LOADED ||
                                event === Hls.Events.FRAG_CHANGED ||
                                event === Hls.Events.LEVEL_PTS_UPDATED ||
                                event === Hls.Events.BUFFER_EOS
                            ) {
                                return;
                            }
                            // Uncomment the next line to see all HLS.js events
                            console.log('[hls]', event, data);
                        });
                    }
                }
                this.hls.loadSource(newValue);
                this.hls.attachMedia(this.video);
            } else {
                this.video.src = newValue;
            }
        } else if (name === 'poster') {
            this.video.poster = newValue;
        } else if (name === 'plays-inline') {
            this.video.playsInline = newValue === 'true';
        } else if (name === 'preload') {
            if (newValue === 'none' || newValue === 'metadata' || newValue === 'auto') {
                this.video.preload = newValue;
            }
        } else if (name === 'controls') {
            this.video.controls = newValue === 'true';
        }
    }

    connectedCallback() {
        // Copy child elements (like <track>)
        while (this.firstChild) {
            this.video.appendChild(this.firstChild);
        }
        this.appendChild(this.video);
    }

    disconnectedCallback() {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
    }

    // Expose the video element for React refs
    getVideoElement(): HTMLVideoElement {
        return this.video;
    }
}

declare global {
    namespace JSX {
        interface IntrinsicElements {
            'hls-video': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                src: string;
                poster: string;
                'plays-inline': string;
                preload: string;
                controls: string;
            };
        }
    }
}
