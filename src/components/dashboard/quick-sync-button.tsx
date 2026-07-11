"use client";

import { useState } from "react";
import { syncGoogleSheet } from "@/actions/sync";

export function QuickSyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const r = await syncGoogleSheet();
      if (r.success) {
        setResult(`Sync complete: ${r.rowsCreated} created, ${r.rowsUpdated} updated, ${r.rowsSkipped} skipped (${r.duration})`);
      } else {
        setResult(`Sync failed: ${r.error}`);
      }
    } catch (err) {
      setResult(`Sync error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleSync}
        disabled={syncing}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
      >
        {syncing ? "Syncing..." : "Sync Now"}
      </button>
      {result && (
        <p className="mt-2 text-xs text-gray-500">{result}</p>
      )}
    </div>
  );
}
