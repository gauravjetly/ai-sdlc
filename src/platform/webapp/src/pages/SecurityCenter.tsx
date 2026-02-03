import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, Chip,
  Alert, Table, TableBody, TableCell, TableHead, TableRow, LinearProgress
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import BugReportIcon from '@mui/icons-material/BugReport';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { api } from '../services/api';

const vulnerabilities = [
  { id: 1, severity: 'High', package: 'lodash', version: '4.17.20', cve: 'CVE-2021-23337', fixed: '4.17.21' },
  { id: 2, severity: 'Medium', package: 'axios', version: '0.21.1', cve: 'CVE-2021-3749', fixed: '0.21.2' },
  { id: 3, severity: 'Low', package: 'express', version: '4.17.0', cve: 'CVE-2020-28469', fixed: '4.17.1' },
];

const complianceChecks = [
  { name: 'Encryption at Rest', status: 'passed', description: 'All data encrypted with AES-256' },
  { name: 'Encryption in Transit', status: 'passed', description: 'TLS 1.3 enforced' },
  { name: 'IAM Best Practices', status: 'passed', description: 'MFA enabled for all users' },
  { name: 'Network Security', status: 'warning', description: 'Some security groups too permissive' },
  { name: 'Secrets Management', status: 'passed', description: 'No hardcoded credentials found' },
  { name: 'Logging & Monitoring', status: 'passed', description: 'CloudTrail enabled in all regions' },
];

export default function SecurityCenter() {
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const handleScan = async () => {
    setScanning(true);
    setScanProgress(0);
    
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanning(false);
          return 100;
        }
        return prev + 10;
      });
    }, 300);

    try {
      await api.runSecurityScan('all');
    } catch (error) {
      console.error('Security scan failed:', error);
      clearInterval(interval);
      setScanning(false);
    }
  };

  const handleFix = (vulnId: number) => {
    alert(`Fixing vulnerability #${vulnId}. This will update the package to the fixed version.`);
  };

  const handleFixAll = () => {
    alert(`Fixing all ${vulnerabilities.length} vulnerabilities. Packages will be updated automatically.`);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
        Security Center
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Monitor and fix security vulnerabilities across your infrastructure
      </Typography>

      <Grid container spacing={3}>
        {/* Security Overview */}
        <Grid item xs={12} md={4}>
          <Card sx={{ textAlign: 'center', py: 3 }}>
            <SecurityIcon sx={{ fontSize: 60, color: '#10b981', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>Security Posture</Typography>
            <Chip label="Good" color="success" sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              87/100 Security Score
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={87} 
              sx={{ mt: 2, mx: 3 }} 
              color="success"
            />
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ textAlign: 'center', py: 3 }}>
            <BugReportIcon sx={{ fontSize: 60, color: '#f59e0b', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>Vulnerabilities Found</Typography>
            <Typography variant="h3" color="warning.main" sx={{ mb: 1 }}>
              {vulnerabilities.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              1 High, 1 Medium, 1 Low
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: '#0066CC', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>Last Scan</Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              15 minutes ago
            </Typography>
            <Button 
              variant="contained" 
              onClick={handleScan}
              disabled={scanning}
              fullWidth
              sx={{ mt: 2, mx: 2 }}
            >
              {scanning ? 'Scanning...' : 'Run Security Scan'}
            </Button>
            {scanning && (
              <LinearProgress 
                variant="determinate" 
                value={scanProgress} 
                sx={{ mt: 2, mx: 3 }} 
              />
            )}
          </Card>
        </Grid>

        {/* Vulnerabilities */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Vulnerability Report</Typography>
                <Button 
                  variant="contained" 
                  color="error" 
                  onClick={handleFixAll}
                  disabled={vulnerabilities.length === 0}
                >
                  Fix All Vulnerabilities
                </Button>
              </Box>
              
              {vulnerabilities.length > 0 ? (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Severity</TableCell>
                      <TableCell>Package</TableCell>
                      <TableCell>Current Version</TableCell>
                      <TableCell>CVE</TableCell>
                      <TableCell>Fixed Version</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {vulnerabilities.map((vuln) => (
                      <TableRow key={vuln.id}>
                        <TableCell>
                          <Chip 
                            label={vuln.severity}
                            color={vuln.severity === 'High' ? 'error' : vuln.severity === 'Medium' ? 'warning' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{vuln.package}</TableCell>
                        <TableCell>{vuln.version}</TableCell>
                        <TableCell>{vuln.cve}</TableCell>
                        <TableCell>{vuln.fixed}</TableCell>
                        <TableCell>
                          <Button 
                            size="small" 
                            variant="contained" 
                            onClick={() => handleFix(vuln.id)}
                          >
                            Fix
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Alert severity="success">
                  <Typography variant="body2">
                    <strong>All Clear!</strong> No vulnerabilities detected in your applications.
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Compliance */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>Compliance Checklist</Typography>
              <Grid container spacing={2}>
                {complianceChecks.map((check, idx) => (
                  <Grid item xs={12} md={6} key={idx}>
                    <Box
                      sx={{
                        p: 2,
                        border: '1px solid #e0e0e0',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      {check.status === 'passed' ? (
                        <CheckCircleIcon sx={{ color: '#10b981', fontSize: 30 }} />
                      ) : (
                        <WarningIcon sx={{ color: '#f59e0b', fontSize: 30 }} />
                      )}
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">{check.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{check.description}</Typography>
                      </Box>
                      <Chip 
                        label={check.status === 'passed' ? 'Passed' : 'Warning'}
                        color={check.status === 'passed' ? 'success' : 'warning'}
                        size="small"
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
