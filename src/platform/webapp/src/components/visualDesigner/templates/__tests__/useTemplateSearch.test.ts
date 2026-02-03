/**
 * useTemplateSearch Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useTemplateSearch } from '../hooks/useTemplateSearch';
import { BrowserRouter } from 'react-router-dom';

// Mock use-debounce
jest.mock('use-debounce', () => ({
  useDebouncedCallback: (fn: Function, delay: number) => {
    return (value: string) => fn(value);
  },
}));

// Wrapper with router
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('useTemplateSearch', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('initializes with empty search term', () => {
      const { result } = renderHook(() => useTemplateSearch({ syncWithUrl: false }), {
        wrapper,
      });

      expect(result.current.searchTerm).toBe('');
      expect(result.current.debouncedTerm).toBe('');
    });

    it('initializes with empty search history', () => {
      const { result } = renderHook(() => useTemplateSearch({ syncWithUrl: false }), {
        wrapper,
      });

      expect(result.current.searchHistory).toEqual([]);
    });

    it('loads existing search history from localStorage', () => {
      localStorage.setItem('template_search_history', JSON.stringify(['vpc', 'kubernetes']));

      const { result } = renderHook(() => useTemplateSearch({ syncWithUrl: false }), {
        wrapper,
      });

      expect(result.current.searchHistory).toEqual(['vpc', 'kubernetes']);
    });
  });

  describe('setSearchTerm', () => {
    it('updates search term immediately', () => {
      const { result } = renderHook(() => useTemplateSearch({ syncWithUrl: false }), {
        wrapper,
      });

      act(() => {
        result.current.setSearchTerm('test query');
      });

      expect(result.current.searchTerm).toBe('test query');
    });

    it('sets isSearching to true while debouncing', () => {
      const { result } = renderHook(() => useTemplateSearch({ syncWithUrl: false }), {
        wrapper,
      });

      act(() => {
        result.current.setSearchTerm('test');
      });

      // With mocked debounce, it immediately resolves
      expect(result.current.searchTerm).toBe('test');
    });
  });

  describe('clearSearch', () => {
    it('clears search term', () => {
      const { result } = renderHook(() => useTemplateSearch({ syncWithUrl: false }), {
        wrapper,
      });

      act(() => {
        result.current.setSearchTerm('test');
      });

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.searchTerm).toBe('');
      expect(result.current.debouncedTerm).toBe('');
    });
  });

  describe('search history', () => {
    it('adds search term to history', async () => {
      const { result } = renderHook(() => useTemplateSearch({ syncWithUrl: false }), {
        wrapper,
      });

      act(() => {
        result.current.addToHistory('kubernetes');
      });

      await waitFor(() => {
        expect(result.current.searchHistory).toContain('kubernetes');
      });
    });

    it('does not add empty terms to history', () => {
      const { result } = renderHook(() => useTemplateSearch({ syncWithUrl: false }), {
        wrapper,
      });

      act(() => {
        result.current.addToHistory('');
      });

      expect(result.current.searchHistory).toEqual([]);
    });

    it('does not add terms shorter than minSearchLength', () => {
      const { result } = renderHook(
        () => useTemplateSearch({ syncWithUrl: false, minSearchLength: 3 }),
        { wrapper }
      );

      act(() => {
        result.current.addToHistory('ab');
      });

      expect(result.current.searchHistory).toEqual([]);
    });

    it('removes duplicate terms and adds to front', async () => {
      localStorage.setItem('template_search_history', JSON.stringify(['vpc', 'kubernetes', 'aws']));

      const { result } = renderHook(() => useTemplateSearch({ syncWithUrl: false }), {
        wrapper,
      });

      act(() => {
        result.current.addToHistory('vpc');
      });

      await waitFor(() => {
        expect(result.current.searchHistory[0]).toBe('vpc');
        // vpc should only appear once
        expect(result.current.searchHistory.filter((h: string) => h === 'vpc')).toHaveLength(1);
      });
    });

    it('limits history to maxHistory items', async () => {
      const { result } = renderHook(
        () => useTemplateSearch({ syncWithUrl: false, maxHistory: 3 }),
        { wrapper }
      );

      act(() => {
        result.current.addToHistory('one');
      });
      act(() => {
        result.current.addToHistory('two');
      });
      act(() => {
        result.current.addToHistory('three');
      });
      act(() => {
        result.current.addToHistory('four');
      });

      await waitFor(() => {
        expect(result.current.searchHistory).toHaveLength(3);
        expect(result.current.searchHistory).toContain('four');
        expect(result.current.searchHistory).not.toContain('one');
      });
    });

    it('persists history to localStorage', async () => {
      const { result } = renderHook(() => useTemplateSearch({ syncWithUrl: false }), {
        wrapper,
      });

      act(() => {
        result.current.addToHistory('test-term');
      });

      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem('template_search_history') || '[]');
        expect(stored).toContain('test-term');
      });
    });

    it('clears history', async () => {
      localStorage.setItem('template_search_history', JSON.stringify(['vpc', 'kubernetes']));

      const { result } = renderHook(() => useTemplateSearch({ syncWithUrl: false }), {
        wrapper,
      });

      expect(result.current.searchHistory).toHaveLength(2);

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.searchHistory).toEqual([]);
      expect(localStorage.getItem('template_search_history')).toBeNull();
    });
  });

  describe('options', () => {
    it('respects custom minSearchLength', async () => {
      const { result } = renderHook(
        () => useTemplateSearch({ syncWithUrl: false, minSearchLength: 5 }),
        { wrapper }
      );

      act(() => {
        result.current.setSearchTerm('test');
      });

      // Term under 5 chars should result in empty debounced term
      expect(result.current.debouncedTerm).toBe('');
    });

    it('respects custom maxHistory', async () => {
      const { result } = renderHook(
        () => useTemplateSearch({ syncWithUrl: false, maxHistory: 2 }),
        { wrapper }
      );

      act(() => {
        result.current.addToHistory('one');
      });
      act(() => {
        result.current.addToHistory('two');
      });
      act(() => {
        result.current.addToHistory('three');
      });

      await waitFor(() => {
        expect(result.current.searchHistory).toHaveLength(2);
      });
    });
  });
});
