import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { useMemo, useState, useEffect } from 'react';
import { theme } from './styles/theme';
import './styles/global.css';

// Set page title
document.title = 'AI-SDLC - Multi-Project Control Center';

// Pages
import Dashboard from './pages/Dashboard';
import DeploymentWizard from './pages/DeploymentWizard';
import CloudResources from './pages/CloudResources';
import AgentControl from './pages/AgentControl';
import CostOptimization from './pages/CostOptimization';
import SecurityCenter from './pages/SecurityCenter';
import Environments from './pages/Environments';
import InfrastructureDesigner from './pages/InfrastructureDesigner';
import VisualDesigner from './pages/VisualDesigner';
import Scheduling from './pages/Scheduling';
import Analytics from './pages/Analytics';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';

function App() {
  // Detect embed mode from query parameter
  const isEmbedMode = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('embed') === 'true';
  }, []);

  // Theme state - defaults to light, but will sync with parent dashboard
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  // Listen for theme changes from parent dashboard (when embedded)
  useEffect(() => {
    if (!isEmbedMode) return;

    const handleMessage = (event: MessageEvent) => {
      // Accept messages from any origin for now (in production, verify origin)
      if (event.data.type === 'THEME_CHANGE') {
        const newTheme = event.data.theme;
        if (newTheme === 'light' || newTheme === 'dark') {
          console.log('[App] Received theme change:', newTheme);
          setThemeMode(newTheme);

          // Apply theme to document root for CSS variables
          document.documentElement.setAttribute('data-theme', newTheme);

          // Update body background to match theme
          document.body.style.backgroundColor = newTheme === 'dark' ? '#0d1117' : '#F8F9FA';
        }
      }
    };

    window.addEventListener('message', handleMessage);
    console.log('[App] Theme listener registered for embed mode');

    // Send ready signal to parent (optional)
    window.parent.postMessage({ type: 'EMBED_READY' }, '*');

    return () => {
      window.removeEventListener('message', handleMessage);
      console.log('[App] Theme listener removed');
    };
  }, [isEmbedMode]);

  // Create dynamic theme based on current mode
  const dynamicTheme = useMemo(() => {
    if (themeMode === 'dark') {
      return {
        ...theme,
        palette: {
          ...theme.palette,
          mode: 'dark' as const,
          background: {
            default: '#0d1117',
            paper: '#161b22',
          },
          text: {
            primary: '#e6edf3',
            secondary: '#8b949e',
            disabled: '#6e7681',
          },
        },
      };
    }
    return theme;
  }, [themeMode]);

  return (
    <ThemeProvider theme={dynamicTheme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          {!isEmbedMode && <Sidebar />}
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            {!isEmbedMode && <Header />}
            <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: 'background.default' }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/deploy" element={<DeploymentWizard />} />
                <Route path="/designer" element={<InfrastructureDesigner />} />
                <Route path="/visual-designer" element={<VisualDesigner />} />
                <Route path="/scheduling" element={<Scheduling />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/resources" element={<CloudResources />} />
                <Route path="/agents" element={<AgentControl />} />
                <Route path="/costs" element={<CostOptimization />} />
                <Route path="/security" element={<SecurityCenter />} />
                <Route path="/environments" element={<Environments />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Box>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
