import { useState, useCallback, useRef } from 'react';

export default function useUnsavedChanges() {
  const [dirtyFields, setDirtyFields] = useState(new Set());
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const baselineRef = useRef(null);

  const setBaseline = useCallback((key, value) => {
    baselineRef.current = { ...(baselineRef.current || {}), [key]: value };
    setDirtyFields((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const markDirty = useCallback((key) => {
    setDirtyFields((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const markClean = useCallback((key) => {
    setDirtyFields((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setLastSavedAt(new Date());
  }, []);

  const resetAll = useCallback(() => {
    setDirtyFields(new Set());
    baselineRef.current = null;
    setLastSavedAt(null);
  }, []);

  const isDirty = dirtyFields.size > 0;
  const dirtyCount = dirtyFields.size;

  return { dirtyFields, isDirty, dirtyCount, lastSavedAt, setBaseline, markDirty, markClean, resetAll };
}
