'use client';

import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (bookmarks: unknown[]) => Promise<{ added: number; updated: number }>;
}

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ added: number; updated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleProcessImport = async () => {
    setError(null);
    setResult(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setError('Invalid JSON syntax. Please check your data.');
      return;
    }

    if (!Array.isArray(parsed)) {
      // Check if it's wrapped in { bookmarks: [...] } or { data: [...] }
      if (typeof parsed === 'object' && parsed !== null) {
        const obj = parsed as Record<string, unknown>;
        if (Array.isArray(obj.bookmarks)) {
          parsed = obj.bookmarks;
        } else if (Array.isArray(obj.data)) {
          parsed = obj.data;
        } else {
          setError('Expected a JSON array of bookmark objects.');
          return;
        }
      } else {
        setError('Expected a JSON array of bookmark objects.');
        return;
      }
    }

    if ((parsed as unknown[]).length === 0) {
      setError('The JSON array is empty.');
      return;
    }

    setLoading(true);
    try {
      const res = await onImport(parsed as unknown[]);
      setResult(res);
      setJsonText('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#16161A] border border-[#E5E5E3] dark:border-[#26262B] rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E3] dark:border-[#26262B]">
          <h2 className="text-sm font-semibold text-[#18181B] dark:text-[#F4F4F5]">
            Import Bookmarks (JSON)
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="p-3 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Successfully processed: {result.added} added, {result.updated} updated.
            </span>
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-[#71717A] dark:text-[#A1A1AA] mb-1.5">
              Upload JSON file:
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="block w-full text-xs text-[#71717A] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-[#18181B] file:text-white dark:file:bg-[#F4F4F5] dark:file:text-[#18181B] hover:file:opacity-90 cursor-pointer"
            />
          </div>

          <div className="relative">
            <label className="block font-medium text-[#71717A] dark:text-[#A1A1AA] mb-1.5">
              Or paste JSON directly:
            </label>
            <textarea
              rows={6}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="[ { &quot;tweet_id&quot;: &quot;123456789&quot;, &quot;text&quot;: &quot;Hello world&quot;, ... } ]"
              className="w-full p-2.5 font-mono text-[11px] bg-transparent border border-[#E5E5E3] dark:border-[#26262B] rounded-lg text-[#18181B] dark:text-[#F4F4F5] focus:outline-none focus:border-sky-600 dark:focus:border-sky-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E3] dark:border-[#26262B]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5]"
          >
            {result ? 'Done' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleProcessImport}
            disabled={loading || !jsonText.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-[#18181B] dark:bg-[#F4F4F5] text-white dark:text-[#18181B] hover:bg-[#27272A] dark:hover:bg-white transition-colors disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{loading ? 'Importing...' : 'Import Data'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

