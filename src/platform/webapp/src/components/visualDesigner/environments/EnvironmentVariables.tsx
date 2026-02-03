/**
 * EnvironmentVariables Component
 * Manage environment-specific variables and secrets
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  InputAdornment,
  Menu,
  Divider,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ShowIcon,
  VisibilityOff as HideIcon,
  ContentCopy as CopyIcon,
  Upload as ImportIcon,
  Download as ExportIcon,
  Search as SearchIcon,
  Key as SecretIcon,
  TextFields as PlainIcon,
  Link as RefIcon,
  MoreVert as MoreIcon,
  Check as CheckIcon,
  CloudSync as SyncIcon,
} from '@mui/icons-material';

import {
  Environment,
  EnvironmentVariablesProps,
  EnvironmentVariable,
  VariableType,
  BulkImportResult,
  ENVIRONMENT_COLORS,
  ENVIRONMENT_DISPLAY_NAMES,
} from './types';
import {
  validateVariableKey,
  validateVariableValue,
  validateBulkImport,
  findUnresolvedReferences,
} from './utils';

/**
 * Get variable type icon
 */
function getVariableTypeIcon(type: VariableType) {
  switch (type) {
    case 'secret':
      return <SecretIcon sx={{ fontSize: 16 }} />;
    case 'reference':
      return <RefIcon sx={{ fontSize: 16 }} />;
    default:
      return <PlainIcon sx={{ fontSize: 16 }} />;
  }
}

/**
 * Variable row component
 */
interface VariableRowProps {
  variable: EnvironmentVariable;
  readOnly: boolean;
  onEdit: (variable: EnvironmentVariable) => void;
  onDelete: (key: string) => void;
}

function VariableRow({ variable, readOnly, onEdit, onDelete }: VariableRowProps) {
  const [showValue, setShowValue] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(variable.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [variable.value]);

  const displayValue = useMemo(() => {
    if (variable.type === 'secret' && !showValue) {
      return '********';
    }
    return variable.value;
  }, [variable.type, variable.value, showValue]);

  // Check for unresolved references
  const unresolvedRefs = useMemo(() => {
    if (variable.type === 'reference') {
      return findUnresolvedReferences(variable.value);
    }
    return [];
  }, [variable.type, variable.value]);

  return (
    <TableRow
      sx={{
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {/* Type */}
      <TableCell sx={{ width: 80 }}>
        <Tooltip title={variable.type}>
          <Chip
            icon={getVariableTypeIcon(variable.type)}
            label={variable.type}
            size="small"
            variant="outlined"
            sx={{
              height: 24,
              '& .MuiChip-label': { px: 0.5, fontSize: 11 },
              '& .MuiChip-icon': { ml: 0.5 },
            }}
          />
        </Tooltip>
      </TableCell>

      {/* Key */}
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="body2"
            sx={{ fontFamily: 'monospace', fontWeight: 500 }}
          >
            {variable.key}
          </Typography>
          {variable.isRequired && (
            <Chip
              label="Required"
              size="small"
              color="primary"
              sx={{ height: 18, '& .MuiChip-label': { px: 0.5, fontSize: 9 } }}
            />
          )}
        </Box>
        {variable.description && (
          <Typography variant="caption" color="text.secondary">
            {variable.description}
          </Typography>
        )}
      </TableCell>

      {/* Value */}
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              color: variable.type === 'secret' ? 'text.disabled' : 'text.primary',
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayValue}
          </Typography>

          {variable.type === 'secret' && (
            <IconButton
              size="small"
              onClick={() => setShowValue(!showValue)}
            >
              {showValue ? (
                <HideIcon sx={{ fontSize: 16 }} />
              ) : (
                <ShowIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          )}

          <Tooltip title={copied ? 'Copied!' : 'Copy value'}>
            <IconButton size="small" onClick={handleCopy}>
              {copied ? (
                <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
              ) : (
                <CopyIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          </Tooltip>
        </Box>

        {unresolvedRefs.length > 0 && (
          <Typography variant="caption" color="error">
            Unresolved: {unresolvedRefs.join(', ')}
          </Typography>
        )}
      </TableCell>

      {/* Source */}
      <TableCell sx={{ width: 100 }}>
        <Chip
          label={variable.secretArn ? 'AWS SM' : 'Local'}
          size="small"
          variant="outlined"
          sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: 10 } }}
        />
      </TableCell>

      {/* Actions */}
      <TableCell align="right" sx={{ width: 100 }}>
        {!readOnly && (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            <IconButton size="small" onClick={() => onEdit(variable)}>
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => onDelete(variable.key)}
            >
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        )}
      </TableCell>
    </TableRow>
  );
}

/**
 * Variable edit dialog
 */
interface VariableDialogProps {
  open: boolean;
  variable: Partial<EnvironmentVariable> | null;
  onClose: () => void;
  onSave: (variable: EnvironmentVariable) => void;
  existingKeys: string[];
}

function VariableDialog({
  open,
  variable,
  onClose,
  onSave,
  existingKeys,
}: VariableDialogProps) {
  const isEdit = variable?.id !== undefined;

  const [key, setKey] = useState(variable?.key || '');
  const [value, setValue] = useState(variable?.value || '');
  const [type, setType] = useState<VariableType>(variable?.type || 'plain');
  const [description, setDescription] = useState(variable?.description || '');
  const [isRequired, setIsRequired] = useState(variable?.isRequired || false);
  const [showValue, setShowValue] = useState(type !== 'secret');
  const [errors, setErrors] = useState<string[]>([]);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setKey(variable?.key || '');
      setValue(variable?.value || '');
      setType(variable?.type || 'plain');
      setDescription(variable?.description || '');
      setIsRequired(variable?.isRequired || false);
      setShowValue((variable?.type || 'plain') !== 'secret');
      setErrors([]);
    }
  }, [open, variable]);

  const handleSave = useCallback(() => {
    const newErrors: string[] = [];

    // Validate key
    const keyValidation = validateVariableKey(key);
    if (!keyValidation.isValid) {
      newErrors.push(...keyValidation.errors.map((e) => e.message));
    }

    // Check for duplicate keys (only for new variables)
    if (!isEdit && existingKeys.includes(key)) {
      newErrors.push(`Variable key '${key}' already exists`);
    }

    // Validate value
    const valueValidation = validateVariableValue(value, { key, type });
    if (!valueValidation.isValid) {
      newErrors.push(...valueValidation.errors.map((e) => e.message));
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const now = new Date();
    onSave({
      id: variable?.id || crypto.randomUUID(),
      key,
      value,
      type,
      description: description || undefined,
      isRequired,
      createdAt: variable?.createdAt || now,
      updatedAt: now,
      createdBy: variable?.createdBy || 'current-user',
      updatedBy: 'current-user',
    });
  }, [key, value, type, description, isRequired, variable, isEdit, existingKeys, onSave]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Variable' : 'Add Variable'}</DialogTitle>
      <DialogContent>
        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.map((error, i) => (
              <div key={i}>{error}</div>
            ))}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Key"
          value={key}
          onChange={(e) => setKey(e.target.value.toUpperCase())}
          margin="normal"
          placeholder="e.g., DATABASE_URL"
          helperText="Use uppercase letters and underscores"
          disabled={isEdit}
        />

        <FormControl fullWidth margin="normal">
          <InputLabel>Type</InputLabel>
          <Select
            value={type}
            label="Type"
            onChange={(e) => {
              setType(e.target.value as VariableType);
              setShowValue(e.target.value !== 'secret');
            }}
          >
            <MenuItem value="plain">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getVariableTypeIcon('plain')} Plain Text
              </Box>
            </MenuItem>
            <MenuItem value="secret">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getVariableTypeIcon('secret')} Secret
              </Box>
            </MenuItem>
            <MenuItem value="reference">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getVariableTypeIcon('reference')} Reference
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          margin="normal"
          type={showValue ? 'text' : 'password'}
          placeholder={
            type === 'reference'
              ? 'e.g., ${DB_HOST}:${DB_PORT}'
              : 'Enter value'
          }
          helperText={
            type === 'reference'
              ? 'Use ${VAR_NAME} to reference other variables'
              : type === 'secret'
              ? 'This value will be encrypted'
              : undefined
          }
          InputProps={{
            endAdornment:
              type === 'secret' ? (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowValue(!showValue)}
                    edge="end"
                  >
                    {showValue ? <HideIcon /> : <ShowIcon />}
                  </IconButton>
                </InputAdornment>
              ) : undefined,
          }}
        />

        <TextField
          fullWidth
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          margin="normal"
          multiline
          rows={2}
          placeholder="Describe what this variable is used for"
        />

        <FormControlLabel
          control={
            <Switch
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
            />
          }
          label="Required variable"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          {isEdit ? 'Save Changes' : 'Add Variable'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function EnvironmentVariables({
  environment,
  readOnly = false,
  secretsManagerIntegration = false,
  onVariableChange,
  onVariableDelete,
}: EnvironmentVariablesProps) {
  // Local state
  const [variables, setVariables] = useState<EnvironmentVariable[]>([
    {
      id: '1',
      key: 'APP_NAME',
      value: 'catalyst-platform',
      type: 'plain',
      isRequired: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      updatedBy: 'system',
    },
    {
      id: '2',
      key: 'API_VERSION',
      value: 'v2.1.0',
      type: 'plain',
      isRequired: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin',
      updatedBy: 'admin',
    },
    {
      id: '3',
      key: 'DATABASE_URL',
      value: 'postgresql://user:pass@localhost:5432/db',
      type: 'secret',
      description: 'Primary database connection string',
      secretArn: 'arn:aws:secretsmanager:us-east-1:123456789:secret:db-url',
      isRequired: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin',
      updatedBy: 'admin',
    },
    {
      id: '4',
      key: 'API_ENDPOINT',
      value: '${API_HOST}:${API_PORT}/api/${API_VERSION}',
      type: 'reference',
      description: 'Full API endpoint URL',
      isRequired: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin',
      updatedBy: 'admin',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<VariableType | 'all'>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<
    Partial<EnvironmentVariable> | null
  >(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [importMenuAnchor, setImportMenuAnchor] = useState<null | HTMLElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered variables
  const filteredVariables = useMemo(() => {
    return variables.filter((v) => {
      const matchesSearch =
        searchQuery === '' ||
        v.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.value.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || v.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [variables, searchQuery, typeFilter]);

  // Existing keys for validation
  const existingKeys = useMemo(() => variables.map((v) => v.key), [variables]);

  // Handle add/edit
  const handleOpenAdd = useCallback(() => {
    setEditingVariable({});
    setEditDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((variable: EnvironmentVariable) => {
    setEditingVariable(variable);
    setEditDialogOpen(true);
  }, []);

  const handleSaveVariable = useCallback(
    (variable: EnvironmentVariable) => {
      setVariables((prev) => {
        const existingIndex = prev.findIndex((v) => v.id === variable.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = variable;
          return updated;
        }
        return [...prev, variable];
      });
      setEditDialogOpen(false);
      onVariableChange?.(variable.key, variable);
    },
    [onVariableChange]
  );

  // Handle delete
  const handleConfirmDelete = useCallback((key: string) => {
    setDeletingKey(key);
    setDeleteDialogOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    if (deletingKey) {
      setVariables((prev) => prev.filter((v) => v.key !== deletingKey));
      onVariableDelete?.(deletingKey);
    }
    setDeleteDialogOpen(false);
    setDeletingKey(null);
  }, [deletingKey, onVariableDelete]);

  // Handle import
  const handleImportClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setImportMenuAnchor(event.currentTarget);
  }, []);

  const handleImportFile = useCallback(
    (format: 'json' | 'csv') => {
      setImportMenuAnchor(null);
      fileInputRef.current?.click();
    },
    []
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          let data: Array<{ key: string; value: string; type?: string }>;

          if (file.name.endsWith('.json')) {
            data = JSON.parse(content);
          } else {
            // Simple CSV parsing
            const lines = content.split('\n');
            data = lines.slice(1).map((line) => {
              const [key, value, type] = line.split(',');
              return { key: key?.trim(), value: value?.trim(), type: type?.trim() };
            });
          }

          const validation = validateBulkImport(data);
          if (!validation.isValid) {
            alert(validation.errors.map((e) => e.message).join('\n'));
            return;
          }

          // Import variables
          const imported = data.map(
            (item): EnvironmentVariable => ({
              id: crypto.randomUUID(),
              key: item.key,
              value: item.value,
              type: (item.type as VariableType) || 'plain',
              isRequired: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'import',
              updatedBy: 'import',
            })
          );

          setVariables((prev) => {
            const newVars = [...prev];
            imported.forEach((v) => {
              const existingIndex = newVars.findIndex((n) => n.key === v.key);
              if (existingIndex >= 0) {
                newVars[existingIndex] = v;
              } else {
                newVars.push(v);
              }
            });
            return newVars;
          });

          alert(`Imported ${imported.length} variable(s)`);
        } catch (error) {
          alert('Failed to parse import file');
        }
      };
      reader.readAsText(file);

      // Reset input
      event.target.value = '';
    },
    []
  );

  // Handle export
  const handleExport = useCallback(
    (format: 'json' | 'csv') => {
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'json') {
        content = JSON.stringify(
          variables.map((v) => ({
            key: v.key,
            value: v.type === 'secret' ? '********' : v.value,
            type: v.type,
            description: v.description,
          })),
          null,
          2
        );
        filename = `env-vars-${environment}-${new Date().toISOString()}.json`;
        mimeType = 'application/json';
      } else {
        const header = 'key,value,type,description\n';
        const rows = variables
          .map(
            (v) =>
              `${v.key},${v.type === 'secret' ? '********' : v.value},${v.type},${v.description || ''}`
          )
          .join('\n');
        content = header + rows;
        filename = `env-vars-${environment}-${new Date().toISOString()}.csv`;
        mimeType = 'text/csv';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [variables, environment]
  );

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h6">
          {ENVIRONMENT_DISPLAY_NAMES[environment]} Variables
        </Typography>

        {!readOnly && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<ImportIcon />}
              variant="outlined"
              size="small"
              onClick={handleImportClick}
            >
              Import
            </Button>
            <Button
              startIcon={<ExportIcon />}
              variant="outlined"
              size="small"
              onClick={() => handleExport('json')}
            >
              Export
            </Button>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              size="small"
              onClick={handleOpenAdd}
            >
              Add Variable
            </Button>
          </Box>
        )}
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search variables..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, maxWidth: 300 }}
        />

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={typeFilter}
            label="Type"
            onChange={(e) =>
              setTypeFilter(e.target.value as VariableType | 'all')
            }
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="plain">Plain</MenuItem>
            <MenuItem value="secret">Secret</MenuItem>
            <MenuItem value="reference">Reference</MenuItem>
          </Select>
        </FormControl>

        {secretsManagerIntegration && (
          <Button startIcon={<SyncIcon />} variant="outlined" size="small">
            Sync with AWS SM
          </Button>
        )}
      </Box>

      {/* Variables table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell>Type</TableCell>
              <TableCell>Key</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Source</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredVariables.length > 0 ? (
              filteredVariables.map((variable) => (
                <VariableRow
                  key={variable.id}
                  variable={variable}
                  readOnly={readOnly}
                  onEdit={handleOpenEdit}
                  onDelete={handleConfirmDelete}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {searchQuery || typeFilter !== 'all'
                      ? 'No variables match your filters'
                      : 'No variables defined yet'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mt: 2,
          color: 'text.secondary',
        }}
      >
        <Typography variant="caption">
          Total: {variables.length} variable(s)
        </Typography>
        <Typography variant="caption">
          Secrets: {variables.filter((v) => v.type === 'secret').length}
        </Typography>
        <Typography variant="caption">
          Required: {variables.filter((v) => v.isRequired).length}
        </Typography>
      </Box>

      {/* Add/Edit dialog */}
      <VariableDialog
        open={editDialogOpen}
        variable={editingVariable}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleSaveVariable}
        existingKeys={existingKeys}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Variable?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the variable{' '}
            <strong>{deletingKey}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import menu */}
      <Menu
        anchorEl={importMenuAnchor}
        open={Boolean(importMenuAnchor)}
        onClose={() => setImportMenuAnchor(null)}
      >
        <MenuItem onClick={() => handleImportFile('json')}>
          Import from JSON
        </MenuItem>
        <MenuItem onClick={() => handleImportFile('csv')}>
          Import from CSV
        </MenuItem>
      </Menu>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </Box>
  );
}

export default EnvironmentVariables;
