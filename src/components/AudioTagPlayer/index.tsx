
import React, { useState, useRef } from "react";

const AudioPlayer: React.FC = () => {
    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file); // Конвертируем в base64

        reader.onload = () => {
            setAudioSrc(reader.result as string); // Сохраняем base64 в state
        };
    };

    const playAudio = () => {
        if (audioRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const pauseAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    const restartAudio = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    return (
        <div>
            <input type="file" accept="audio/*" onChange={handleFileChange} />
            {audioSrc && (
                <div>
                    <audio ref={audioRef} src={audioSrc} />
                    <div>
                        <button onClick={playAudio} disabled={isPlaying}>▶ Play</button>
                        <button onClick={pauseAudio} disabled={!isPlaying}>⏸ Pause</button>
                        <button onClick={restartAudio}>⏪ Restart</button>
                    </div>
                </div>
            )}
        </div>
    );
}


export default AudioPlayer;
