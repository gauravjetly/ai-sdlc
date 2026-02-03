/**
 * TemplateSearch Component
 * Search input with debouncing and history
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Popper,
  ClickAwayListener,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface TemplateSearchProps {
  value: string;
  onChange: (value: string) => void;
  searchHistory?: string[];
  onClearHistory?: () => void;
  placeholder?: string;
  isSearching?: boolean;
}

export function TemplateSearch({
  value,
  onChange,
  searchHistory = [],
  onClearHistory,
  placeholder = 'Search templates by name, description, or tags...',
  isSearching = false,
}: TemplateSearchProps) {
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const hasHistory = searchHistory.length > 0;
  const open = showHistory && hasHistory && !value;

  // Keyboard shortcut to focus search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setAnchorEl(event.currentTarget);
    setShowHistory(true);
  };

  const handleBlur = () => {
    // Delay to allow click on history items
    setTimeout(() => setShowHistory(false), 200);
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const handleHistoryClick = (term: string) => {
    onChange(term);
    setShowHistory(false);
  };

  const handleClearHistory = () => {
    onClearHistory?.();
    setShowHistory(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (value) {
        handleClear();
      } else {
        inputRef.current?.blur();
      }
    }
  };

  return (
    <ClickAwayListener onClickAway={() => setShowHistory(false)}>
      <Box sx={{ position: 'relative', width: '100%', maxWidth: 400 }}>
        <TextField
          inputRef={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          size="small"
          fullWidth
          role="searchbox"
          aria-label="Search templates"
          aria-describedby="search-instructions"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon
                  color={isSearching ? 'primary' : 'action'}
                  sx={{
                    animation: isSearching ? 'pulse 1s infinite' : 'none',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                    },
                  }}
                />
              </InputAdornment>
            ),
            endAdornment: value && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={handleClear}
                  aria-label="Clear search"
                  edge="end"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.paper',
            },
          }}
        />

        {/* Screen reader instructions */}
        <span id="search-instructions" style={{ display: 'none' }}>
          Type at least 2 characters to search. Press Escape to clear.
        </span>

        {/* Keyboard shortcut hint */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            position: 'absolute',
            right: value ? 40 : 12,
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: 0.6,
            display: { xs: 'none', md: 'block' },
            pointerEvents: 'none',
          }}
        >
          {value ? '' : 'Ctrl+K'}
        </Typography>

        {/* Search history dropdown */}
        <Popper
          open={open}
          anchorEl={anchorEl}
          placement="bottom-start"
          style={{ width: anchorEl?.offsetWidth, zIndex: theme.zIndex.modal }}
        >
          <Paper
            elevation={8}
            sx={{
              mt: 0.5,
              maxHeight: 280,
              overflow: 'auto',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 2,
                py: 1,
                bgcolor: 'grey.50',
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                Recent Searches
              </Typography>
              <IconButton
                size="small"
                onClick={handleClearHistory}
                aria-label="Clear search history"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            <Divider />
            <List dense disablePadding>
              {searchHistory.map((term, index) => (
                <ListItemButton
                  key={`${term}-${index}`}
                  onClick={() => handleHistoryClick(term)}
                  sx={{ py: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <HistoryIcon fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary={term}
                    primaryTypographyProps={{
                      variant: 'body2',
                      noWrap: true,
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}

export default TemplateSearch;
