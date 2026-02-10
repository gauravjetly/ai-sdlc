import { Box, Typography } from '@mui/material';
import MultiProjectDashboard from '../components/scheduling/MultiProjectDashboard';

/**
 * Scheduling Page
 *
 * Multi-project SDLC orchestration dashboard providing:
 * - Real-time project pipeline visibility
 * - Agent pool status and utilization
 * - Phase duration analytics
 * - Weekly throughput metrics
 */
export default function Scheduling() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
        Project Scheduling & Orchestration
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Monitor and manage multi-project SDLC workflows with intelligent agent orchestration
      </Typography>

      <MultiProjectDashboard />
    </Box>
  );
}
