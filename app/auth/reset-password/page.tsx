'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    const initSessionFromHash = async () => {
      if (typeof window === 'undefined') return;

      const search = window.location.search.replace(/^\?/, '');
      if (search) {
        const searchParams = new URLSearchParams(search);
        const code = searchParams.get('code');
        const type = searchParams.get('type');

        if (type && type !== 'recovery') {
          setLinkError('This reset link is invalid or expired.');
          return;
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setLinkError('This reset link is invalid or expired.');
            return;
          }

          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
      }

      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setLinkError('This reset link is invalid or expired.');
        }
        return;
      }

      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      if (type && type !== 'recovery') {
        setLinkError('This reset link is invalid or expired.');
        return;
      }

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          setLinkError('This reset link is invalid or expired.');
          return;
        }

        window.history.replaceState(null, '', window.location.pathname);
        return;
      }

      setLinkError('This reset link is invalid or expired.');
    };

    initSessionFromHash();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message || 'Failed to reset password.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/auth/signin"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
          <div className="text-2xl font-bold text-primary">Pillow AI</div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold">Choose a New Password</h1>
          <p className="mt-2 text-muted-foreground">
            Enter a new password for your account.
          </p>
        </div>

        {linkError && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {linkError} <Link className="underline" href="/auth/forgot-password">Request a new link</Link>.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700">
              Password updated. You can now <Link className="underline" href="/auth/signin">sign in</Link>.
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !!linkError}
            className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
