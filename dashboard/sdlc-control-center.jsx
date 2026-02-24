import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, Clock, Play, Pause, GitBranch, FileText, Shield, TestTube, Rocket, Users, BarChart3, Layers, ChevronRight, RefreshCw, Calendar, Zap } from 'lucide-react';

// Agent definitions with their properties
const AGENTS = [
  { id: 'conductor', name: 'Conductor', icon: '🎭', color: '#081581', model: 'Opus', role: 'Orchestrator' },
  { id: 'ba', name: 'BA Agent', icon: '📋', color: '#1742F6', model: 'Sonnet', role: 'Requirements' },
  { id: 'jets', name: 'Jets', icon: '🏗️', color: '#6D18F1', model: 'Opus', role: 'Architecture' },
  { id: 'engineer', name: 'Engineer', icon: '💻', color: '#00B6C3', model: 'Sonnet', role: 'Development' },
  { id: 'security', name: 'Security', icon: '🔒', color: '#ef4444', model: 'Sonnet', role: 'Security Review' },
  { id: 'qa', name: 'QA Agent', icon: '🧪', color: '#f59e0b', model: 'Sonnet', role: 'Testing' },
  { id: 'atlas', name: 'Atlas', icon: '🚀', color: '#8b5cf6', model: 'Sonnet', role: 'Deployment' },
  { id: 'customer', name: 'Customer', icon: '✅', color: '#22c55e', model: 'Sonnet', role: 'Acceptance' },
  { id: 'tracker', name: 'Tracker', icon: '📊', color: '#64748b', model: 'Haiku', role: 'Monitoring' },
];

// Sample data - in real use, this would come from the registry
const SAMPLE_PROJECTS = [
  {
    id: 'SDLC-20250115-1423',
    name: 'Customer Feedback Portal',
    status: 'in_progress',
    currentPhase: 'engineer',
    startedAt: '2025-01-15T14:23:00Z',
    phases: [
      { agent: 'conductor', status: 'complete', duration: '2m', output: 'SDLC-20250115-1423.md' },
      { agent: 'ba', status: 'complete', duration: '15m', output: 'REQ-001.md' },
      { agent: 'jets', status: 'complete', duration: '25m', output: 'ARCH-001.md' },
      { agent: 'engineer', status: 'in_progress', duration: '45m', output: null },
      { agent: 'security', status: 'pending', duration: null, output: null },
      { agent: 'qa', status: 'pending', duration: null, output: null },
      { agent: 'atlas', status: 'pending', duration: null, output: null },
      { agent: 'customer', status: 'pending', duration: null, output: null },
    ]
  },
  {
    id: 'SDLC-20250115-0930',
    name: 'OAuth 2.0 Authentication',
    status: 'complete',
    currentPhase: 'complete',
    startedAt: '2025-01-15T09:30:00Z',
    completedAt: '2025-01-15T13:45:00Z',
    phases: [
      { agent: 'conductor', status: 'complete', duration: '1m', output: 'SDLC-20250115-0930.md' },
      { agent: 'ba', status: 'complete', duration: '12m', output: 'REQ-002.md' },
      { agent: 'jets', status: 'complete', duration: '20m', output: 'ARCH-002.md' },
      { agent: 'engineer', status: 'complete', duration: '1h 30m', output: 'src/auth/' },
      { agent: 'security', status: 'complete', duration: '18m', output: 'SECURITY-REVIEW-002.md', verdict: 'approved' },
      { agent: 'qa', status: 'complete', duration: '25m', output: 'TEST-REPORT-002.md' },
      { agent: 'atlas', status: 'complete', duration: '8m', output: 'DEPLOY-002.md' },
      { agent: 'customer', status: 'complete', duration: '20m', output: 'UAT-002.md', verdict: 'approved' },
    ]
  },
  {
    id: 'SDLC-20250114-1600',
    name: 'API Rate Limiting',
    status: 'blocked',
    currentPhase: 'security',
    startedAt: '2025-01-14T16:00:00Z',
    phases: [
      { agent: 'conductor', status: 'complete', duration: '1m', output: 'SDLC-20250114-1600.md' },
      { agent: 'ba', status: 'complete', duration: '10m', output: 'REQ-003.md' },
      { agent: 'jets', status: 'complete', duration: '18m', output: 'ARCH-003.md' },
      { agent: 'engineer', status: 'complete', duration: '55m', output: 'src/ratelimit/' },
      { agent: 'security', status: 'blocked', duration: '12m', output: 'SECURITY-REVIEW-003.md', verdict: 'blocked', reason: '2 high severity vulnerabilities' },
      { agent: 'qa', status: 'pending', duration: null, output: null },
      { agent: 'atlas', status: 'pending', duration: null, output: null },
      { agent: 'customer', status: 'pending', duration: null, output: null },
    ]
  }
];

const SAMPLE_ACTIVITY = [
  { timestamp: '2025-01-15T15:08:00Z', agent: 'engineer', project: 'SDLC-20250115-1423', action: 'Implementing FeedbackService class', type: 'progress' },
  { timestamp: '2025-01-15T15:05:00Z', agent: 'engineer', project: 'SDLC-20250115-1423', action: 'Created src/services/feedback/', type: 'output' },
  { timestamp: '2025-01-15T14:55:00Z', agent: 'jets', project: 'SDLC-20250115-1423', action: 'Architecture approved - 3 ADRs created', type: 'complete' },
  { timestamp: '2025-01-15T14:30:00Z', agent: 'ba', project: 'SDLC-20250115-1423', action: 'Requirements documented - 8 FRs, 5 NFRs', type: 'complete' },
  { timestamp: '2025-01-15T13:45:00Z', agent: 'customer', project: 'SDLC-20250115-0930', action: 'UAT APPROVED - All acceptance criteria passed', type: 'approved' },
  { timestamp: '2025-01-15T13:25:00Z', agent: 'atlas', project: 'SDLC-20250115-0930', action: 'Deployed to production - health checks passing', type: 'complete' },
  { timestamp: '2025-01-14T16:45:00Z', agent: 'security', project: 'SDLC-20250114-1600', action: 'BLOCKED - SQL injection vulnerability in query builder', type: 'blocked' },
];

export default function SDLCControlCenter() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState(SAMPLE_PROJECTS);
  const [activity, setActivity] = useState(SAMPLE_ACTIVITY);

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete': return '#22c55e';
      case 'in_progress': return '#3b82f6';
      case 'blocked': return '#ef4444';
      case 'pending': return '#94a3b8';
      default: return '#64748b';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete': return <CheckCircle size={16} />;
      case 'in_progress': return <Play size={16} />;
      case 'blocked': return <XCircle size={16} />;
      case 'pending': return <Clock size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getAgent = (id) => AGENTS.find(a => a.id === id) || AGENTS[0];

  const stats = {
    total: projects.length,
    complete: projects.filter(p => p.status === 'complete').length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    blocked: projects.filter(p => p.status === 'blocked').length,
  };

  return (
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#0f172a',
      minHeight: '100vh',
      color: '#e2e8f0'
    }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #081581 0%, #1742F6 50%, #6D18F1 100%)',
        padding: '20px 24px',
        borderBottom: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Layers size={28} />
              AI-SDLC Control Center
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
              Real-time agent workflow monitoring
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              padding: '8px 16px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px'
            }}>
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ 
        background: '#1e293b',
        padding: '0 24px',
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid #334155'
      }}>
        {['dashboard', 'projects', 'agents', 'activity'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? '#0f172a' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
              padding: '12px 20px',
              color: activeTab === tab ? '#fff' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ padding: '24px' }}>
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Total Projects', value: stats.total, color: '#3b82f6', icon: <GitBranch size={20} /> },
                { label: 'Completed', value: stats.complete, color: '#22c55e', icon: <CheckCircle size={20} /> },
                { label: 'In Progress', value: stats.inProgress, color: '#f59e0b', icon: <Activity size={20} /> },
                { label: 'Blocked', value: stats.blocked, color: '#ef4444', icon: <XCircle size={20} /> },
              ].map((stat, i) => (
                <div key={i} style={{
                  background: '#1e293b',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #334155'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>{stat.label}</p>
                      <p style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: 700, color: stat.color }}>{stat.value}</p>
                    </div>
                    <div style={{ color: stat.color, opacity: 0.5 }}>{stat.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Agent Status Grid */}
            <div style={{ 
              background: '#1e293b',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #334155',
              marginBottom: '24px'
            }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Agent Workflow</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', padding: '8px 0' }}>
                {AGENTS.filter(a => a.id !== 'tracker').map((agent, i) => (
                  <React.Fragment key={agent.id}>
                    <div style={{
                      background: agent.color,
                      borderRadius: '8px',
                      padding: '12px 16px',
                      minWidth: '100px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', marginBottom: '4px' }}>{agent.icon}</div>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>{agent.name}</div>
                      <div style={{ fontSize: '10px', opacity: 0.8 }}>{agent.model}</div>
                    </div>
                    {i < AGENTS.filter(a => a.id !== 'tracker').length - 1 && (
                      <ChevronRight size={20} style={{ color: '#64748b', flexShrink: 0 }} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div style={{ 
              background: '#1e293b',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #334155'
            }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Recent Activity</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activity.slice(0, 5).map((item, i) => {
                  const agent = getAgent(item.agent);
                  return (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: '#0f172a',
                      borderRadius: '8px',
                      borderLeft: `3px solid ${agent.color}`
                    }}>
                      <div style={{ fontSize: '20px' }}>{agent.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{item.action}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {agent.name} • {item.project}
                        </div>
                      </div>
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#64748b',
                        whiteSpace: 'nowrap'
                      }}>
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div style={{ display: 'flex', gap: '24px' }}>
            {/* Project List */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {projects.map(project => (
                  <div 
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    style={{
                      background: selectedProject?.id === project.id ? '#334155' : '#1e293b',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid #334155',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{project.name}</h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>{project.id}</p>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: `${getStatusColor(project.status)}20`,
                        color: getStatusColor(project.status)
                      }}>
                        {getStatusIcon(project.status)}
                        {project.status.replace('_', ' ')}
                      </div>
                    </div>
                    
                    {/* Phase Progress */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {project.phases.map((phase, i) => {
                        const agent = getAgent(phase.agent);
                        return (
                          <div
                            key={i}
                            title={`${agent.name}: ${phase.status}`}
                            style={{
                              flex: 1,
                              height: '6px',
                              borderRadius: '3px',
                              background: phase.status === 'complete' ? agent.color :
                                         phase.status === 'in_progress' ? `${agent.color}80` :
                                         phase.status === 'blocked' ? '#ef4444' : '#334155'
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Project Detail */}
            {selectedProject && (
              <div style={{ 
                width: '400px',
                background: '#1e293b',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #334155',
                height: 'fit-content'
              }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600 }}>{selectedProject.name}</h2>
                <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#64748b' }}>{selectedProject.id}</p>

                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>Phase Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedProject.phases.map((phase, i) => {
                    const agent = getAgent(phase.agent);
                    return (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px',
                        background: '#0f172a',
                        borderRadius: '8px',
                        borderLeft: `3px solid ${phase.status === 'blocked' ? '#ef4444' : agent.color}`
                      }}>
                        <div style={{ fontSize: '18px' }}>{agent.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{agent.name}</div>
                          {phase.output && (
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{phase.output}</div>
                          )}
                          {phase.reason && (
                            <div style={{ fontSize: '11px', color: '#ef4444' }}>{phase.reason}</div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: getStatusColor(phase.status) }}>
                            {getStatusIcon(phase.status)}
                          </div>
                          {phase.duration && (
                            <div style={{ fontSize: '10px', color: '#64748b' }}>{phase.duration}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {AGENTS.map(agent => (
              <div key={agent.id} style={{
                background: '#1e293b',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #334155',
                borderTop: `4px solid ${agent.color}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ 
                    fontSize: '32px',
                    width: '50px',
                    height: '50px',
                    background: `${agent.color}20`,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {agent.icon}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{agent.name}</h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>{agent.role}</p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#94a3b8' }}>Model</span>
                    <span style={{ fontWeight: 500 }}>{agent.model}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#94a3b8' }}>Invocations</span>
                    <span style={{ fontWeight: 500 }}>{Math.floor(Math.random() * 50) + 10}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#94a3b8' }}>Avg Duration</span>
                    <span style={{ fontWeight: 500 }}>{Math.floor(Math.random() * 20) + 5}m</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div style={{ 
            background: '#1e293b',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activity.map((item, i) => {
                const agent = getAgent(item.agent);
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    background: '#0f172a',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${
                      item.type === 'blocked' ? '#ef4444' :
                      item.type === 'approved' ? '#22c55e' :
                      item.type === 'complete' ? '#3b82f6' : agent.color
                    }`
                  }}>
                    <div style={{ 
                      fontSize: '24px',
                      width: '44px',
                      height: '44px',
                      background: `${agent.color}20`,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {agent.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{item.action}</div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b' }}>
                        <span>{agent.name}</span>
                        <span>{item.project}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {new Date(item.timestamp).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{ 
        padding: '16px 24px',
        borderTop: '1px solid #334155',
        background: '#1e293b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: '#64748b'
      }}>
        <div>AI-SDLC Framework v2.0 • Vintiq Cloud Engineering</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Zap size={14} style={{ color: '#22c55e' }} />
          <span>Speed • Clarity • Control</span>
        </div>
      </div>
    </div>
  );
}
