import Drawer from './Drawer';

class SoundDriver {
    private audioFile: Blob;
    private drawer?: Drawer;
    private context: AudioContext;
    private gainNode?: GainNode;
    private audioBuffer?: AudioBuffer;
    private bufferSource?: AudioBufferSourceNode;
    private startedAt = 0;
    public pausedAt = 0;
    private isRunning = false;
    private currentVolume: number;
    private cursorAnimationFrameId: number | null = null;

    constructor(audioFile: Blob, initialVolume: number = 1) {
        this.audioFile = audioFile;
        this.currentVolume = initialVolume;
        this.context = new AudioContext();
    }

    static showError(error: string) {
        console.error(error);
        return error;
    }

    public init(parent: HTMLElement | null) {
        return new Promise<void>((resolve, reject) => {
            if (!parent) {
                reject(new Error('Parent element not found!'));
                return;
            }
            const reader = new FileReader();
            reader.readAsArrayBuffer(this.audioFile);
            reader.onload = (event: ProgressEvent<FileReader>) =>
                this.loadSound(event).then((buffer) => {
                    this.audioBuffer = buffer;
                    this.drawer = new Drawer(buffer, parent);

                    // skip through drag
                    this.drawer.onSeek = (newTime: number) => {
                        if (this.isRunning) {
                            this.pause().then(() => {
                                this.pausedAt = newTime;
                                this.play();
                            });
                        } else {
                            this.pausedAt = newTime;
                            this.drawer?.updateCursor(newTime);
                        }
                    };
                    this.drawer.init();
                    resolve();
                });
            reader.onerror = reject;
        });
    }

    private loadSound(readerEvent: ProgressEvent<FileReader>) {
        if (!readerEvent?.target?.result) {
            throw new Error('Cannot read file!');
        }
        return this.context.decodeAudioData(readerEvent.target.result as ArrayBuffer);
    }

    public async play() {
        if (!this.audioBuffer) {
            throw new Error('Audio buffer does not exist! Please load the sound first.');
        }
        if (this.isRunning) return;

        this.gainNode = this.context.createGain();
        this.gainNode.gain.value = this.currentVolume;
        this.bufferSource = this.context.createBufferSource();
        this.bufferSource.buffer = this.audioBuffer;
        this.bufferSource.connect(this.gainNode);
        this.gainNode.connect(this.context.destination);

        await this.context.resume();
        this.bufferSource.start(0, this.pausedAt);
        this.startedAt = this.context.currentTime - this.pausedAt;
        this.pausedAt = 0;
        this.isRunning = true;
        this.startCursorUpdateLoop();

        this.bufferSource.onended = () => {
            this.stopCursorUpdateLoop();
            this.isRunning = false;
            if (this.drawer) {
                this.drawer.updateCursor(0);
            }
        };
    }

    public async pause(reset?: boolean) {
        if (!this.bufferSource || !this.gainNode) {
            throw new Error('BufferSource does not exist! Call play first.');
        }
        await this.context.suspend();
        this.pausedAt = reset ? 0 : this.context.currentTime - this.startedAt;
        this.bufferSource.stop();
        this.bufferSource.disconnect();
        this.gainNode.disconnect();
        this.isRunning = false;
        this.stopCursorUpdateLoop();
        if (this.drawer && reset) {
            this.drawer.updateCursor(0);
        }
    }

    public changeVolume(volume: number) {
        this.currentVolume = volume;
        if (this.gainNode) {
            this.gainNode.gain.value = volume;
        }
    }

    public drawChart() {
        this.drawer?.init();
    }

    private startCursorUpdateLoop() {
        const update = () => {
            if (this.isRunning && this.audioBuffer && this.drawer) {
                const currentTime = this.context.currentTime - this.startedAt;
                const clampedTime = Math.min(currentTime, this.audioBuffer.duration);
                this.drawer.updateCursor(clampedTime);
                this.cursorAnimationFrameId = requestAnimationFrame(update);
            }
        };
        this.cursorAnimationFrameId = requestAnimationFrame(update);
    }

    private stopCursorUpdateLoop() {
        if (this.cursorAnimationFrameId) {
            cancelAnimationFrame(this.cursorAnimationFrameId);
            this.cursorAnimationFrameId = null;
        }
    }
}

export default SoundDriver;
