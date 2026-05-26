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
`/api/me/profile` の通常ユーザー取得・更新は本人確認済みセッションで行い、service roleを使わない。DB-backed デモセッションだけは `auth.users` に紐づかない専用テーブルを Route Handler 経由で扱うため、server-only の admin client を使う。

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


## DB-backed デモログイン

発表・試用向けに、ログイン画面ではメール/パスワードとは別に「デモで体験する」ボタンを表示する。`DEMO_MODE=true` のときだけ有効になり、`POST /auth/demo` が `demo_sessions` に専用セッションを作成または復元する。

- ブラウザの `localStorage` には `globalbites_demo_session_id` だけを保存し、これは復元ヒントとしてのみ使う
- 実際の認証状態は server-issued の `globalbites_demo_auth` httpOnly 署名 Cookie で判定する
- 新規デモセッションは `demo-user-001` のようなDB生成表示名を持ち、初回は `/app?view=profile` へ遷移してプロフィール設定を体験する
- デモプロフィール、好み、NG材料は `/api/me/profile` 経由で `demo_profiles` / `demo_restricted_ingredients` に保存する
- デモ用テーブルはRLSを有効化し、anon/authenticated向けの直接アクセスポリシーは作らない

必要な環境変数:

```
DEMO_MODE=true
SUPABASE_SERVICE_ROLE_KEY=<service role key>
# 推奨: Cookie署名専用の長いランダム値。未設定時はservice role keyを署名にも使う。
DEMO_SESSION_SECRET=<random secret>
```

## 認証方式の判断

MVP では magic link / OTP、確認メール、Google ログインも検討したが、メール送信設定・送信元管理・OAuth 設定の複雑さがデモの目的に対して大きいため、メールアドレス + パスワード方式のみを維持する。

この方式を使う前提として、以下を必須条件にする。

- Supabase Auth のみを使用し、アプリ側でパスワードを直接保存しない
- HTTPS を維持する
- パスワードポリシーと漏洩パスワード保護を有効化する
- RLS と `getUser()` ベースのサーバー側検証を維持する

## ログアウト

Supabase client を直接持つ画面でログアウトする場合は、デモセッション確認後に `/auth/demo` へ `DELETE` を送り、通常の Supabase セッションでは `supabase.auth.signOut()` を呼ぶ。

```ts
await fetch('/auth/demo', { method: 'DELETE' }).catch(() => null);
await supabase.auth.signOut();
```

現在のアプリシェルは Supabase client を直接持たないため、`POST /auth/signout` 経由でデモ Cookie と Supabase セッション Cookie をサーバー側でまとめて失効させる。GET は CSRF 回避のため受け付けない。

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
| `GET /api/me/profile` | `profiles`・`user_preferences`・NG材料設定を取得。demo cookie が有効な場合は `demo_profiles` 等を取得 | 通常ユーザーは使わない / demo branch はserver-only admin clientを使う |
| `PUT /api/me/profile` | 表示名・好み・NG材料設定を更新。demo cookie が有効な場合はdemo専用テーブルへ保存 | 通常ユーザーは使わない / demo branch はserver-only admin clientを使う |

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

`supabase/migrations/20260524000001_init_schema.sql` で基本テーブルと RLS を定義し、`20260524190000_harden_auth_rls.sql` で auth / RLS の hardening を行う。DB-backed デモログインは `20260525234000_add_demo_sessions.sql` で `demo_sessions` / `demo_profiles` / `demo_restricted_ingredients` を追加する。

- `auth.users` 作成時に trigger で `profiles` 行が自動生成される
- RLS により自分の行のみ SELECT / UPDATE 可能
- 適用: `supabase db reset`（ローカル）/ `supabase db push`（リモート、管理者のみ）
