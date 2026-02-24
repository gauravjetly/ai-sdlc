import { AppBar, Toolbar, Typography, Box, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudIcon from '@mui/icons-material/Cloud';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ApiIcon from '@mui/icons-material/Api';

export default function Header() {
  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{ 
        background: 'white',
        borderBottom: '1px solid #e0e0e0'
      }}
    >
      <Toolbar>
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ height: 50, display: 'flex', alignItems: 'center' }}>
            <img
              src="/vintiq-logo.svg"
              alt="Vintiq Consultancy"
              style={{ height: '50px', width: 'auto' }}
            />
          </Box>
          <Box>
            <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>
              <span style={{ color: '#F39219' }}>VINTIQ</span>{' '}
              <span style={{ color: '#120E3A' }}>CATALYST</span>
            </Typography>
            <Typography variant="caption" sx={{ color: '#666' }}>
              AI-Powered Multi-Cloud Control Center
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Chip 
            icon={<CheckCircleIcon />} 
            label="System Healthy" 
            color="success" 
            size="small"
          />
          <Chip 
            icon={<CloudIcon />} 
            label="Multi-Cloud Ready" 
            color="info" 
            size="small"
          />
          <Chip 
            icon={<SmartToyIcon />} 
            label="8 AI Agents" 
            color="info" 
            size="small"
          />
          <Chip 
            icon={<ApiIcon />} 
            label="102 APIs" 
            color="info" 
            size="small"
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
