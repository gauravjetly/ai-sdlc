import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
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

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Header />
            <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: 'background.default' }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/deploy" element={<DeploymentWizard />} />
                <Route path="/designer" element={<InfrastructureDesigner />} />
                <Route path="/visual-designer" element={<VisualDesigner />} />
                <Route path="/scheduling" element={<Scheduling />} />
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
