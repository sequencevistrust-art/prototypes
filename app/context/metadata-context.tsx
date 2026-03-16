"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Metadata } from "../types/metadata";

interface MetadataContextType {
  metadata: Metadata | null;
  loading: boolean;
  error: string | null;
}

const MetadataContext = createContext<MetadataContextType>({
  metadata: null,
  loading: true,
  error: null,
});

export function MetadataProvider({ children }: { children: ReactNode }) {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const response = await fetch("/api/metadata");
        if (!response.ok) {
          throw new Error("Failed to fetch metadata");
        }
        const data = await response.json();
        setMetadata(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchMetadata();
  }, []);

  // Show full-page loading screen while data is loading
  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading data...</p>
        </div>
      </div>
    );
  }

  // Show error screen if data failed to load
  if (error) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-600 text-xl">!</span>
          </div>
          <p className="text-sm text-gray-900 font-medium">Failed to load data</p>
          <p className="text-xs text-gray-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 text-xs bg-gray-900 text-white rounded-md hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <MetadataContext.Provider value={{ metadata, loading, error }}>
      {children}
    </MetadataContext.Provider>
  );
}

export function useMetadata() {
  return useContext(MetadataContext);
}
