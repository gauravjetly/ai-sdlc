import { createTheme } from '@mui/material/styles';

// Vintiq Official Brand Colors
export const catalystColors = {
  primary: '#F39219',      // Vintiq Orange (Official)
  secondary: '#120E3A',    // Vintiq Navy (Official)
  accent: '#DB0064',       // Vintiq Magenta Accent
  success: '#10b981',      // Green
  info: '#F39219',         // Vintiq Orange
  warning: '#EF8433',      // Vintiq Orange Mid
  error: '#DC3545',        // Red
  background: '#F8F9FA',   // Light Gray
  paper: '#FFFFFF',        // White
};

// Dark theme colors matching dashboard
export const catalystDarkColors = {
  primary: '#F39219',      // Vintiq Orange (same for consistency)
  secondary: '#58a6ff',    // Lighter blue for dark mode
  accent: '#DB0064',       // Vintiq Magenta Accent
  success: '#3fb950',      // GitHub-style green
  info: '#58a6ff',         // Light blue
  warning: '#d29922',      // Amber
  error: '#f85149',        // Red
  background: '#0d1117',   // Dark background
  paper: '#161b22',        // Dark paper
  border: '#30363d',       // Dark border
  textPrimary: '#e6edf3',  // Light text
  textSecondary: '#8b949e', // Gray text
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
