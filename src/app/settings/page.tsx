'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import type { ApiToken, Category, Bookmark, Tag } from '@/types/database';
import {
  ArrowLeft,
  Key,
  Copy,
  Check,
  Trash2,
  Plus,
  Download,
  Upload,
  LogOut,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { ImportModal } from '@/components/library/import-modal';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [rawGeneratedToken, setRawGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingToken, setLoadingToken] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const isDemo = window.location.search.includes('demo=1');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user && !isDemo) {
        router.push('/login');
        return;
      }

      setUserEmail(user?.email || 'user@example.com');
      setUserId(user?.id || 'demo-user');

      if (!user && isDemo) {
        setTokens([
          {
            id: 'tok-1',
            user_id: 'demo-user',
            token_hash: 'hash...',
            name: 'Work Laptop Chrome',
            last_used_at: new Date(Date.now() - 3600000).toISOString(),
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
        ]);
        return;
      }

      // Fetch tokens
      const { data: tokenData } = await supabase
        .from('api_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (tokenData) {
        setTokens(tokenData as ApiToken[]);
      }
    }

    loadData();
  }, [router, supabase]);

  // Helper to hash token with SHA-256
  async function hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Generate new token
  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;

    setLoadingToken(true);
    setRawGeneratedToken(null);
    setCopied(false);

    try {
      // Generate 32-byte secure random hex string
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const rawToken =
        'shf_' +
        Array.from(randomBytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

      const tokenHash = await hashToken(rawToken);

      const { data, error } = await supabase
        .from('api_tokens')
        .insert({
          user_id: userId,
          name: newTokenName.trim(),
          token_hash: tokenHash,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setTokens((prev) => [data as ApiToken, ...prev]);
        setRawGeneratedToken(rawToken);
        setNewTokenName('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate token';
      alert(msg);
    } finally {
      setLoadingToken(false);
    }
  };

  const handleRevokeToken = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this API token? Any extension using it will stop working.')) {
      return;
    }

    await supabase.from('api_tokens').delete().eq('id', id);
    setTokens((prev) => prev.filter((t) => t.id !== id));
  };

  const handleCopyToken = () => {
    if (!rawGeneratedToken) return;
    navigator.clipboard.writeText(rawGeneratedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export all data
  const handleExportData = async () => {
    const [bookmarksRes, categoriesRes, tagsRes] = await Promise.all([
      supabase.from('bookmarks').select('*').order('saved_at', { ascending: false }),
      supabase.from('categories').select('*').order('position', { ascending: true }),
      supabase.from('tags').select('*'),
    ]);

    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      user_email: userEmail,
      categories: categoriesRes.data || [],
      tags: tagsRes.data || [],
      bookmarks: bookmarksRes.data || [],
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shelf-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import data handler
  const handleImport = async (importedItems: unknown[]) => {
    const rowsToUpsert = (importedItems as any[]).map((item) => {
      const tweetId = String(item.tweet_id || item.id || '').trim();
      const tweetUrl = item.tweet_url || item.url || `https://x.com/i/web/status/${tweetId}`;
      return {
        user_id: userId,
        tweet_id: tweetId,
        tweet_url: tweetUrl,
        author_name: item.author_name || item.author || '',
        author_handle: item.author_handle || item.handle || '',
        author_avatar_url: item.author_avatar_url || null,
        text: item.text || item.full_text || '',
        posted_at: item.posted_at || null,
        saved_at: item.saved_at || new Date().toISOString(),
        media: item.media || [],
        links: item.links || [],
        is_thread: Boolean(item.is_thread),
        is_pinned: Boolean(item.is_pinned),
        is_read: Boolean(item.is_read),
        note: item.note || null,
        status: item.status === 'sorted' ? 'sorted' : 'to_sort',
      };
    }).filter((r) => r.tweet_id);

    if (rowsToUpsert.length === 0) {
      throw new Error('No valid tweets found in the imported JSON.');
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .upsert(rowsToUpsert, { onConflict: 'user_id,tweet_id' })
      .select();

    if (error) throw error;
    return { added: data ? data.length : 0, updated: 0 };
  };

  // Sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] dark:bg-[#0C0C0E] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E3] dark:border-[#26262B]">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Library</span>
          </Link>
          <span className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
            {userEmail}
          </span>
        </div>

        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#18181B] dark:text-[#F4F4F5]">
            Settings
          </h1>
          <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-1">
            Manage your extension API tokens, data backup, and account.
          </p>
        </div>

        {/* Section 1: Chrome Extension API Tokens */}
        <section className="bg-white dark:bg-[#16161A] border border-[#E5E5E3] dark:border-[#26262B] rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h2 className="text-sm font-semibold text-[#18181B] dark:text-[#F4F4F5]">
              Chrome Extension API Tokens
            </h2>
          </div>
          <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
            Generate a personal token to connect your Chrome extension. Your token is stored hashed and cannot be recovered after leaving this screen.
          </p>

          {/* Newly generated token banner */}
          {rawGeneratedToken && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
                <AlertCircle className="w-4 h-4" />
                <span>Save your API token now</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                This token will not be displayed again. Copy it and paste it into your Chrome extension options:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={rawGeneratedToken}
                  className="flex-1 px-3 py-1.5 font-mono text-xs bg-white dark:bg-[#16161A] border border-amber-300 dark:border-amber-800 rounded-lg text-[#18181B] dark:text-[#F4F4F5]"
                />
                <button
                  onClick={handleCopyToken}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Create Token Form */}
          <form onSubmit={handleGenerateToken} className="flex gap-2">
            <input
              type="text"
              required
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              placeholder="Token description (e.g. Work Laptop Chrome)"
              className="flex-1 px-3 py-1.5 text-xs bg-transparent border border-[#E5E5E3] dark:border-[#26262B] rounded-lg text-[#18181B] dark:text-[#F4F4F5] focus:outline-none focus:border-sky-600 dark:focus:border-sky-400"
            />
            <button
              type="submit"
              disabled={loadingToken}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-[#18181B] dark:bg-[#F4F4F5] text-white dark:text-[#18181B] hover:bg-[#27272A] dark:hover:bg-white transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{loadingToken ? 'Generating...' : 'Generate Token'}</span>
            </button>
          </form>

          {/* Existing Tokens List */}
          <div className="space-y-2 pt-2 border-t border-[#E5E5E3]/60 dark:border-[#26262B]/60">
            <div className="text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-wider">
              Active Tokens ({tokens.length})
            </div>
            {tokens.length === 0 ? (
              <div className="py-4 text-xs text-[#71717A] dark:text-[#A1A1AA]">
                No API tokens generated yet.
              </div>
            ) : (
              tokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-[#E5E5E3] dark:border-[#26262B] bg-[#FBFBFA] dark:bg-[#121215]"
                >
                  <div>
                    <div className="text-xs font-medium text-[#18181B] dark:text-[#F4F4F5]">
                      {token.name}
                    </div>
                    <div className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                      Created {formatDate(token.created_at)}
                      {token.last_used_at && ` · Last used ${formatDate(token.last_used_at)}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeToken(token.id)}
                    title="Revoke Token"
                    className="p-1.5 text-[#71717A] dark:text-[#A1A1AA] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Section 2: Data Export & Import */}
        <section className="bg-white dark:bg-[#16161A] border border-[#E5E5E3] dark:border-[#26262B] rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-[#18181B] dark:text-[#F4F4F5]">
            Data Management
          </h2>
          <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">
            You have full ownership of your data. Export your entire library at any time or restore from a backup.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleExportData}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E5E5E3] dark:border-[#26262B] bg-[#FBFBFA] dark:bg-[#121215] text-[#18181B] dark:text-[#F4F4F5] hover:bg-[#F4F4F3] dark:hover:bg-[#26262B] transition-colors"
            >
              <Download className="w-4 h-4 text-[#71717A]" />
              <span>Export All Data (JSON)</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E5E5E3] dark:border-[#26262B] bg-[#FBFBFA] dark:bg-[#121215] text-[#18181B] dark:text-[#F4F4F5] hover:bg-[#F4F4F3] dark:hover:bg-[#26262B] transition-colors"
            >
              <Upload className="w-4 h-4 text-[#71717A]" />
              <span>Import Bookmarks (JSON)</span>
            </button>
          </div>
        </section>

        {/* Section 3: Account & Session */}
        <section className="bg-white dark:bg-[#16161A] border border-[#E5E5E3] dark:border-[#26262B] rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[#18181B] dark:text-[#F4F4F5]">
              Signed in as {userEmail}
            </div>
            <div className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
              Row Level Security strictly isolates all records to your account.
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </section>
      </div>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
}
