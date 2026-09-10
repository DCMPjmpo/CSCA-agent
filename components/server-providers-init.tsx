'use client';

import { useEffect } from 'react';

/**
 * Fetches server-configured providers on mount and merges into settings store.
 * Renders nothing — purely a side-effect component.
 *
 * The settings store statically imports the full AI provider registry (~1400-line
 * PROVIDERS constant) plus every modal provider config, which was pulling ~118KB
 * (gzip) into the shared first-screen bundle via the root layout. To keep that
 * payload off pages that don't need it, the store is imported dynamically here.
 * The module-level guard prevents duplicate fetches when this component mounts on
 * multiple routes within one SPA session.
 */
let fetched = false;

export function ServerProvidersInit() {
  useEffect(() => {
    if (fetched) return;
    fetched = true;
    void import('@/lib/store/settings').then(({ useSettingsStore }) => {
      useSettingsStore.getState().fetchServerProviders();
    });
  }, []);

  return null;
}
