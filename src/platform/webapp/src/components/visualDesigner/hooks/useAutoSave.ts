/**
 * Auto-Save Hook
 * Automatically saves design changes after a debounce period
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutoSaveOptions {
  /** Debounce delay in milliseconds */
  delay?: number;
  /** Whether auto-save is enabled */
  enabled?: boolean;
  /** Callback when save starts */
  onSaveStart?: () => void;
  /** Callback when save completes successfully */
  onSaveSuccess?: () => void;
  /** Callback when save fails */
  onSaveError?: (error: Error) => void;
}

interface UseAutoSaveReturn {
  /** Trigger a save */
  triggerSave: () => void;
  /** Whether a save is in progress */
  isSaving: boolean;
  /** Last save timestamp */
  lastSaved: Date | null;
  /** Last save error */
  lastError: Error | null;
  /** Reset the auto-save timer */
  resetTimer: () => void;
}

/**
 * Hook for automatic saving with debounce
 */
export function useAutoSave(
  saveFunction: () => Promise<void>,
  hasUnsavedChanges: boolean,
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn {
  const {
    delay = 30000, // 30 seconds default
    enabled = true,
    onSaveStart,
    onSaveSuccess,
    onSaveError,
  } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const saveFunctionRef = useRef(saveFunction);

  // Keep save function ref updated
  useEffect(() => {
    saveFunctionRef.current = saveFunction;
  }, [saveFunction]);

  // Perform the save
  const performSave = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    setLastError(null);
    onSaveStart?.();

    try {
      await saveFunctionRef.current();
      setLastSaved(new Date());
      onSaveSuccess?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Save failed');
      setLastError(err);
      onSaveError?.(err);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, onSaveStart, onSaveSuccess, onSaveError]);

  // Reset and start the timer
  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (enabled && hasUnsavedChanges) {
      timerRef.current = setTimeout(() => {
        performSave();
      }, delay);
    }
  }, [enabled, hasUnsavedChanges, delay, performSave]);

  // Trigger save manually
  const triggerSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    performSave();
  }, [performSave]);

  // Set up timer when changes occur
  useEffect(() => {
    if (hasUnsavedChanges && enabled) {
      resetTimer();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [hasUnsavedChanges, enabled, resetTimer]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    triggerSave,
    isSaving,
    lastSaved,
    lastError,
    resetTimer,
  };
}

export default useAutoSave;
