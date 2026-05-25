# 認証（Supabase Auth）

Supabase Auth を使った認証基盤とログイン画面の使い方。MVP ではメールアドレス + パスワード方式を採用し、ログイン後は `/app` に遷移する。

## セットアップ（初回のみ）

1. `.env.local.example` をコピーして `.env.local` を作成
2. Supabase Dashboard / CLI で取得した Project URL と anon key を `.env.local` に設定

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

秘密鍵（service role key など）はブラウザ向け環境変数に入れない。

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
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { name: displayName },
  },
});

if (data.session) {
  router.replace("/app");
}
```

MVP では確認メールを送らない。Supabase Dashboard 側の Email provider は `Confirm email` をOFFにし、登録直後にセッションが作成される前提にする。`data.session` が返らない場合は、hosted Auth 側でメール確認が有効になっている可能性が高い。

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

MVP では magic link / OTP、確認メール、Google ログインも検討したが、メール送信設定・送信元管理・OAuth 設定の複雑さがデモの目的に対して大きいため、メールアドレス + パスワード方式のみを維持する。

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

## 保護ルート

`src/middleware.ts` で `/app` 以下を保護している。未ログインで `/app/*` にアクセスすると `/login?redirect=...` にリダイレクトされる。`/app` は MVP0 のレシピ画面を表示し、ログイン済みセッションを検出すると一覧ビューに入る。

保護対象を追加する場合は `src/lib/supabase/middleware.ts` の `isProtectedRoute` を編集。

## エラーメッセージ方針（セキュリティ）

- ログイン失敗・パスワード不一致 → 「メールまたはパスワードが正しくありません」固定
- サインアップ後に `data.session` が無い → hosted Auth 側でメール確認が有効な設定ミスとして扱う

ユーザー列挙攻撃（このメールは登録されてる/されてない、を試行で判別される）を防ぐため。

## Supabase Dashboard 側で必要な設定（管理者作業）

@Kazuki-Onishi に作業依頼:

- [ ] Auth > Providers > Email: `Confirm email` をOFFにする（実メール送信を使わない）
- [ ] Auth > Policies: `Minimum password length` を 12 以上にする
- [ ] Auth > Policies: `Password requirements` で大文字・小文字・数字・記号を必須にする
- [ ] Auth > Policies: `Leaked password protection` ON（Pro プランの場合）
- [ ] Auth > Rate Limits: sign-in / sign-up / password reset を絞る
- [ ] Auth > URL Configuration: `/auth/callback` を使う追加フローを有効化する場合だけ、利用するデモ / 本番 URL を allowlist 登録する

## マイグレーション

`supabase/migrations/20260524000001_init_schema.sql` で基本テーブルと RLS を定義し、`20260524190000_harden_auth_rls.sql` で auth / RLS の hardening を行う。

- `auth.users` 作成時に trigger で `profiles` 行が自動生成される
- RLS により自分の行のみ SELECT / UPDATE 可能
- 適用: `supabase db reset`（ローカル）/ `supabase db push`（リモート、管理者のみ）
