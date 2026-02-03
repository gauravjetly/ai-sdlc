/**
 * Toolbar Component
 * Top toolbar for the Visual Designer with actions and controls
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Typography,
  Chip,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Save as SaveIcon,
  CloudUpload as DeployIcon,
  Download as ExportIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Check as CheckIcon,
  MoreVert as MoreIcon,
  Bookmark as TemplateIcon,
  Share as ShareIcon,
  DeleteOutline as ClearIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import {
  EnvironmentSwitcher,
} from './environments';
import {
  LayerSelector,
} from './layers';
import { LayerType, Environment } from '../../contexts/DesignWizardContext';

interface ToolbarProps {
  // Actions
  onSave: () => void;
  onDeploy: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSaveAsTemplate?: () => void;
  onClearCanvas?: () => void;
  onHelp?: () => void;

  // State
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  isDeploying: boolean;
  hasUnsavedChanges: boolean;
  lastSaved?: Date | null;

  // Layer
  currentLayer: LayerType | null;
  onLayerChange: (layer: LayerType) => void;
  layerStatus: Record<LayerType, 'pending' | 'complete' | 'deployed'>;

  // Environment
  currentEnvironment: Environment;
  onEnvironmentChange: (env: Environment) => void;

  // Validation
  validationErrors?: number;
  canDeploy: boolean;
}

/**
 * Format last saved time
 */
function formatLastSaved(date: Date | null | undefined): string {
  if (!date) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just saved';
  if (diffMins < 60) return `Saved ${diffMins}m ago`;
  return `Saved ${Math.floor(diffMins / 60)}h ago`;
}

/**
 * Toolbar component
 */
export function Toolbar({
  onSave,
  onDeploy,
  onExport,
  onUndo,
  onRedo,
  onSaveAsTemplate,
  onClearCanvas,
  onHelp,
  canUndo,
  canRedo,
  isSaving,
  isDeploying,
  hasUnsavedChanges,
  lastSaved,
  currentLayer,
  onLayerChange,
  layerStatus,
  currentEnvironment,
  onEnvironmentChange,
  validationErrors = 0,
  canDeploy,
}: ToolbarProps) {
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMoreClick = (event: React.MouseEvent<HTMLElement>) => {
    setMoreMenuAnchor(event.currentTarget);
  };

  const handleMoreClose = () => {
    setMoreMenuAnchor(null);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        minHeight: 56,
      }}
    >
      {/* Environment Switcher */}
      <EnvironmentSwitcher
        currentEnvironment={currentEnvironment}
        onEnvironmentChange={onEnvironmentChange}
        size="small"
      />

      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

      {/* Layer Selector */}
      <LayerSelector
        currentLayer={currentLayer}
        onLayerChange={onLayerChange}
        layerStatus={layerStatus}
      />

      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

      {/* Save Button */}
      <Tooltip title={hasUnsavedChanges ? 'Save changes (Ctrl+S)' : 'All changes saved'}>
        <span>
          <Button
            variant={hasUnsavedChanges ? 'contained' : 'outlined'}
            size="small"
            startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
            onClick={onSave}
            disabled={isSaving || !hasUnsavedChanges}
            sx={{ minWidth: 100 }}
          >
            {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save' : 'Saved'}
          </Button>
        </span>
      </Tooltip>

      {/* Last saved indicator */}
      {lastSaved && !hasUnsavedChanges && (
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          {formatLastSaved(lastSaved)}
        </Typography>
      )}

      {/* Validation errors badge */}
      {validationErrors > 0 && (
        <Chip
          label={`${validationErrors} error${validationErrors !== 1 ? 's' : ''}`}
          size="small"
          color="error"
          sx={{ ml: 1 }}
        />
      )}

      <Box sx={{ flex: 1 }} />

      {/* Undo/Redo */}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title="Undo (Ctrl+Z)">
          <span>
            <IconButton size="small" onClick={onUndo} disabled={!canUndo}>
              <UndoIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Redo (Ctrl+Y)">
          <span>
            <IconButton size="small" onClick={onRedo} disabled={!canRedo}>
              <RedoIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

      {/* Export Button */}
      <Tooltip title="Export Terraform">
        <span>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ExportIcon />}
            onClick={onExport}
            sx={{ minWidth: 100 }}
          >
            Export
          </Button>
        </span>
      </Tooltip>

      {/* Deploy Button */}
      <Tooltip title={canDeploy ? 'Deploy to ' + currentEnvironment : 'Fix validation errors first'}>
        <span>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={isDeploying ? <CircularProgress size={16} color="inherit" /> : <DeployIcon />}
            onClick={onDeploy}
            disabled={isDeploying || !canDeploy}
            sx={{ minWidth: 100 }}
          >
            {isDeploying ? 'Deploying...' : 'Deploy'}
          </Button>
        </span>
      </Tooltip>

      {/* More menu */}
      <IconButton size="small" onClick={handleMoreClick}>
        <MoreIcon />
      </IconButton>
      <Menu
        anchorEl={moreMenuAnchor}
        open={Boolean(moreMenuAnchor)}
        onClose={handleMoreClose}
      >
        <MenuItem
          onClick={() => {
            onSaveAsTemplate?.();
            handleMoreClose();
          }}
        >
          <ListItemIcon>
            <TemplateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Save as Template</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            onClearCanvas?.();
            handleMoreClose();
          }}
        >
          <ListItemIcon>
            <ClearIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Clear Canvas</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            onHelp?.();
            handleMoreClose();
          }}
        >
          <ListItemIcon>
            <HelpIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Keyboard Shortcuts</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default Toolbar;
