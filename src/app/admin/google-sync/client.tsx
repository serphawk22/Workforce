"use client";

import { useState } from "react";
import { syncGoogleSheet, type SyncResult } from "@/actions/sync";

type SyncLogEntry = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  rowsRead: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsSkipped: number;
  rowsFailed: number;
  error: string | null;
};

type Props = {
  latestSync: {
    startedAt: string;
    finishedAt: string | null;
    rowsRead: number;
    rowsCreated: number;
    rowsUpdated: number;
    rowsSkipped: number;
    rowsFailed: number;
    error: string | null;
  } | null;
  syncLogs: SyncLogEntry[];
};

export function GoogleSyncClient({ latestSync, syncLogs }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<{
    success: boolean;
    message: string;
    metadata?: {
      title: string;
      sheets: { title: string; rowCount: number; columnCount: number }[];
    } | null;
  } | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [readResult, setReadResult] = useState<{
    success: boolean;
    headers: string[];
    rows: Record<string, string>[];
    rowCount: number;
    message?: string;
  } | null>(null);
  const [readLoading, setReadLoading] = useState(false);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const result = await syncGoogleSheet();
      setLastResult(result);
      if (!result.success) {
        setError(result.error ?? "Sync failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleTestConnection() {
    setTestLoading(true);
    setTestStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/google-sheets/test");
      const data = await res.json();
      setTestStatus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setTestLoading(false);
    }
  }

  async function handleReadSheet() {
    setReadLoading(true);
    setReadResult(null);
    setError(null);
    try {
      const res = await fetch("/api/google-sheets/read");
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setReadResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setReadLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Sync Database
        </h2>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          {syncing && <Spinner />}
          {syncing ? "Syncing..." : "Sync Now"}
        </button>

        {lastResult && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <StatBox label="Read" value={lastResult.rowsRead} />
            <StatBox
              label="Created"
              value={lastResult.rowsCreated}
              color="text-emerald-600"
            />
            <StatBox
              label="Updated"
              value={lastResult.rowsUpdated}
              color="text-blue-600"
            />
            <StatBox
              label="Failed"
              value={lastResult.rowsFailed}
              color={lastResult.rowsFailed > 0 ? "text-red-600" : undefined}
            />
            <StatBox label="Duration" value={lastResult.duration} />
          </div>
        )}

        {latestSync && !lastResult && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Last sync:{" "}
              {new Date(latestSync.startedAt).toLocaleString()} —
              <span className="font-medium text-gray-700">
                {latestSync.rowsCreated} created, {latestSync.rowsUpdated}{" "}
                updated
              </span>
            </p>
          </div>
        )}
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Sync History
        </h2>
        {syncLogs.length === 0 ? (
          <p className="text-sm text-gray-400">
            No syncs have been run yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Read</th>
                  <th className="pb-2 pr-4">Created</th>
                  <th className="pb-2 pr-4">Updated</th>
                  <th className="pb-2 pr-4">Skipped</th>
                  <th className="pb-2 pr-4">Failed</th>
                  <th className="pb-2 pr-4">Duration</th>
                  <th className="pb-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {syncLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gray-100 text-gray-700"
                  >
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {new Date(log.startedAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">{log.rowsRead}</td>
                    <td className="py-2 pr-4 text-emerald-600">
                      {log.rowsCreated}
                    </td>
                    <td className="py-2 pr-4 text-blue-600">
                      {log.rowsUpdated}
                    </td>
                    <td className="py-2 pr-4">{log.rowsSkipped}</td>
                    <td
                      className={`py-2 pr-4 ${
                        log.rowsFailed > 0 ? "text-red-600" : ""
                      }`}
                    >
                      {log.rowsFailed}
                    </td>
                    <td className="py-2 pr-4">
                      {log.finishedAt
                        ? formatDuration(
                            new Date(log.finishedAt).getTime() -
                              new Date(log.startedAt).getTime()
                          )
                        : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {log.error ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
                          title={log.error}
                        >
                          Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Success
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Connection Test
        </h2>
        <button
          onClick={handleTestConnection}
          disabled={testLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          {testLoading && <Spinner />}
          {testLoading ? "Testing..." : "Test Connection"}
        </button>

        {testStatus && (
          <div className="mt-4">
            <div
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
                testStatus.success
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  testStatus.success ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              {testStatus.success ? "Connected" : "Failed"}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {testStatus.message}
            </p>
            {testStatus.metadata && (
              <div className="mt-3 space-y-1 text-sm text-gray-500">
                <p>
                  <span className="font-medium text-gray-700">
                    Spreadsheet:
                  </span>{" "}
                  {testStatus.metadata.title}
                </p>
                <p>
                  <span className="font-medium text-gray-700">Sheets:</span>
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  {testStatus.metadata.sheets.map((s) => (
                    <li key={s.title}>
                      {s.title} — {s.rowCount} rows × {s.columnCount}{" "}
                      columns
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Read Sheet Data
        </h2>
        <button
          onClick={handleReadSheet}
          disabled={readLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          {readLoading && <Spinner />}
          {readLoading ? "Reading..." : "Read Sheet"}
        </button>

        {readResult && !readResult.success && (
          <p className="mt-3 text-sm text-red-600">{readResult.message}</p>
        )}

        {readResult && readResult.success && (
          <div className="mt-4">
            <p className="mb-2 text-sm text-gray-600">
              <span className="font-medium text-gray-700">
                {readResult.rowCount}
              </span>{" "}
              data rows found
            </p>

            {readResult.headers.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Headers
                </h3>
                <div className="flex flex-wrap gap-2">
                  {readResult.headers.map((h, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {readResult.rows.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Preview (first {Math.min(10, readResult.rows.length)} of{" "}
                  {readResult.rowCount} rows)
                </h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">
                          #
                        </th>
                        {readResult.headers.map((h, i) => (
                          <th
                            key={i}
                            className="px-3 py-2 text-left font-medium text-gray-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {readResult.rows.slice(0, 10).map((row, ri) => (
                        <tr key={ri} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400">
                            {ri + 1}
                          </td>
                          {readResult.headers.map((h) => (
                            <td
                              key={h}
                              className="max-w-[200px] truncate px-3 py-2 text-gray-700"
                            >
                              {row[h] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700">
                    View JSON preview (first 10 rows)
                  </summary>
                  <pre className="mt-2 max-h-96 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700">
                    {JSON.stringify(
                      readResult.rows.slice(0, 10),
                      null,
                      2
                    )}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className={`mt-1 text-lg font-semibold ${color ?? "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
