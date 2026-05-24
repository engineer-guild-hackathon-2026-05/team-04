'use client';

import { FormEvent, Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Globe, Loader2, LogIn, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type AuthMode = 'signin' | 'signup';

function sanitizeRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/app';
  return value;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="auth-page-shell"><section className="auth-card">読み込み中...</section></main>}>
      <LoginForm />
    </Suspense>
  );
}

const PASSWORD_PATTERN = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"|<>?,./`~]).{12,}$";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = useMemo(() => sanitizeRedirect(searchParams.get('redirect')), [searchParams]);
  const initialError = searchParams.get('error') === 'auth_callback_failed'
    ? '認証リンクの有効期限が切れているか、認証に失敗しました。もう一度お試しください。'
    : '';

  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState(initialError);
  const [noticeMessage, setNoticeMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setNoticeMessage('');
    setIsSubmitting(true);

    const supabase = createClient();

    if (mode === 'signup' && !new RegExp(PASSWORD_PATTERN).test(password)) {
      setErrorMessage('パスワードは12文字以上で、大文字・小文字・数字・記号をそれぞれ1文字以上含めてください。');
      setIsSubmitting(false);
      return;
    }

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setErrorMessage('メールアドレスまたはパスワードが正しくありません。');
          return;
        }
        router.replace(redirectTo);
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(redirectTo)}`,
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

      setNoticeMessage('確認メールを送信しました。メール内のリンクから認証を完了してください。');
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
          {noticeMessage && <p className="auth-message success" role="status">{noticeMessage}</p>}

          <button className="auth-submit-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={18} className="auth-spin" /> : mode === 'signin' ? <LogIn size={18} /> : <UserPlus size={18} />}
            <span>{mode === 'signin' ? 'ログインする' : '登録する'}</span>
          </button>
        </form>
      </section>
    </main>
  );
}
