# Local Dev Setup

このリポジトリのローカル開発環境（Supabase + Docker）を立ち上げる手順です。

## 前提ツール

- **Docker Desktop**（起動した状態にしておく）
  - Mac: `brew install --cask docker`
  - Windows: [公式インストーラ](https://www.docker.com/products/docker-desktop/) または `winget install Docker.DockerDesktop`
- **Supabase CLI**
  - Mac: `brew install supabase/tap/supabase`
  - Windows: `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git; scoop install supabase`
  - Node環境: `npm install -g supabase`
- **Git**

## 初回セットアップ

```bash
# 1. クローン
git clone https://github.com/engineer-guild-hackathon-2026-05/team-04.git
cd team-04

# 2. Supabase にログイン（ブラウザが開く）
supabase login

# 3. クラウド側プロジェクトにリンク
#    ※リンクには Supabase 組織への招待が必要（後述）
supabase link --project-ref kiicjqiylsmlxupvhrti

# 4. ローカル Supabase スタックを起動（初回は Docker イメージDLで数分かかる）
supabase start
```

起動が完了するとローカルの URL/キーが表示されます。主要なもの：

| 用途 | URL |
| --- | --- |
| Studio（DB管理画面） | http://127.0.0.1:54323 |
| API | http://127.0.0.1:54321 |
| DB 直接接続 | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Mailpit（メール確認） | http://127.0.0.1:54324 |

## Supabase 組織への招待について

`supabase link` を実行するには、Supabase 組織 `lumchokwnqbecrazljxa` のメンバーに招待されている必要があります。

未招待の場合はチーム管理者（@Kazuki-Onishi）に **自分の Supabase アカウントのメアド** を伝えてください。招待メールが届いたら承諾するだけです。

> ローカル Docker だけで開発する分には招待不要です（`supabase link` を飛ばして `supabase start` だけでOK）。クラウド側DBへの反映やEdge Functionデプロイをやる時に招待が必要になります。

## 日々の運用フロー

| シチュエーション | コマンド |
| --- | --- |
| 他人のDB変更を取り込む | `git pull` → `supabase db reset` |
| 自分のDB変更を共有する | Studioで変更 → `supabase db diff -f <変更名>` → 生成された `supabase/migrations/*.sql` を `git add` → commit → PR |
| ローカル停止 | `supabase stop` |
| ローカル再起動 | `supabase start` |
| 状態確認 | `supabase status` |

### マイグレーションの作り方（例）

1. `http://127.0.0.1:54323` の Studio でテーブルを追加・変更
2. ターミナルで差分を確認＆ファイル化：
   ```bash
   supabase db diff -f add_users_table
   ```
3. `supabase/migrations/<timestamp>_add_users_table.sql` が生成される
4. これを commit して PR を出せばチームに共有完了

### チームメンバーが pull したあと

```bash
git pull
supabase db reset   # ローカルDBを全migration再適用で最新化
```

> `db reset` はローカルDBの中身を消して作り直すコマンドです。ローカルの作業データは消えるので注意。

## トラブルシューティング

### ポート競合（`port is already allocated`）

別の Supabase プロジェクトが同じポートで動いている可能性があります：

```bash
# 動いているプロジェクト一覧を確認
docker ps --filter "name=supabase_db_" --format "{{.Names}}"

# 競合しているプロジェクトを止める（project-id は上のコマンドで分かる）
supabase stop --project-id <他のproject-id>
```

### Docker が起動していない

Docker Desktop を起動してから `supabase start` をやり直す。

### `supabase link` でパスワードを聞かれる

クラウドDBのパスワードです。Supabase ダッシュボード → Project Settings → Database → Reset database password で再発行できます。空Enterでも metadata link はできます（`db push`/`db pull` 時に必要になる）。
