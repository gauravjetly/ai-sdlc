/**
 * TagsEditor Component
 * Key-value tags input for AWS resource tagging
 */

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { Tag } from '../../../../types/network';

export interface TagsEditorProps {
  tags: Tag[];
  onChange: (tags: Tag[]) => void;
  maxTags?: number;
  disabled?: boolean;
}

export function TagsEditor({
  tags,
  onChange,
  maxTags = 50,
  disabled = false,
}: TagsEditorProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [keyError, setKeyError] = useState('');

  const handleAddTag = () => {
    // Validate key
    if (!newKey.trim()) {
      setKeyError('Key is required');
      return;
    }

    // Check for duplicate keys
    if (tags.some((t) => t.key.toLowerCase() === newKey.toLowerCase())) {
      setKeyError('Key already exists');
      return;
    }

    // Check max tags
    if (tags.length >= maxTags) {
      setKeyError(`Maximum ${maxTags} tags allowed`);
      return;
    }

    // Add tag
    onChange([...tags, { key: newKey.trim(), value: newValue.trim() }]);
    setNewKey('');
    setNewValue('');
    setKeyError('');
  };

  const handleRemoveTag = (keyToRemove: string) => {
    onChange(tags.filter((t) => t.key !== keyToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Box>
      <Typography variant="body2" fontWeight={500} gutterBottom>
        Tags (Optional)
      </Typography>

      {tags.length > 0 && (
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Key</TableCell>
                <TableCell>Value</TableCell>
                <TableCell width={50} align="center">
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tags.map((tag) => (
                <TableRow key={tag.key}>
                  <TableCell>{tag.key}</TableCell>
                  <TableCell>{tag.value || '-'}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveTag(tag.key)}
                      disabled={disabled}
                      aria-label={`Remove tag ${tag.key}`}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          label="Key"
          size="small"
          value={newKey}
          onChange={(e) => {
            setNewKey(e.target.value);
            setKeyError('');
          }}
          onKeyDown={handleKeyDown}
          error={!!keyError}
          helperText={keyError}
          disabled={disabled || tags.length >= maxTags}
          placeholder="e.g., Environment"
          sx={{ flex: 1 }}
          inputProps={{
            'aria-label': 'Tag key',
          }}
        />
        <TextField
          label="Value"
          size="small"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || tags.length >= maxTags}
          placeholder="e.g., Production"
          sx={{ flex: 1 }}
          inputProps={{
            'aria-label': 'Tag value',
          }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleAddTag}
          disabled={disabled || tags.length >= maxTags}
          startIcon={<AddIcon />}
          sx={{ minWidth: 80, height: 40 }}
        >
          Add
        </Button>
      </Box>

      {tags.length >= maxTags && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Maximum {maxTags} tags reached
        </Typography>
      )}
    </Box>
  );
}

export default TagsEditor;
