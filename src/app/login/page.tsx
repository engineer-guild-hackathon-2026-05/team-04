'use client';

import { FormEvent, Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Globe, Loader2, LogIn, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { sanitizeAuthRedirect } from '@/lib/authRedirect';

type AuthMode = 'signin' | 'signup';

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="auth-page-shell"><section className="auth-card">読み込み中...</section></main>}>
      <LoginForm />
    </Suspense>
  );
}

const PASSWORD_PATTERN = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"|<>?,./`~]).{12,}$";
const DEMO_PROFILE_STORAGE_KEY = 'globalbites_demo_profile';

type DemoSignInResult = 'authenticated' | 'disabled' | 'failed';

async function tryDemoSignIn(email: string): Promise<DemoSignInResult> {
  const response = await fetch('/auth/demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }).catch(() => null);

  if (!response) return 'failed';
  if (response.status === 404) return 'disabled';
  if (!response.ok) return 'failed';

  const data = await response.json().catch(() => ({ userName: 'デモユーザー' }));
  localStorage.setItem(
    DEMO_PROFILE_STORAGE_KEY,
    JSON.stringify({
      email,
      userName: data.userName || email.split('@')[0] || 'デモユーザー',
    }),
  );

  return 'authenticated';
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = useMemo(() => sanitizeAuthRedirect(searchParams.get('redirect')), [searchParams]);
  const initialError = searchParams.get('error') === 'auth_callback_failed'
    ? '認証リンクの有効期限が切れているか、認証に失敗しました。もう一度お試しください。'
    : '';

  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    if (mode === 'signup' && !new RegExp(PASSWORD_PATTERN).test(password)) {
      setErrorMessage('パスワードは12文字以上で、大文字・小文字・数字・記号をそれぞれ1文字以上含めてください。');
      setIsSubmitting(false);
      return;
    }

    try {
      if (mode === 'signin') {
        const demoSignInResult = await tryDemoSignIn(email);
        if (demoSignInResult === 'authenticated') {
          router.replace(redirectTo);
          router.refresh();
          return;
        }

        if (demoSignInResult === 'failed') {
          console.warn('Demo login probe failed. Falling back to Supabase password auth.');
        }

        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setErrorMessage('メールアドレスまたはパスワードが正しくありません。');
          return;
        }
        router.replace(redirectTo);
        router.refresh();
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data.session) {
        router.replace(redirectTo);
        router.refresh();
        return;
      }

      setErrorMessage('メール確認が必要な Supabase Auth 設定になっています。メール送信なしで使うため、管理者に Confirm email をOFFにしてもらってください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <Link href="/" className="auth-brand" aria-label="GlobalBites トップへ戻る">
          <Globe size={28} />
          <span>GlobalBites</span>
        </Link>

        <div className="auth-mode-tabs" role="tablist" aria-label="認証モード">
          <button
            type="button"
            className={mode === 'signin' ? 'active' : ''}
            onClick={() => setMode('signin')}
          >
            ログイン
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => setMode('signup')}
          >
            新規登録
          </button>
        </div>

        <div className="auth-copy">
          <h1 id="auth-title">{mode === 'signin' ? 'おかえりなさい' : '食の制限を安全に保存'}</h1>
          <p>
            {mode === 'signin'
              ? 'メールアドレスとパスワードでログインすると、プロフィール設定を保存できます。'
              : 'アレルギーや好みをアカウントに紐づけて、次回以降も安心して使えます。'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label>
              表示名
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="例: 旅するグルメ"
                autoComplete="name"
              />
            </label>
          )}

          <label>
            メールアドレス
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            パスワード
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="12文字以上を推奨"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={mode === 'signup' ? 12 : undefined}
              pattern={mode === 'signup' ? PASSWORD_PATTERN : undefined}
              title={mode === 'signup' ? '12文字以上で、大文字・小文字・数字・記号をそれぞれ1文字以上含めてください。' : undefined}
              required
            />
          </label>

          {errorMessage && <p className="auth-message error" role="alert">{errorMessage}</p>}

          <button className="auth-submit-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={18} className="auth-spin" /> : mode === 'signin' ? <LogIn size={18} /> : <UserPlus size={18} />}
            <span>{mode === 'signin' ? 'ログインする' : '登録する'}</span>
          </button>
        </form>
      </section>
    </main>
  );
}
