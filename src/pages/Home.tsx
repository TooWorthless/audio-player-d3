import React from 'react';
import Player from '../components/Player';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const Home: React.FC = () => {
    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Typography variant="h4" align="center" gutterBottom>
                Audio Player D3
            </Typography>
            <Box sx={{ mt: 4, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
                <Player />
            </Box>
        </Container>
    );
};

export default Home;
