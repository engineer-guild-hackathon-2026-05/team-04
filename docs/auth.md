# 認証（Supabase Auth）

Supabase Auth を使った認証基盤とログイン画面の使い方。MVP ではメールアドレス + パスワード方式を採用し、ログイン後は `/app` に遷移する。

## セットアップ（初回のみ）

1. `.env.local.example` をコピーして `.env.local` を作成
2. Supabase Dashboard / CLI で取得した Project URL と anon key を `.env.local` に設定

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
# サーバー専用。必要なRoute Handlerだけで使う。NEXT_PUBLIC_は禁止。
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

`NEXT_PUBLIC_` 付きの値はブラウザに露出する。anon keyはRLS前提の公開キーとして扱い、ユーザー本人の操作はCookieセッション + RLSで制限する。
秘密鍵（service role key など）はブラウザ向け環境変数に入れない。

## クライアントの使い分け

| 用途 | import | 例 |
| --- | --- | --- |
| Client Component（"use client"） | `@/lib/supabase/client` | ログインフォームのボタン押下時 |
| Server Component / Server Action / Route Handler | `@/lib/supabase/server` | サーバー側でユーザー取得 |

service role clientを作る場合は通常のユーザー操作に使わない。
RLSをバイパスするため、`source_type = 'ai'` / `'api'` のレシピ保存など、サーバーが所有する書き込みに限定する。
`/api/me/profile` の取得・更新は本人確認済みセッションで行い、service roleを使わない。

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

## 認証方式の判断

MVP では magic link / OTP や Google ログインも検討したが、メール送信設定・送信元管理・OAuth 設定の複雑さがデモの目的に対して大きいため、メールアドレス + パスワード方式を維持する。

この方式を使う前提として、以下を必須条件にする。

- Supabase Auth のみを使用し、アプリ側でパスワードを直接保存しない
- HTTPS を維持する
- パスワードポリシーと漏洩パスワード保護を有効化する
- RLS と `getUser()` ベースのサーバー側検証を維持する

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

## プロフィールAPI

ログイン後のプロフィールと食べられない材料設定は `/api/me/profile` で扱う。

| メソッド | 用途 | service role |
|---|---|---|
| `GET /api/me/profile` | `profiles`・`user_preferences`・NG材料設定を取得 | 使わない |
| `PUT /api/me/profile` | 表示名・好み・NG材料設定を更新 | 使わない |

レスポンスの中心フィールド：

```json
{
  "userName": "山田 太郎",
  "restrictedIngredients": ["ing-shrimp", "ing-milk"],
  "preferredDishes": ["soup"],
  "preferredCuisines": ["india"],
  "source": "database",
  "fallbackFields": []
}
```

`restrictedIngredients` は `ingredients.ingredient_code` の配列。
API側で存在しないコードを除外または400エラーにし、DB内部UUIDをクライアントへ要求しない。
`source` は `database` / `demo` / `partial-fallback` / `local-fallback` を返す。
一部のDB readだけが失敗した場合は `partial-fallback` と `fallbackFields`（`userName`, `restrictedIngredients`, `preferences`）で失敗フィールドを示し、フロントは該当フィールドだけローカル値を使う。
`PUT /api/me/profile` は好み設定またはNG材料設定の永続化に失敗した場合、`database` 成功レスポンスを返さず、フロントはローカル保存で継続する。

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

- [ ] Auth > Policies: `Minimum password length` を 12 以上にする
- [ ] Auth > Policies: `Password requirements` で大文字・小文字・数字・記号を必須にする
- [ ] Auth > Policies: `Leaked password protection` ON（Pro プランの場合）
- [ ] Auth > Rate Limits: sign-in / sign-up / password reset を絞る
- [ ] Auth > URL Configuration: Redirect URLs に利用するデモ / 本番 URL を allowlist 登録する

## マイグレーション

`supabase/migrations/20260524000001_init_schema.sql` で基本テーブルと RLS を定義し、`20260524190000_harden_auth_rls.sql` で auth / RLS の hardening を行う。

- `auth.users` 作成時に trigger で `profiles` 行が自動生成される
- RLS により自分の行のみ SELECT / UPDATE 可能
- 適用: `supabase db reset`（ローカル）/ `supabase db push`（リモート、管理者のみ）
