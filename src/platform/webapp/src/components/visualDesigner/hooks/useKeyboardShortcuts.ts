/**
 * Keyboard Shortcuts Hook
 * Handles global keyboard shortcuts for the Visual Designer
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  enabled?: boolean;
}

/**
 * Hook to register and handle keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Only allow Escape in input fields
        if (event.key !== 'Escape') {
          return;
        }
      }

      const matchingShortcut = shortcuts.find((shortcut) => {
        if (shortcut.enabled === false) return false;

        const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
        const shiftMatch = !!shortcut.shift === event.shiftKey;
        const altMatch = !!shortcut.alt === event.altKey;

        return keyMatch && ctrlMatch && shiftMatch && altMatch;
      });

      if (matchingShortcut) {
        event.preventDefault();
        event.stopPropagation();
        matchingShortcut.action();
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Default shortcuts for the Visual Designer
 */
export function useDesignerShortcuts({
  onUndo,
  onRedo,
  onSave,
  onDelete,
  onDuplicate,
  onSelectAll,
  onDeselect,
  onZoomIn,
  onZoomOut,
  onFitView,
  canUndo,
  canRedo,
  hasSelection,
}: {
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSelectAll: () => void;
  onDeselect: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'z',
      ctrl: true,
      action: onUndo,
      description: 'Undo',
      enabled: canUndo,
    },
    {
      key: 'y',
      ctrl: true,
      action: onRedo,
      description: 'Redo',
      enabled: canRedo,
    },
    {
      key: 'z',
      ctrl: true,
      shift: true,
      action: onRedo,
      description: 'Redo (alternative)',
      enabled: canRedo,
    },
    {
      key: 's',
      ctrl: true,
      action: onSave,
      description: 'Save',
    },
    {
      key: 'Delete',
      action: onDelete,
      description: 'Delete selected',
      enabled: hasSelection,
    },
    {
      key: 'Backspace',
      action: onDelete,
      description: 'Delete selected (alternative)',
      enabled: hasSelection,
    },
    {
      key: 'd',
      ctrl: true,
      action: onDuplicate,
      description: 'Duplicate selected',
      enabled: hasSelection,
    },
    {
      key: 'a',
      ctrl: true,
      action: onSelectAll,
      description: 'Select all',
    },
    {
      key: 'Escape',
      action: onDeselect,
      description: 'Deselect all / Cancel',
    },
    {
      key: '=',
      ctrl: true,
      action: onZoomIn,
      description: 'Zoom in',
    },
    {
      key: '+',
      ctrl: true,
      action: onZoomIn,
      description: 'Zoom in',
    },
    {
      key: '-',
      ctrl: true,
      action: onZoomOut,
      description: 'Zoom out',
    },
    {
      key: '0',
      ctrl: true,
      action: onFitView,
      description: 'Fit view',
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}

export default useKeyboardShortcuts;
