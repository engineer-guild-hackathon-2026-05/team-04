# フロントエンド実装メモ

フロント実装時に参照するUI設計・データ取得方針のメモ。

## NG設定画面

ユーザーが「食べられないもの」を登録する画面。2つの選択方式を組み合わせる。

### 食事制限プリセット（UIショートカット・DBには保存しない）

「ヴィーガン」「グルテンフリー」等はあくまでデフォルト選択を補助するUIショートカット。
プリセットを選んだだけでは保存されず、ユーザーが最終確定した個別材料のみ `user_restricted_ingredients` に保存する。

```
[ ヴィーガン ]  [ ベジタリアン ]  [ ペスカタリアン ]
[ グルテンフリー ]  [ ハラール ]  [ コーシャー ]
     ↓ 選択するとその定義に沿った材料がデフォルトチェックされる
```

- 「ヴィーガン」が何を意味するかは人によって異なるため、チェック状態はユーザーが自由に変更できる
- 保存するのは最終的な個別材料の選択のみ

### 個別NG材料（`user_restricted_ingredients` に保存）

- `ingredients.is_allergen = true` の材料のみ表示する（AIが追加した材料は表示しない）
- UI stateとAPI送信値にはDB内部IDではなく `ingredient_code` を使う
- カテゴリ別にグループ化して表示する
- プリセットで自動チェックされた状態からユーザーが調整できる

```
甲殻類      [ えび ✓ ]  [ かに ✓ ]
穀類        [ 小麦 ]    [ そば ]
卵・乳      [ 卵 ✓ ]    [ 乳 ✓ ]
ナッツ類    [ 落花生 ]  [ くるみ ] ...
```

- チェックボックス or トグルチップで実装
- `reason`（アレルギー / 好み / 宗教上）は初期実装では省略してもよい

### データ取得・プリセット定義

```ts
// プリセットとそのデフォルト対象タグをフロントでハードコード（DBに持たない）
const DIETARY_PRESETS = [
  { value: 'vegan',        label: 'ヴィーガン',       tags: ['animal-product'] },
  { value: 'vegetarian',   label: 'ベジタリアン',      tags: ['meat', 'fish', 'shellfish'] },
  { value: 'pescatarian',  label: 'ペスカタリアン',    tags: ['meat'] },
  { value: 'gluten-free',  label: 'グルテンフリー',    tags: ['gluten'] },
  { value: 'halal',        label: 'ハラール',          tags: ['pork', 'alcohol'] },
  { value: 'kosher',       label: 'コーシャー',        tags: ['pork', 'shellfish'] },
]

// 材料一覧取得（dietary_tags を含めて取得し、プリセット選択時のチェック判定に使う）
const res = await fetch('/api/ingredients')
const { ingredients } = await res.json()

// プリセット選択時：該当タグを持つ材料をチェック状態にする（UIのstate操作のみ、DB保存はしない）
const presetIngredientCodes = ingredients
  .filter(i => i.dietary_tags.some(tag => selectedPreset.tags.includes(tag)))
  .map(i => i.id)
```

### API連携

フロントはSupabaseの内部UUIDではなく、DBの `ingredient_code` に対応する安定コード（APIレスポンスでは `id`）を扱う。

| API | 用途 | 認証 | フロントで使う主なフィールド |
|---|---|---|---|
| `GET /api/ingredients` | NG材料選択肢を取得 | 不要 | `id`（= `ingredient_code`）, `name_ja`, `name_en`, `category`, `dietary_tags` |
| `GET /api/me/profile` | ログインユーザーのプロフィール・設定を取得 | 必要 | `userName`, `restrictedIngredients`, `preferredDishes`, `preferredCuisines` |
| `PUT /api/me/profile` | プロフィール・NG材料設定を保存 | 必要 | `userName`, `restrictedIngredients`, `preferredDishes`, `preferredCuisines` |

`PUT /api/me/profile` に送る値の例：

```json
{
  "userName": "山田 太郎",
  "restrictedIngredients": ["ing-shrimp", "ing-milk", "ing-wheat"],
  "preferredDishes": ["soup", "spicy"],
  "preferredCuisines": ["india", "mexico"]
}
```

保存後の画面復元は `GET /api/me/profile` の `restrictedIngredients` をチェック状態に反映する。
`GET /api/me/profile` が `source: "partial-fallback"` と `fallbackFields` を返す場合は、失敗したフィールドだけ localStorage を使う。
例: `fallbackFields: ["preferences"]` のときはDBから取得できた `restrictedIngredients` を維持し、好み設定だけローカル値を保持する。
未ログイン時はプロフィールAPIを呼ばず、ローカルstateだけで選択状態を保持する。

---

## レシピ提案画面

### `steps` のJSONBスキーマ

`recipes.steps` の形は以下で統一する。AIへのプロンプトとフロントのレンダリング実装は必ずこの形に合わせること。

```ts
// steps の型定義
type Step = {
  order: number  // 手順番号（1始まり）
  text: string   // 手順の説明
}

// 例
const steps: Step[] = [
  { order: 1, text: "玉ねぎをみじん切りにする" },
  { order: 2, text: "フライパンを中火で熱し、サラダ油を引く" },
  { order: 3, text: "玉ねぎを炒め、透明になったら塩コショウで味を調える" }
]
```

### AIへ渡す情報

API Routeに以下を送り、サーバーサイドでClaudeに渡す。

```ts
// クライアント → API Route に渡す情報
{
  restrictedIngredients: string[],  // NG材料の ingredient_code リスト
  locale: 'ja' | 'en',              // レシピの生成言語
}
```

サーバー側で `ingredient_code` から `name_ja` / `name_en` を解決し、Claudeには表示名のリストを渡す。
Claudeへのプロンプト・期待するJSONの形例：

```
以下の制限を守って、食べられる料理を5つ提案してください。
除外する材料: えび、乳

以下のJSON形式で返してください。
{
  "recipes": [
    {
      "title": "料理名",
      "description": "一言説明",
      "servings": 2,
      "cook_time_min": 20,
      "ingredients": [
        { "name": "材料名", "quantity": "分量" }
      ],
      "steps": [
        { "order": 1, "text": "手順の説明" }
      ]
    }
  ]
}
```

### 既存レシピのフィルタリング

`docs/database.md` のSQLクエリを参照。フロントから直接DBへ複雑な除外条件を投げず、`/api/recipes` 経由で取得する。

| API | 用途 | 認証 | 備考 |
|---|---|---|---|
| `GET /api/recipes` | 表示可能な既存レシピ一覧を取得 | 任意 | DB取得に失敗した場合はフォールバックレシピを返す |
| `POST /api/recipes` | AIレシピ生成・保存（追加時） | 任意または必要に応じて必須 | `source_type = 'ai'` の保存はサーバー側service roleで実行 |

`POST /api/recipes` に明示的な制限を渡す場合：

```json
{
  "restrictedIngredients": ["ing-shrimp", "ing-milk"],
  "locale": "ja"
}
```

AI生成APIを追加する場合、ログイン済みユーザーではリクエスト本文の指定がないときに `/api/me/profile` 相当の保存済み設定を使う。

---

## レシピ詳細画面

- `steps`（jsonb）は `{ order: number, text: string }[]` の配列。スキーマ定義は「レシピ提案画面」の `steps` の型定義を参照
- `ingredients_used` ではなく `recipe_ingredients` テーブルをJOINして材料一覧を取得する

```ts
const { data: recipe } = await supabase
  .from('recipes')
  .select(`
    *,
    recipe_ingredients (
      quantity,
      is_optional,
      ingredients ( name_ja, name_en )
    )
  `)
  .eq('id', recipeId)
  .single()
```

---

## 多言語対応

- 材料名は `name_ja` / `name_en` をユーザーのロケールで出し分ける
- レシピ本文（`title`, `description`, `steps`）はAI生成時にロケールを渡して生成言語を制御する
- i18nライブラリの導入は工数次第。最悪 `locale` state だけ持てば最低限動く

---

## 環境変数の使い分け

- Client Componentから参照してよいのは `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` のみ
- `SUPABASE_SERVICE_ROLE_KEY` はブラウザに出さない。`NEXT_PUBLIC_` プレフィックスも付けない
- `/api/me/profile` は本人のCookieセッションとRLSで更新するため、service roleを使わない
- `/api/recipes` でAI/API由来レシピをDBへ保存する処理だけ、Route Handler内でservice roleを使う
