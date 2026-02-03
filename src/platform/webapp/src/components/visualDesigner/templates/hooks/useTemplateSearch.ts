/**
 * Template Search Hook
 * Debounced search with history management
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedCallback } from 'use-debounce';

interface UseTemplateSearchOptions {
  syncWithUrl?: boolean;
  debounceMs?: number;
  minSearchLength?: number;
  maxHistory?: number;
}

interface UseTemplateSearchResult {
  searchTerm: string;
  debouncedTerm: string;
  setSearchTerm: (term: string) => void;
  clearSearch: () => void;
  searchHistory: string[];
  addToHistory: (term: string) => void;
  clearHistory: () => void;
  isSearching: boolean;
}

const SEARCH_HISTORY_KEY = 'template_search_history';

/**
 * Hook for managing debounced search with optional URL sync and history
 */
export function useTemplateSearch(
  options: UseTemplateSearchOptions = {}
): UseTemplateSearchResult {
  const {
    syncWithUrl = true,
    debounceMs = 300,
    minSearchLength = 2,
    maxHistory = 5,
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize search term from URL
  const initialTerm = syncWithUrl ? searchParams.get('search') || '' : '';

  const [searchTerm, setSearchTermState] = useState(initialTerm);
  const [debouncedTerm, setDebouncedTerm] = useState(initialTerm);
  const [isSearching, setIsSearching] = useState(false);

  // Load history from localStorage
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Debounced search handler
  const debouncedSetSearch = useDebouncedCallback((term: string) => {
    setDebouncedTerm(term.length >= minSearchLength ? term : '');
    setIsSearching(false);
  }, debounceMs);

  // Update search term
  const setSearchTerm = useCallback(
    (term: string) => {
      setSearchTermState(term);
      setIsSearching(true);
      debouncedSetSearch(term);

      // Update URL
      if (syncWithUrl) {
        const newParams = new URLSearchParams(searchParams);
        if (term) {
          newParams.set('search', term);
        } else {
          newParams.delete('search');
        }
        setSearchParams(newParams, { replace: true });
      }
    },
    [debouncedSetSearch, syncWithUrl, searchParams, setSearchParams]
  );

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchTermState('');
    setDebouncedTerm('');
    setIsSearching(false);

    if (syncWithUrl) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('search');
      setSearchParams(newParams, { replace: true });
    }
  }, [syncWithUrl, searchParams, setSearchParams]);

  // Add term to history
  const addToHistory = useCallback(
    (term: string) => {
      if (!term || term.length < minSearchLength) return;

      setSearchHistory((prev) => {
        // Remove if already exists, add to front
        const filtered = prev.filter((h) => h.toLowerCase() !== term.toLowerCase());
        const newHistory = [term, ...filtered].slice(0, maxHistory);

        // Persist to localStorage
        try {
          localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
        } catch {
          // Ignore localStorage errors
        }

        return newHistory;
      });
    },
    [minSearchLength, maxHistory]
  );

  // Clear history
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Add to history when search is executed (debounced term changes)
  useEffect(() => {
    if (debouncedTerm) {
      addToHistory(debouncedTerm);
    }
  }, [debouncedTerm, addToHistory]);

  return {
    searchTerm,
    debouncedTerm,
    setSearchTerm,
    clearSearch,
    searchHistory,
    addToHistory,
    clearHistory,
    isSearching,
  };
}

export default useTemplateSearch;
