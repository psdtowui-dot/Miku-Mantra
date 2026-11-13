'use client';

import { Suspense, useEffect, useState } from 'react';
import { applyGoogleConsentModeDefaults } from '@/lib/analytics/consent';
import PageViewTracker from './PageViewTracker';
import ConsentBanner from './ConsentBanner';
import PrivacySettings from './PrivacySettings';

export default function AnalyticsProvider({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Apply client-side consent mode synchronization
    applyGoogleConsentModeDefaults();
  }, []);

  return (
    <>
      {/* 1. Client-side Navigation Page View Tracker */}
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>

      {/* 2. Children (The application) */}
      {children}

      {/* 3. Cookie Consent Banner & Privacy Settings */}
      {mounted && (
        <>
          <ConsentBanner />
          <PrivacySettings />
        </>
      )}
    </>
  );
}
