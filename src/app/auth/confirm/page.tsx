'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { sanitizeAuthRedirect } from '@/lib/authRedirect';


function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => sanitizeAuthRedirect(searchParams.get('next')), [searchParams]);
  const [message, setMessage] = useState('認証情報を確認しています...');

  useEffect(() => {
    const completeConfirmation = async () => {
      const code = searchParams.get('code');
      if (code) {
        const callbackUrl = new URL('/auth/callback', window.location.origin);
        callbackUrl.searchParams.set('code', code);
        callbackUrl.searchParams.set('next', next);
        window.location.replace(callbackUrl.toString());
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (!accessToken || !refreshToken) {
        router.replace('/login?error=auth_callback_failed');
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        setMessage('認証に失敗しました。ログイン画面からもう一度お試しください。');
        router.replace('/login?error=auth_callback_failed');
        return;
      }

      router.replace(next);
      router.refresh();
    };

    void completeConfirmation();
  }, [next, router, searchParams]);

  return (
    <main className="auth-page-shell">
      <section className="auth-card auth-confirm-card" role="status" aria-live="polite">
        <Loader2 size={28} className="auth-spin" />
        <h1>認証を完了しています</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<main className="auth-page-shell"><section className="auth-card">読み込み中...</section></main>}>
      <ConfirmContent />
    </Suspense>
  );
}
