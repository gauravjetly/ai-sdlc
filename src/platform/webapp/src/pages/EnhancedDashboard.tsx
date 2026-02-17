import React, { useEffect, useState } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardData {
  workflows: {
    active: number;
    completed: number;
    avgDuration: number;
  };
  quality: {
    coverage: number;
    securityIssues: number;
    regressionRate: number;
    cycleTime: number;
  };
  agents: {
    name: string;
    activity: number[];
  }[];
  trends: {
    dates: string[];
    coverage: number[];
    security: number[];
    performance: number[];
  };
}

export const EnhancedDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/data');
      const json = await response.json();
      setData(json);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Use mock data for development
      setData(getMockData());
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">AI-SDLC Platform Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <KPICard
          title="Active Workflows"
          value={data.workflows.active}
          trend="+12%"
          trendUp={true}
          icon="🚀"
        />
        <KPICard
          title="Test Coverage"
          value={`${data.quality.coverage}%`}
          trend="+4%"
          trendUp={true}
          icon="✅"
        />
        <KPICard
          title="Security Issues"
          value={data.quality.securityIssues}
          trend="-67%"
          trendUp={true}
          icon="🔒"
        />
        <KPICard
          title="Avg Cycle Time"
          value={`${data.quality.cycleTime}h`}
          trend="-15%"
          trendUp={true}
          icon="⚡"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Quality Trends */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quality Trends (30 Days)</h2>
          <Line
            data={{
              labels: data.trends.dates,
              datasets: [
                {
                  label: 'Test Coverage %',
                  data: data.trends.coverage,
                  borderColor: 'rgb(34, 197, 94)',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  fill: true,
                  tension: 0.4
                },
                {
                  label: 'Security Score',
                  data: data.trends.security,
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  fill: true,
                  tension: 0.4
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top'
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100
                }
              }
            }}
            height={250}
          />
        </div>

        {/* Agent Activity Heatmap */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Agent Activity Heatmap</h2>
          <AgentHeatmap agents={data.agents} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Workflow Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Workflow Status</h2>
          <Doughnut
            data={{
              labels: ['Active', 'Completed', 'Blocked'],
              datasets: [
                {
                  data: [
                    data.workflows.active,
                    data.workflows.completed,
                    3
                  ],
                  backgroundColor: [
                    'rgb(59, 130, 246)',
                    'rgb(34, 197, 94)',
                    'rgb(239, 68, 68)'
                  ]
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom'
                }
              }
            }}
            height={200}
          />
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
          <Bar
            data={{
              labels: ['Classification', 'Agent Exec', 'Tests', 'Deploy'],
              datasets: [
                {
                  label: 'Duration (seconds)',
                  data: [2.1, 145, 512, 180],
                  backgroundColor: 'rgba(59, 130, 246, 0.5)',
                  borderColor: 'rgb(59, 130, 246)',
                  borderWidth: 1
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                }
              }
            }}
            height={200}
          />
        </div>

        {/* Security Timeline */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Security Issues</h2>
          <SecurityTimeline issues={data.quality.securityIssues} />
        </div>
      </div>

      {/* Active Workflows */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Active Workflows</h2>
        <ActiveWorkflowsList />
      </div>

      {/* Real-time Activity Feed */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Real-time Activity</h2>
        <ActivityFeed />
      </div>
    </div>
  );
};

// Mock data for development
const getMockData = (): DashboardData => ({
  workflows: {
    active: 3,
    completed: 45,
    avgDuration: 3.8
  },
  quality: {
    coverage: 89,
    securityIssues: 3,
    regressionRate: 0.3,
    cycleTime: 3.8
  },
  agents: [
    { name: 'BA Agent', activity: [12, 8, 15, 10, 14, 0, 0] },
    { name: 'Architect', activity: [10, 12, 8, 15, 11, 2, 0] },
    { name: 'Engineer', activity: [18, 20, 22, 19, 21, 5, 0] },
    { name: 'Security', activity: [5, 6, 4, 7, 5, 0, 0] },
    { name: 'QA', activity: [15, 14, 16, 13, 15, 3, 0] }
  ],
  trends: {
    dates: ['Jan 18', 'Jan 25', 'Feb 1', 'Feb 8', 'Feb 15'],
    coverage: [85, 86, 87, 88, 89],
    security: [75, 80, 85, 90, 93],
    performance: [70, 75, 78, 82, 85]
  }
});

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string | number;
  trend: string;
  trendUp: boolean;
  icon: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, trend, trendUp, icon }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between mb-2">
      <span className="text-2xl">{icon}</span>
      <span className={`text-sm font-semibold ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
        {trend}
      </span>
    </div>
    <h3 className="text-gray-600 text-sm mb-1">{title}</h3>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);

// Agent Heatmap Component
interface AgentHeatmapProps {
  agents: { name: string; activity: number[] }[];
}

const AgentHeatmap: React.FC<AgentHeatmapProps> = ({ agents }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getHeatColor = (value: number) => {
    if (value === 0) return 'bg-gray-100';
    if (value < 5) return 'bg-blue-200';
    if (value < 10) return 'bg-blue-400';
    if (value < 15) return 'bg-blue-600';
    return 'bg-blue-800';
  };

  return (
    <div className="space-y-2">
      {agents.map((agent, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="text-xs w-20 truncate">{agent.name}</span>
          <div className="flex gap-1">
            {agent.activity.map((value, dayIdx) => (
              <div
                key={dayIdx}
                className={`w-8 h-8 rounded ${getHeatColor(value)} flex items-center justify-center text-xs text-white`}
                title={`${days[dayIdx]}: ${value} activities`}
              >
                {value > 0 ? value : ''}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Security Timeline Component
interface SecurityTimelineProps {
  issues: number;
}

const SecurityTimeline: React.FC<SecurityTimelineProps> = ({ issues }) => {
  const history = [
    { date: 'Week 1', count: 12, resolved: 8 },
    { date: 'Week 2', count: 8, resolved: 6 },
    { date: 'Week 3', count: 5, resolved: 4 },
    { date: 'Week 4', count: issues, resolved: 0 }
  ];

  return (
    <div className="space-y-3">
      {history.map((week, idx) => (
        <div key={idx}>
          <div className="flex justify-between text-sm mb-1">
            <span>{week.date}</span>
            <span className="font-semibold">{week.count} issues</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full"
              style={{ width: `${(week.count / 12) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {week.resolved} resolved
          </div>
        </div>
      ))}
    </div>
  );
};

// Active Workflows List Component
const ActiveWorkflowsList: React.FC = () => {
  const workflows = [
    { id: 1, name: 'OAuth Implementation', progress: 80, phase: 'Engineering' },
    { id: 2, name: 'Payment API', progress: 30, phase: 'Architecture' },
    { id: 3, name: 'Bug Fix #432', progress: 100, phase: 'Complete' }
  ];

  return (
    <div className="space-y-4">
      {workflows.map((wf) => (
        <div key={wf.id} className="border-l-4 border-blue-500 pl-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">{wf.name}</h3>
            <span className="text-sm text-gray-600">{wf.phase}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${wf.progress}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-1">{wf.progress}% complete</div>
        </div>
      ))}
    </div>
  );
};

// Activity Feed Component
const ActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState([
    { time: '2 min ago', agent: 'QA Agent', message: 'Completed test suite (247/247 passed)' },
    { time: '5 min ago', agent: 'Security Agent', message: 'Found 0 vulnerabilities' },
    { time: '8 min ago', agent: 'Engineer', message: 'Implemented OAuth 2.0 flow' }
  ]);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      const newActivity = {
        time: 'Just now',
        agent: ['BA Agent', 'QA Agent', 'Security Agent'][Math.floor(Math.random() * 3)],
        message: 'Activity update...'
      };
      setActivities((prev) => [newActivity, ...prev.slice(0, 9)]);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {activities.map((activity, idx) => (
        <div key={idx} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded">
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <span className="font-semibold text-sm">{activity.agent}</span>
              <span className="text-xs text-gray-500">{activity.time}</span>
            </div>
            <p className="text-sm text-gray-700 mt-1">{activity.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EnhancedDashboard;
