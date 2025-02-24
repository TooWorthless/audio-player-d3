import React, { useCallback, useState, useRef } from 'react';
import SoundDriver from './SoundDriver';
import {
    Box,
    Button,
    Slider,
    Typography,
    Paper,
    Tabs,
    Tab,
} from '@mui/material';

const Player: React.FC = () => {
    const soundController = useRef<SoundDriver | null>(null);
    const [loading, setLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [dropActive, setDropActive] = useState(false);
    const [fileName, setFileName] = useState<string>('');
    const [waveformType, setWaveformType] = useState<'bars' | 'smooth' | 'sharp'>('bars');

    const dropZoneRef = useRef<HTMLDivElement>(null);

    const handleFile = useCallback(
        async (file: File) => {
            if (!file || !file.type.includes('audio')) {
                alert('Invalid audio!');
                return;
            }
            setFileName(file.name);
            setLoading(true);

            if (soundController.current) {
                try {
                    await soundController.current.pause(true);
                } catch (err) {
                    console.error(err);
                }
            }
            const soundInstance = new SoundDriver(file, volume);
            try {
                const container = document.getElementById('waveContainer');
                await soundInstance.init(container);
                soundController.current = soundInstance;
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
                soundInstance.drawChart({ waveformType });
            }
        },
        [volume, waveformType]
    );

    const onDrop = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setDropActive(false);
            if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
                handleFile(event.dataTransfer.files[0]);
                event.dataTransfer.clearData();
            }
        },
        [handleFile]
    );

    const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDropActive(true);
    }, []);

    const onDragLeave = useCallback(() => {
        setDropActive(false);
    }, []);

    const togglePlayer = useCallback(
        (action: 'play' | 'pause' | 'stop') => async () => {
            if (!soundController.current) return;
            try {
                if (action === 'play') {
                    await soundController.current.play();
                    setIsPlaying(true);
                } else if (action === 'stop') {
                    await soundController.current.pause(true);
                    setIsPlaying(false);
                } else {
                    await soundController.current.pause();
                    setIsPlaying(false);
                }
            } catch (err) {
                console.error(err);
            }
        },
        []
    );

    const onVolumeChange = useCallback(
        (event: Event, newValue: number | number[]) => {
            const vol = Array.isArray(newValue) ? newValue[0] : newValue;
            setVolume(vol);
            soundController.current?.changeVolume(vol);
        },
        []
    );

    const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
        setWaveformType(newValue as 'bars' | 'smooth' | 'sharp');
        soundController.current?.drawChart({ waveformType: newValue });
    };

    return (
        <Box>
            <Paper
                elevation={dropActive ? 6 : 2}
                sx={{
                    p: 2,
                    mb: 2,
                    textAlign: 'center',
                    border: dropActive ? '2px dashed #1976d2' : '2px dashed transparent',
                    cursor: 'pointer',
                }}
                ref={dropZoneRef}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
            >
                <Typography variant="h6">
                    {loading ? 'Loading...' : 'Drag and drop file or choose'}
                </Typography>
                {!loading && (
                    <input
                        type="file"
                        accept="audio/*"
                        style={{ display: 'none' }}
                        id="audio-upload"
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                handleFile(e.target.files[0]);
                            }
                        }}
                    />
                )}
                {!loading && (
                    <label htmlFor="audio-upload">
                        <Button variant="contained" color="primary" component="span" sx={{ mt: 1 }}>
                            Select
                        </Button>
                    </label>
                )}
            </Paper>

            {fileName && (
                <Typography variant="subtitle1" align="center" sx={{ mb: 1 }}>
                    Current file: {fileName}
                </Typography>
            )}

            <Box id="waveContainer" sx={{ width: '100%', height: '150px', mb: 2, border: '1px solid #ccc' }} />

            {soundController.current && (
                <Paper elevation={3} sx={{ p: 2, textAlign: 'center' }}>
                    <Slider
                        value={volume}
                        onChange={onVolumeChange}
                        min={0}
                        max={1}
                        step={0.01}
                        aria-label="Volume"
                        sx={{ width: '50%', mx: 'auto', mb: 2 }}
                    />
                    
                    <Tabs
                        value={waveformType}
                        onChange={handleTabChange}
                        textColor="primary"
                        indicatorColor="primary"
                        centered
                        sx={{ mb: 2 }}
                    >
                        <Tab value="bars" label="Bars" />
                        <Tab value="smooth" label="Smooth" />
                        <Tab value="sharp" label="Sharp" />
                    </Tabs>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <Button variant="contained" color="primary" onClick={togglePlayer('play')}>
                            Play
                        </Button>
                        <Button variant="contained" color="secondary" onClick={togglePlayer('pause')}>
                            Pause
                        </Button>
                        <Button variant="contained" onClick={togglePlayer('stop')}>
                            Stop
                        </Button>
                    </Box>
                </Paper>
            )}
        </Box>
    );
};

export default Player;
