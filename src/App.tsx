import React from 'react';
import Home from './pages/Home';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
    palette: {
        mode: 'light',
    },
});

const App: React.FC = () => {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Home />
        </ThemeProvider>
    );
};

export default App;
