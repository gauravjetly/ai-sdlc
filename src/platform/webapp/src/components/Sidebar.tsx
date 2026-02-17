import { Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Box, Divider, Chip } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ArchitectureIcon from '@mui/icons-material/Architecture';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SecurityIcon from '@mui/icons-material/Security';
import SettingsIcon from '@mui/icons-material/Settings';
import HubIcon from '@mui/icons-material/Hub';
import InsightsIcon from '@mui/icons-material/Insights';

const DRAWER_WIDTH = 260;

const menuItems = [
  { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/enhanced', label: 'Enhanced Dashboard', icon: <InsightsIcon />, isNew: true },
  { path: '/integration', label: 'Integration', icon: <HubIcon /> },
  { path: '/visual-designer', label: 'Visual Designer', icon: <DesignServicesIcon /> },
  { path: '/designer', label: 'Infrastructure Designer', icon: <ArchitectureIcon /> },
  { path: '/scheduling', label: 'Project Scheduling', icon: <ScheduleIcon /> },
  { path: '/deploy', label: 'Deploy Application', icon: <RocketLaunchIcon /> },
  { path: '/resources', label: 'Cloud Resources', icon: <CloudQueueIcon /> },
  { path: '/agents', label: 'AI Agents', icon: <SmartToyIcon /> },
  { path: '/costs', label: 'Cost Optimization', icon: <AttachMoneyIcon /> },
  { path: '/security', label: 'Security Center', icon: <SecurityIcon /> },
  { path: '/environments', label: 'Environments', icon: <SettingsIcon /> },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #00A3E0 0%, #002B49 100%)',
          color: 'white',
          borderRight: 'none',
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: '12px',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
            fontWeight: 'bold',
            fontSize: '2.5rem',
            color: '#00A3E0',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
          }}
        >
          D
        </Box>
        <Box sx={{ mb: 1 }}>
          <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>AI-SDLC</span>
          <br />
          <span style={{ fontWeight: 600, fontSize: '1rem', opacity: 0.9 }}>PLATFORM</span>
        </Box>
        <Box sx={{ fontSize: '0.75rem', opacity: 0.7 }}>
          Control Center v2.0
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 2 }} />

      <List>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              sx={{
                py: 1.5,
                px: 3,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderLeft: '4px solid white',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {item.label}
                    {item.isNew && (
                      <Chip
                        label="NEW"
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.6rem',
                          bgcolor: '#4CAF50',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Box>
                }
                primaryTypographyProps={{
                  fontSize: '0.9rem',
                  fontWeight: location.pathname === item.path ? 600 : 400,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}
