'use client';

import { useEffect, useState, useCallback } from 'react';
import { loadCscaSession, type CscaSessionData } from '@/lib/csca/session';
import { getVoyageProgress, migrateIfNeeded, type VoyageProgressState, emptyProgress } from '@/lib/voyage-progress';

/**
 * Client hook: read CSCA session data from localStorage.
 * Returns the unified VoyageProgressState that all UI should use.
 *
 * Hydration-safe: all localStorage reads happen in useEffect, so server
 * and client first render both see empty/null initial state. The hook
 * updates after mount, triggering a re-render with real data.
 */
export function useCscaSession() {
  const [currentStageKey, setCurrentStageKey] = useState<string | null>(null);
  const [progress, setProgress] = useState<VoyageProgressState>(emptyProgress());
  const [sessionData, setSessionData] = useState<CscaSessionData | null>(null);

  useEffect(() => {
    const read = () => {
      try {
        migrateIfNeeded();
        const p = getVoyageProgress();
        setProgress(p);
        const s = loadCscaSession();
        setSessionData(s);
        setCurrentStageKey(typeof s?.currentStep === 'string' ? s.currentStep : null);
      } catch {
        setCurrentStageKey(null);
        setProgress(emptyProgress());
        setSessionData(null);
      }
    };
    read();

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'csca_learning_session' || !e.key) read();
    };
    const onWrite = () => read();
    window.addEventListener('storage', onStorage);
    window.addEventListener('cscaSessionSaved', onWrite as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('cscaSessionSaved', onWrite as EventListener);
    };
  }, []);

  return { currentStageKey, progress, sessionData };
}
