import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface GraphNode {
  id: string;
  label: string;
  type: 'agent' | 'knowledge' | 'workflow' | 'file';
  value: number;
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
  label?: string;
}

interface KnowledgeGraphProps {
  width?: number;
  height?: number;
}

export const KnowledgeGraphVisualization: React.FC<KnowledgeGraphProps> = ({
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] } | null>(null);

  useEffect(() => {
    fetchGraphData();
  }, []);

  useEffect(() => {
    if (graphData && svgRef.current) {
      renderGraph(graphData);
    }
  }, [graphData]);

  const fetchGraphData = async () => {
    try {
      const response = await fetch('/api/knowledge-graph/data');
      const data = await response.json();
      setGraphData(data);
    } catch (error) {
      console.error('Failed to fetch graph data:', error);
      // Use mock data
      setGraphData(getMockGraphData());
    }
  };

  const renderGraph = (data: { nodes: GraphNode[]; links: GraphLink[] }) => {
    if (!svgRef.current) return;

    // Clear existing
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);

    // Create force simulation
    const simulation = d3
      .forceSimulation(data.nodes as any)
      .force('link', d3.forceLink(data.links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Create links
    const link = svg
      .append('g')
      .selectAll('line')
      .data(data.links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => Math.sqrt(d.value));

    // Create nodes
    const node = svg
      .append('g')
      .selectAll('circle')
      .data(data.nodes)
      .enter()
      .append('circle')
      .attr('r', (d) => 10 + d.value)
      .attr('fill', (d) => getNodeColor(d.type))
      .call(
        d3
          .drag<any, any>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    // Add labels
    const label = svg
      .append('g')
      .selectAll('text')
      .data(data.nodes)
      .enter()
      .append('text')
      .text((d) => d.label)
      .attr('font-size', 10)
      .attr('dx', 15)
      .attr('dy', 4);

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);

      label.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  };

  const getNodeColor = (type: string) => {
    const colors: Record<string, string> = {
      agent: '#3b82f6',
      knowledge: '#22c55e',
      workflow: '#a855f7',
      file: '#f59e0b'
    };
    return colors[type] || '#6b7280';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Knowledge Graph</h2>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Agents</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Knowledge</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span>Workflows</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Files</span>
          </div>
        </div>
      </div>

      <svg ref={svgRef} width={width} height={height} className="border rounded"></svg>

      <div className="mt-4 text-sm text-gray-600">
        <p>• Click and drag nodes to explore relationships</p>
        <p>• Larger nodes indicate higher activity/importance</p>
        <p>• Line thickness shows connection strength</p>
      </div>
    </div>
  );
};

const getMockGraphData = () => ({
  nodes: [
    { id: 'ba', label: 'BA Agent', type: 'agent' as const, value: 8 },
    { id: 'arch', label: 'Architect', type: 'agent' as const, value: 10 },
    { id: 'eng', label: 'Engineer', type: 'agent' as const, value: 15 },
    { id: 'sec', label: 'Security', type: 'agent' as const, value: 6 },
    { id: 'qa', label: 'QA', type: 'agent' as const, value: 12 },
    { id: 'wf1', label: 'OAuth Flow', type: 'workflow' as const, value: 5 },
    { id: 'wf2', label: 'Payment API', type: 'workflow' as const, value: 4 },
    { id: 'kb1', label: 'Auth Patterns', type: 'knowledge' as const, value: 8 },
    { id: 'kb2', label: 'Security Best Practices', type: 'knowledge' as const, value: 10 },
    { id: 'f1', label: 'AuthController.ts', type: 'file' as const, value: 3 },
    { id: 'f2', label: 'SecurityMiddleware.ts', type: 'file' as const, value: 4 }
  ],
  links: [
    { source: 'ba', target: 'arch', value: 10, label: '45 interactions' },
    { source: 'arch', target: 'eng', value: 15, label: '67 interactions' },
    { source: 'eng', target: 'sec', value: 8, label: '34 interactions' },
    { source: 'sec', target: 'qa', value: 6, label: '28 interactions' },
    { source: 'wf1', target: 'ba', value: 5 },
    { source: 'wf1', target: 'eng', value: 8 },
    { source: 'wf2', target: 'arch', value: 6 },
    { source: 'kb1', target: 'eng', value: 12 },
    { source: 'kb2', target: 'sec', value: 10 },
    { source: 'f1', target: 'eng', value: 5 },
    { source: 'f2', target: 'sec', value: 4 }
  ]
});

export default KnowledgeGraphVisualization;
