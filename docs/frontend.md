# フロントエンド実装メモ

フロント実装時に参照するUI設計・データ取得方針のメモ。

## NG設定画面

ユーザーが「食べられないもの」を登録する画面。2つの選択方式を組み合わせる。

### 食事制限プリセット（`user_dietary_restrictions`）

生活習慣・思想・健康方針でまとめて除外できるボタン群。個別材料を知らなくても使えるようにする。

```
[ ヴィーガン ]  [ ベジタリアン ]  [ ペスカタリアン ]
[ グルテンフリー ]  [ ハラール ]  [ コーシャー ]
```

- トグルボタン形式が直感的
- 選択済みは色を変えて視覚的に区別する
- 複数選択可

### 個別NG材料（`user_restricted_ingredients`）

プリセットに当てはまらない細かい除外に使う。

- `ingredients.is_allergen = true` の材料のみ表示する（AIが追加した材料は表示しない）
- カテゴリ別にグループ化して表示する

```
甲殻類      [ えび ✓ ]  [ かに ]
穀類        [ 小麦 ]    [ そば ]
卵・乳      [ 卵 ]      [ 乳 ✓ ]
ナッツ類    [ 落花生 ]  [ くるみ ] ...
```

- チェックボックス or トグルチップで実装
- `reason`（アレルギー / 好み / 宗教上）は初期実装では省略してもよい

### データ取得

```ts
// プリセット選択肢はハードコードでよい（DBから取る必要なし）
const DIETARY_PRESETS = [
  { value: 'vegan',       label: 'ヴィーガン' },
  { value: 'vegetarian',  label: 'ベジタリアン' },
  { value: 'pescatarian', label: 'ペスカタリアン' },
  { value: 'gluten-free', label: 'グルテンフリー' },
  { value: 'halal',       label: 'ハラール' },
  { value: 'kosher',      label: 'コーシャー' },
]

// 個別NG材料の選択肢取得
const { data: allergens } = await supabase
  .from('ingredients')
  .select('id, name_ja, name_en, category')
  .eq('is_allergen', true)
  .order('category')
```

---

## レシピ提案画面

### AIへ渡す情報

API Routeに以下を送り、サーバーサイドでClaudeに渡す。

```ts
// クライアント → API Route に渡す情報
{
  restrictedIngredientIds: string[],  // user_restricted_ingredients
  dietaryRestrictions: string[],      // user_dietary_restrictions
  locale: 'ja' | 'en',               // レシピの言語
}
```

Claudeへのプロンプト例：

```
以下の制限を守って、食べられる料理を5つ提案してください。
- 除外する材料: えび、乳
- 食事制限: グルテンフリー
- 言語: 日本語でレシピを返してください

JSON形式で返してください。
```

### 既存レシピのフィルタリング

`docs/database.md` のSQLクエリを参照。API Routeもしくはクライアントから直接Supabaseに投げる。

---

## レシピ詳細画面

- `steps`（jsonb）は手順の配列として保存されている。表示時に `steps.map()` でステップごとにレンダリングする
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
