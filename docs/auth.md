# 認証（Supabase Auth）

Supabase Auth を使った認証基盤とログイン画面の使い方。`/login` でメールアドレス認証を行い、ログイン後は `/app` に遷移する。

## セットアップ（初回のみ）

1. `.env.local.example` をコピーして `.env.local` を作成
2. `supabase start` してローカル Supabase を起動
3. `supabase status` で表示される `API URL` と `anon key` を `.env.local` に設定

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase status の anon key>
```

## クライアントの使い分け

| 用途 | import | 例 |
| --- | --- | --- |
| Client Component（"use client"） | `@/lib/supabase/client` | ログインフォームのボタン押下時 |
| Server Component / Server Action / Route Handler | `@/lib/supabase/server` | サーバー側でユーザー取得 |

## メール + パスワードでサインアップ

```ts
"use client";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    // メール確認後にこの URL へ戻る。完全な URL である必要あり。
    emailRedirectTo: `${location.origin}/auth/confirm?next=/app`,
    data: { display_name: displayName },
  },
});
```

確認メールのリンクをユーザーがクリック → `/auth/confirm`（fragment 形式）または `/auth/callback`（PKCE code 形式）でセッション確立 → `/app` へリダイレクト。

## メール + パスワードでログイン

```ts
const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) {
  // ユーザー列挙対策: 失敗理由を露出させない
  showError("メールアドレスまたはパスワードが正しくありません");
}
```

成功するとセッション Cookie が立ち、`/login` から `redirect` パラメータ（既定 `/app`）へ遷移する。

## Google ログイン

```ts
const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${location.origin}/auth/confirm?next=/app`,
  },
});
```

Supabase Dashboard で Google プロバイダの有効化が必要（後述）。

## ログアウト

POST で `/auth/signout` を叩く。GET は CSRF 回避のため受け付けない。

```tsx
<form method="post" action="/auth/signout">
  <button type="submit">ログアウト</button>
</form>
```

## サーバー側で現在のユーザーを取る

```ts
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

`getSession()` ではなく `getUser()` を使うこと（Auth サーバーで再検証されるため改竄に強い）。

## 保護ルート

`src/middleware.ts` で `/app` 以下を保護している。未ログインで `/app/*` にアクセスすると `/login?redirect=...` にリダイレクトされる。`/app` は MVP0 のレシピ画面を表示し、ログイン済みセッションを検出すると一覧ビューに入る。

保護対象を追加する場合は `src/lib/supabase/middleware.ts` の `isProtectedRoute` を編集。

## エラーメッセージ方針（セキュリティ）

- ログイン失敗・パスワード不一致 → 「メールまたはパスワードが正しくありません」固定
- パスワードリセット要求 → 「該当アドレスがあればメールを送信しました」固定
- メール確認待ち → 区別して OK（「確認メールをご確認ください」）

ユーザー列挙攻撃（このメールは登録されてる/されてない、を試行で判別される）を防ぐため。

## Supabase Dashboard 側で必要な設定（管理者作業）

@Kazuki-Onishi に作業依頼:

- [ ] Auth > Providers > Email: `Confirm email` ON
- [ ] Auth > Policies: `Minimum password length` を 12 に
- [ ] Auth > Policies: `Leaked password protection` ON（Pro プランの場合）
- [ ] Auth > Rate Limits: sign-in / sign-up / OTP / password reset を絞る
- [ ] Auth > URL Configuration: Redirect URLs に本番ドメインの `/auth/callback` を allowlist 登録
- [ ] Auth > Providers > Google:
  - Google Cloud Console で OAuth Client (Web) を作成
  - 承認済みリダイレクト URI に `https://<project-ref>.supabase.co/auth/v1/callback` を登録
  - Client ID / Secret を Supabase Dashboard に貼る

## マイグレーション

`supabase/migrations/20260524175549_create_profiles.sql` で `public.profiles` テーブルと RLS が定義済み。

- `auth.users` 作成時に trigger で `profiles` 行が自動生成される
- RLS により自分の行のみ SELECT / UPDATE 可能
- 適用: `supabase db reset`（ローカル）/ `supabase db push`（リモート、管理者のみ）
