import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, Chip, Alert,
  FormControlLabel, Checkbox, List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const costData = [
  { name: 'Compute (EKS)', value: 2800, color: '#0066CC' },
  { name: 'Storage (S3)', value: 1200, color: '#3b82f6' },
  { name: 'Database (RDS)', value: 1500, color: '#10b981' },
  { name: 'Networking', value: 500, color: '#f59e0b' },
];

const recommendations = [
  { id: 1, title: 'Rightsize EC2 Instances', savings: '$450/mo', description: '12 instances are over-provisioned', selected: false },
  { id: 2, title: 'Use Reserved Instances', savings: '$680/mo', description: 'Save 30% with 1-year commitment', selected: false },
  { id: 3, title: 'Delete Unused EBS Volumes', savings: '$120/mo', description: '8 volumes not attached', selected: false },
  { id: 4, title: 'Enable S3 Lifecycle Policies', savings: '$200/mo', description: 'Move old objects to Glacier', selected: false },
  { id: 5, title: 'Optimize Database Storage', savings: '$310/mo', description: 'Resize RDS instances', selected: false },
];

export default function CostOptimization() {
  const [selectedRecommendations, setSelectedRecommendations] = useState<number[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const totalCurrent = costData.reduce((sum, item) => sum + item.value, 0);
  const totalSavings = recommendations
    .filter(r => selectedRecommendations.includes(r.id))
    .reduce((sum, r) => sum + parseInt(r.savings.replace(/[^0-9]/g, '')), 0);

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      alert('Cost analysis complete! Check recommendations below.');
    }, 2000);
  };

  const handleApply = () => {
    if (selectedRecommendations.length === 0) {
      alert('Please select at least one recommendation');
      return;
    }
    alert(`Applying optimization. Estimated savings: $${totalSavings}/mo`);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
        Cost Optimization
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Reduce cloud costs by up to 20% with AI-powered recommendations
      </Typography>

      <Grid container spacing={3}>
        {/* Current Costs */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>Monthly Cost Breakdown</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={costData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: $${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="h4" color="primary">${totalCurrent}/mo</Typography>
                <Typography variant="body2" color="text.secondary">Current Monthly Spend</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Savings Summary */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Potential Savings</Typography>
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <TrendingDownIcon sx={{ fontSize: 60, color: '#10b981', mb: 1 }} />
                <Typography variant="h3" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                  $1,760/mo
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Up to 28% cost reduction
                </Typography>
              </Box>
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>AI Analysis Complete:</strong> 5 optimization opportunities identified
                </Typography>
              </Alert>
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button 
                  variant="contained" 
                  fullWidth 
                  onClick={handleAnalyze}
                  disabled={analyzing}
                >
                  {analyzing ? 'Analyzing...' : 'Re-analyze Costs'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Selected Savings</Typography>
              <Typography variant="h4" color="primary" sx={{ mb: 1 }}>
                ${totalSavings}/mo
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedRecommendations.length} optimization(s) selected
              </Typography>
              <Button 
                variant="contained" 
                color="success" 
                fullWidth
                onClick={handleApply}
                disabled={selectedRecommendations.length === 0}
              >
                Apply Selected Optimizations
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>AI-Powered Recommendations</Typography>
              <List>
                {recommendations.map((rec) => (
                  <ListItem
                    key={rec.id}
                    sx={{
                      border: '1px solid #e0e0e0',
                      borderRadius: 2,
                      mb: 2,
                      bgcolor: selectedRecommendations.includes(rec.id) ? '#f0f9ff' : 'white',
                    }}
                  >
                    <ListItemIcon>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedRecommendations.includes(rec.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRecommendations([...selectedRecommendations, rec.id]);
                              } else {
                                setSelectedRecommendations(selectedRecommendations.filter(id => id !== rec.id));
                              }
                            }}
                          />
                        }
                        label=""
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="subtitle1" fontWeight="bold">{rec.title}</Typography>
                          <Chip label={rec.savings} color="success" size="small" />
                        </Box>
                      }
                      secondary={rec.description}
                    />
                    {selectedRecommendations.includes(rec.id) && (
                      <CheckCircleIcon sx={{ color: '#10b981', ml: 2 }} />
                    )}
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
