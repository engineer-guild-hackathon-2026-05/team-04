'use client';

import { FormEvent, Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Globe, Loader2, LogIn, PlayCircle, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { sanitizeAuthRedirect } from '@/lib/authRedirect';
import { DEMO_SESSION_STORAGE_KEY, LEGACY_DEMO_PROFILE_STORAGE_KEY } from '@/lib/demoSessionKeys';

type AuthMode = 'signin' | 'signup';

const isDemoLoginEnabled = ['true', '1', 'yes', 'on'].includes(
  (process.env.NEXT_PUBLIC_DEMO_MODE ?? '').toLowerCase(),
);

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="auth-page-shell"><section className="auth-card">読み込み中...</section></main>}>
      <LoginForm />
    </Suspense>
  );
}

const PASSWORD_PATTERN = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"|<>?,./`~]).{12,}$";
type DemoSignInResult = {
  status: 'authenticated';
  sessionId: string;
  isNew: boolean;
} | {
  status: 'disabled' | 'failed';
} | {
  status: 'unavailable';
  message?: string;
};

async function clearDemoAuthState() {
  localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
  localStorage.removeItem(LEGACY_DEMO_PROFILE_STORAGE_KEY);
  await fetch('/auth/demo', { method: 'DELETE' }).catch(() => null);
}

async function tryDemoSignIn(): Promise<DemoSignInResult> {
  const existingSessionId = localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
  const response = await fetch('/auth/demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: existingSessionId || undefined }),
  }).catch(() => null);

  if (!response) return { status: 'failed' };
  if (response.status === 404) return { status: 'disabled' };
  if (response.status === 503) {
    const data = await response.json().catch(() => null) as { error?: string } | null;
    return { status: 'unavailable', message: data?.error };
  }
  if (!response.ok) return { status: 'failed' };

  const data = await response.json().catch(() => null) as { sessionId?: string; isNew?: boolean } | null;
  if (!data?.sessionId) return { status: 'failed' };

  localStorage.setItem(DEMO_SESSION_STORAGE_KEY, data.sessionId);
  localStorage.removeItem(LEGACY_DEMO_PROFILE_STORAGE_KEY);

  return {
    status: 'authenticated',
    sessionId: data.sessionId,
    isNew: Boolean(data.isNew),
  };
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
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);


  const handleDemoSignIn = async () => {
    setErrorMessage('');
    setIsDemoSubmitting(true);

    try {
      const demoSignInResult = await tryDemoSignIn();
      if (demoSignInResult.status === 'authenticated') {
        router.replace(demoSignInResult.isNew ? '/app?view=profile' : redirectTo);
        router.refresh();
        return;
      }

      if (demoSignInResult.status === 'disabled') {
        setErrorMessage('デモログインは現在利用できません。NEXT_PUBLIC_DEMO_MODE=true と DEMO_MODE=true を設定してサーバーを再起動してください。');
        return;
      }

      if (demoSignInResult.status === 'unavailable') {
        setErrorMessage(demoSignInResult.message ?? 'デモログイン設定が不足しています。SUPABASE_SERVICE_ROLE_KEY と DEMO_SESSION_SECRET を設定してください。');
        return;
      }

      setErrorMessage('デモログインに失敗しました。時間をおいてもう一度お試しください。');
    } finally {
      setIsDemoSubmitting(false);
    }
  };

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
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setErrorMessage('メールアドレスまたはパスワードが正しくありません。');
          return;
        }
        await clearDemoAuthState();
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
        await clearDemoAuthState();
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


        {mode === 'signin' && isDemoLoginEnabled && (
          <div className="auth-demo-box">
            <button className="auth-demo-btn" type="button" onClick={handleDemoSignIn} disabled={isSubmitting || isDemoSubmitting}>
              {isDemoSubmitting ? <Loader2 size={18} className="auth-spin" /> : <PlayCircle size={18} />}
              <span>デモで体験する</span>
            </button>
            <p>登録なしでプロフィール保存まで試せます。</p>
          </div>
        )}

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
