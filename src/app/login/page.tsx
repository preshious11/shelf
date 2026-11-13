'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureUserProfileAndCategories } from '@/lib/auth-helpers';
import { Bookmark, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }

        if (data.user) {
          // Immediately ensure profile & default categories are seeded
          await ensureUserProfileAndCategories(supabase, data.user.id, data.user.email);
          router.push('/');
          router.refresh();
        } else {
          setError('Sign up succeeded! Please check your email for a confirmation link before signing in.');
          setLoading(false);
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }

        if (data.user) {
          await ensureUserProfileAndCategories(supabase, data.user.id, data.user.email);
          router.push('/');
          router.refresh();
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#FBFBFA] dark:bg-[#0C0C0E]">
      <div className="w-full max-w-[380px]">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[#E5E5E3] dark:border-[#26262B] bg-white dark:bg-[#16161A] text-[#18181B] dark:text-[#F4F4F5] mb-4 shadow-sm">
            <Bookmark className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-[#18181B] dark:text-[#F4F4F5]">
            Shelf
          </h1>
          <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] mt-1">
            Your private library for saved thoughts.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white dark:bg-[#16161A] border border-[#E5E5E3] dark:border-[#26262B] rounded-xl p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#F4F4F3] dark:bg-[#1F1F24] rounded-lg mb-6 border border-[#E5E5E3]/60 dark:border-[#26262B]/60">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                mode === 'signin'
                  ? 'bg-white dark:bg-[#2A2A32] text-[#18181B] dark:text-[#F4F4F5] shadow-sm'
                  : 'text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5]'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                mode === 'signup'
                  ? 'bg-white dark:bg-[#2A2A32] text-[#18181B] dark:text-[#F4F4F5] shadow-sm'
                  : 'text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5]'
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="p-3 text-xs rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300"
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-[#71717A] dark:text-[#A1A1AA] mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] dark:text-[#A1A1AA] pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-transparent border border-[#E5E5E3] dark:border-[#26262B] rounded-lg text-[#18181B] dark:text-[#F4F4F5] placeholder-[#A1A1AA] dark:placeholder-[#71717A] focus:border-sky-600 dark:focus:border-sky-400 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[#71717A] dark:text-[#A1A1AA] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] dark:text-[#A1A1AA] pointer-events-none" />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-transparent border border-[#E5E5E3] dark:border-[#26262B] rounded-lg text-[#18181B] dark:text-[#F4F4F5] placeholder-[#A1A1AA] dark:placeholder-[#71717A] focus:border-sky-600 dark:focus:border-sky-400 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[#18181B] hover:bg-[#27272A] dark:bg-[#F4F4F5] dark:hover:bg-white text-white dark:text-[#18181B] text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-sm"
            >
              <span>{loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#71717A] dark:text-[#A1A1AA] mt-6">
          Single user. Private by design.
        </p>
      </div>
    </main>
  );
}

