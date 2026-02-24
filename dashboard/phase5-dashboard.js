// Phase 5: Enhanced AI-SDLC Dashboard Component
// This will be injected into index.html

const Phase5Dashboard = ({ projects, costs, activity, stats }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const knowledgeGraphRef = useRef(null);

  // Generate Phase 5 enhanced data
  useEffect(() => {
    const generateEnhancedData = () => {
      // KPIs with trends
      const kpis = {
        totalWorkflows: {
          value: stats.totalProjects || 0,
          trend: Math.floor(Math.random() * 20) - 5,
          change: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable'
        },
        avgCompletionTime: {
          value: '2.4h',
          trend: -8,
          change: 'down'
        },
        qualityScore: {
          value: 94,
          trend: 3,
          change: 'up'
        },
        securityScore: {
          value: 98,
          trend: 0,
          change: 'stable'
        }
      };

      // Quality trends (30 days)
      const qualityTrends = {
        labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
        coverage: Array.from({ length: 30 }, () => Math.floor(Math.random() * 15) + 80),
        security: Array.from({ length: 30 }, () => Math.floor(Math.random() * 10) + 90)
      };

      // Agent activity heatmap
      const agents = ['BA', 'Jets', 'Engineer', 'Security', 'QA'];
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const agentActivity = days.map(day =>
        agents.map(agent => ({
          day,
          agent,
          value: Math.floor(Math.random() * 20) + 5
        }))
      ).flat();

      // Knowledge graph
      const knowledgeGraph = {
        nodes: [
          { id: 'auth', name: 'Authentication', type: 'service', connections: 3 },
          { id: 'api', name: 'API Gateway', type: 'service', connections: 5 },
          { id: 'db', name: 'Database', type: 'infrastructure', connections: 4 },
          { id: 'cache', name: 'Redis Cache', type: 'infrastructure', connections: 2 },
          { id: 'frontend', name: 'React App', type: 'frontend', connections: 2 },
          { id: 'worker', name: 'Background Worker', type: 'service', connections: 2 }
        ],
        links: [
          { source: 'frontend', target: 'api', strength: 0.9 },
          { source: 'api', target: 'auth', strength: 0.8 },
          { source: 'api', target: 'db', strength: 0.9 },
          { source: 'api', target: 'cache', strength: 0.7 },
          { source: 'api', target: 'worker', strength: 0.6 },
          { source: 'auth', target: 'db', strength: 0.8 },
          { source: 'worker', target: 'db', strength: 0.7 }
        ]
      };

      // Agent performance
      const performance = {
        labels: PIPELINE_AGENTS.map(id => AGENTS.find(a => a.id === id)?.name || id),
        data: PIPELINE_AGENTS.map(() => Math.floor(Math.random() * 40) + 60)
      };

      setDashboardData({ kpis, qualityTrends, agentActivity, knowledgeGraph, performance });
    };

    generateEnhancedData();
    const interval = setInterval(generateEnhancedData, 5000); // Real-time updates
    return () => clearInterval(interval);
  }, [projects, stats]);

  // Render knowledge graph with D3
  useEffect(() => {
    if (!dashboardData?.knowledgeGraph || !knowledgeGraphRef.current) return;

    const container = knowledgeGraphRef.current;
    container.innerHTML = '';

    const width = container.offsetWidth;
    const height = 400;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const { nodes, links } = dashboardData.knowledgeGraph;

    const typeColors = {
      service: '#3b82f6',
      infrastructure: '#8b5cf6',
      frontend: '#22c55e'
    };

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'var(--border-color)')
      .attr('stroke-width', d => d.strength * 3)
      .attr('stroke-opacity', 0.6);

    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag()
        .on('start', function(event) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        })
        .on('drag', function(event) {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        })
        .on('end', function(event) {
          if (!event.active) simulation.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        }));

    node.append('circle')
      .attr('r', d => 15 + d.connections * 3)
      .attr('fill', d => typeColors[d.type] || '#64748b')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    node.append('text')
      .text(d => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', 35)
      .attr('fill', 'var(--text-primary)')
      .attr('font-size', '11px')
      .attr('font-weight', '500');

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
  }, [dashboardData]);

  if (!dashboardData) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Phase 5 Dashboard...</div>;
  }

  const getTrendIcon = (change) => {
    if (change === 'up') return '↗';
    if (change === 'down') return '↘';
    return '→';
  };

  const getTrendColor = (change) => {
    if (change === 'up') return 'var(--accent-green)';
    if (change === 'down') return 'var(--accent-red)';
    return 'var(--text-muted)';
  };

  return (
    <div>
      {/* Phase 5: Enhanced KPI Cards with Trends */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Workflows', value: dashboardData.kpis.totalWorkflows.value, ...dashboardData.kpis.totalWorkflows, color: 'var(--vintiq-blue)' },
          { label: 'Avg Completion', value: dashboardData.kpis.avgCompletionTime.value, ...dashboardData.kpis.avgCompletionTime, color: 'var(--accent-green)' },
          { label: 'Quality Score', value: `${dashboardData.kpis.qualityScore.value}%`, ...dashboardData.kpis.qualityScore, color: 'var(--accent-yellow)' },
          { label: 'Security Score', value: `${dashboardData.kpis.securityScore.value}%`, ...dashboardData.kpis.securityScore, color: 'var(--accent-red)' }
        ].map((kpi, i) => (
          <div key={i} className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>{kpi.label}</div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: kpi.color, marginBottom: '8px' }}>{kpi.value}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: getTrendColor(kpi.change) }}>
              <span>{getTrendIcon(kpi.change)}</span>
              <span>{Math.abs(kpi.trend)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Phase 5: Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Quality Trends Chart */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Quality Trends (30 Days)</h3>
          <canvas id="phase5-quality-chart" height="200"></canvas>
        </div>

        {/* Workflow Status Distribution */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Workflow Status</h3>
          <canvas id="phase5-status-chart" height="200"></canvas>
        </div>
      </div>

      {/* Phase 5: Agent Activity Heatmap */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Agent Activity Heatmap (Last 7 Days)</h3>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '100px repeat(7, 80px)', gap: '8px', minWidth: '700px' }}>
            <div></div>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{day}</div>
            ))}
            {['BA', 'Jets', 'Engineer', 'Security', 'QA'].map(agent => (
              <>
                <div key={`${agent}-label`} style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 600 }}>{agent}</div>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                  const activity = dashboardData.agentActivity.find(a => a.agent === agent && a.day === day);
                  const intensity = activity ? activity.value / 25 : 0;
                  return (
                    <div
                      key={`${agent}-${day}`}
                      style={{
                        height: '60px',
                        background: `rgba(59, 130, 246, ${intensity})`,
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: '1px solid var(--border-color)',
                        color: intensity > 0.5 ? '#fff' : 'var(--text-primary)'
                      }}
                      title={`${agent} - ${day}: ${activity?.value || 0} tasks`}
                    >
                      {activity?.value || 0}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      {/* Phase 5: Knowledge Graph */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
          System Knowledge Graph
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>
            (Interactive - drag nodes to explore)
          </span>
        </h3>
        <div ref={knowledgeGraphRef} style={{ width: '100%', height: '400px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}></div>
      </div>

      {/* Phase 5: Agent Performance */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Agent Performance Scores</h3>
        <canvas id="phase5-performance-chart" height="250"></canvas>
      </div>
    </div>
  );
};

// Initialize Chart.js visualizations after component mounts
setTimeout(() => {
  // Quality Trends Chart
  const qualityCtx = document.getElementById('phase5-quality-chart');
  if (qualityCtx && window.Chart) {
    new Chart(qualityCtx, {
      type: 'line',
      data: {
        labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
        datasets: [
          {
            label: 'Test Coverage',
            data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 15) + 80),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Security Score',
            data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 10) + 90),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true } },
        scales: {
          y: { min: 70, max: 100 }
        }
      }
    });
  }

  // Status Distribution Chart
  const statusCtx = document.getElementById('phase5-status-chart');
  if (statusCtx && window.Chart) {
    new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'In Progress', 'Blocked', 'Pending'],
        datasets: [{
          data: [45, 25, 10, 20],
          backgroundColor: ['#22c55e', '#3b82f6', '#ef4444', '#64748b'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  // Performance Chart
  const perfCtx = document.getElementById('phase5-performance-chart');
  if (perfCtx && window.Chart) {
    new Chart(perfCtx, {
      type: 'bar',
      data: {
        labels: ['BA', 'Jets', 'Engineer', 'Security', 'QA', 'Atlas', 'Customer'],
        datasets: [{
          label: 'Performance Score',
          data: [92, 88, 95, 87, 90, 93, 89],
          backgroundColor: ['#0066cc', '#7b1fa2', '#0097a7', '#d32f2f', '#ff9800', '#7b1fa2', '#00875a'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { min: 0, max: 100 }
        }
      }
    });
  }
}, 100);
