"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { ActivityTrackingProvider } from "@/hooks/useActivityTracking";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ActivityTrackingProvider
        options={{
          enabled: true,
          trackingLevel: "standard",
          debounceMs: 1000,
          batchSize: 20,
          autoFlush: true,
        }}
      >
        {children}
      </ActivityTrackingProvider>
    </SessionProvider>
  );
}
