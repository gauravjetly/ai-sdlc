/**
 * NodePalette Component
 * Draggable node list for adding services to the canvas
 */

import React, { useState, useMemo, useCallback, DragEvent } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Chip,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import { NODE_DEFINITIONS, NodeDefinition, getCategories } from './nodes/nodeTypes';
import { LAYER_COLORS } from './nodes/BaseNode';
import { LayerType } from '../../contexts/DesignWizardContext';

interface NodePaletteProps {
  currentLayer?: LayerType | null;
  onNodeDragStart?: (event: DragEvent, nodeData: NodeDefinition) => void;
}

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  network: 'Network',
  compute: 'Compute',
  database: 'Database',
  storage: 'Storage',
  loadBalancing: 'Load Balancing',
  messaging: 'Messaging',
  monitoring: 'Monitoring',
  security: 'Security',
  cicd: 'CI/CD',
};

// Category order
const CATEGORY_ORDER = [
  'network',
  'compute',
  'database',
  'storage',
  'loadBalancing',
  'messaging',
  'monitoring',
  'security',
  'cicd',
];

/**
 * Single draggable node item
 */
interface NodeItemProps {
  node: NodeDefinition;
  onDragStart: (event: DragEvent, node: NodeDefinition) => void;
}

function NodeItem({ node, onDragStart }: NodeItemProps) {
  const IconComponent = node.icon;
  const layerColor = LAYER_COLORS[node.layer];

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLLIElement>) => {
      event.dataTransfer.setData(
        'application/reactflow',
        JSON.stringify({
          type: node.type,
          layer: node.layer,
          label: node.label,
          defaultConfig: node.defaultConfig,
        })
      );
      event.dataTransfer.effectAllowed = 'move';
      onDragStart(event, node);
    },
    [node, onDragStart]
  );

  return (
    <Tooltip title={node.description} placement="right" arrow>
      <ListItem
        draggable
        onDragStart={handleDragStart}
        sx={{
          cursor: 'grab',
          borderRadius: 1,
          mb: 0.5,
          border: '1px solid transparent',
          '&:hover': {
            bgcolor: alpha(layerColor, 0.08),
            borderColor: alpha(layerColor, 0.3),
          },
          '&:active': {
            cursor: 'grabbing',
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 36, color: layerColor }}>
          <IconComponent />
        </ListItemIcon>
        <ListItemText
          primary={node.label}
          primaryTypographyProps={{
            variant: 'body2',
            noWrap: true,
          }}
        />
        <DragIcon
          sx={{
            fontSize: 16,
            color: 'text.disabled',
            opacity: 0,
            transition: 'opacity 0.2s',
            '.MuiListItem-root:hover &': {
              opacity: 1,
            },
          }}
        />
      </ListItem>
    </Tooltip>
  );
}

/**
 * Node category accordion
 */
interface NodeCategoryProps {
  category: string;
  nodes: NodeDefinition[];
  expanded: boolean;
  onToggle: () => void;
  onNodeDragStart: (event: DragEvent, node: NodeDefinition) => void;
}

function NodeCategory({
  category,
  nodes,
  expanded,
  onToggle,
  onNodeDragStart,
}: NodeCategoryProps) {
  if (nodes.length === 0) return null;

  // Get primary layer color for this category
  const primaryLayer = nodes[0]?.layer || 'platform';
  const layerColor = LAYER_COLORS[primaryLayer];

  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      disableGutters
      elevation={0}
      sx={{
        bgcolor: 'transparent',
        '&:before': { display: 'none' },
        '& .MuiAccordionSummary-root': {
          minHeight: 40,
          '&.Mui-expanded': {
            minHeight: 40,
          },
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          px: 1,
          '& .MuiAccordionSummary-content': {
            my: 0.5,
            alignItems: 'center',
            gap: 1,
          },
        }}
      >
        <Box
          sx={{
            width: 4,
            height: 20,
            bgcolor: layerColor,
            borderRadius: 1,
          }}
        />
        <Typography variant="subtitle2">
          {CATEGORY_LABELS[category] || category}
        </Typography>
        <Chip
          label={nodes.length}
          size="small"
          sx={{
            height: 18,
            fontSize: '0.7rem',
            bgcolor: alpha(layerColor, 0.1),
            color: layerColor,
          }}
        />
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0, pl: 1 }}>
        <List dense disablePadding>
          {nodes.map((node) => (
            <NodeItem
              key={node.type}
              node={node}
              onDragStart={onNodeDragStart}
            />
          ))}
        </List>
      </AccordionDetails>
    </Accordion>
  );
}

/**
 * Main NodePalette component
 */
export function NodePalette({ currentLayer, onNodeDragStart }: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(CATEGORY_ORDER)
  );

  // Filter nodes by search and layer
  const filteredNodes = useMemo(() => {
    let nodes = NODE_DEFINITIONS;

    // Filter by layer if specified
    if (currentLayer && currentLayer !== 'fullstack') {
      nodes = nodes.filter((node) => node.layer === currentLayer);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      nodes = nodes.filter(
        (node) =>
          node.label.toLowerCase().includes(query) ||
          node.description.toLowerCase().includes(query) ||
          node.type.toLowerCase().includes(query)
      );
    }

    return nodes;
  }, [currentLayer, searchQuery]);

  // Group nodes by category
  const nodesByCategory = useMemo(() => {
    const grouped: Record<string, NodeDefinition[]> = {};
    for (const category of CATEGORY_ORDER) {
      grouped[category] = filteredNodes.filter((node) => node.category === category);
    }
    return grouped;
  }, [filteredNodes]);

  // Toggle category expansion
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // Handle node drag start
  const handleNodeDragStart = useCallback(
    (event: DragEvent, node: NodeDefinition) => {
      onNodeDragStart?.(event, node);
    },
    [onNodeDragStart]
  );

  // Expand all / collapse all based on search
  React.useEffect(() => {
    if (searchQuery.trim()) {
      // Expand all when searching
      setExpandedCategories(new Set(CATEGORY_ORDER));
    }
  }, [searchQuery]);

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Services
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        {currentLayer && currentLayer !== 'fullstack' && (
          <Chip
            label={`${currentLayer} layer`}
            size="small"
            sx={{
              mt: 1,
              bgcolor: alpha(LAYER_COLORS[currentLayer], 0.1),
              color: LAYER_COLORS[currentLayer],
              textTransform: 'capitalize',
            }}
            onDelete={() => {
              // This would need to be handled by parent
            }}
          />
        )}
      </Box>

      {/* Category list */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {filteredNodes.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary" variant="body2">
              No services found
            </Typography>
          </Box>
        ) : (
          CATEGORY_ORDER.map((category) => (
            <NodeCategory
              key={category}
              category={category}
              nodes={nodesByCategory[category]}
              expanded={expandedCategories.has(category)}
              onToggle={() => toggleCategory(category)}
              onNodeDragStart={handleNodeDragStart}
            />
          ))
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Drag services to add them to the canvas
        </Typography>
      </Box>
    </Box>
  );
}

export default NodePalette;
