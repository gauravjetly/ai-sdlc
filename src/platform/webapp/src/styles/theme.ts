import { createTheme } from '@mui/material/styles';

// Deltek Official Brand Colors
export const catalystColors = {
  primary: '#00A3E0',      // Deltek Cyan (Official)
  secondary: '#002B49',    // Deltek Navy (Official)
  accent: '#FF6B35',       // Deltek Orange Accent
  success: '#10b981',      // Green
  info: '#00A3E0',         // Deltek Cyan
  warning: '#FF6B35',      // Deltek Orange
  error: '#DC3545',        // Red
  background: '#F8F9FA',   // Light Gray
  paper: '#FFFFFF',        // White
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: catalystColors.primary,
      dark: catalystColors.secondary,
    },
    secondary: {
      main: catalystColors.secondary,
    },
    success: {
      main: catalystColors.success,
    },
    info: {
      main: catalystColors.info,
    },
    warning: {
      main: catalystColors.warning,
    },
    error: {
      main: catalystColors.error,
    },
    background: {
      default: catalystColors.background,
      paper: catalystColors.paper,
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: catalystColors.primary,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      color: '#333',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: '#333',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            transform: 'translateY(-2px)',
            transition: 'all 0.2s',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
  },
});
