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
const { data: allergens } = await supabase
  .from('ingredients')
  .select('id, name_ja, name_en, category, dietary_tags')
  .eq('is_allergen', true)
  .order('category')

// プリセット選択時：該当タグを持つ材料をチェック状態にする（UIのstate操作のみ、DB保存はしない）
const presetIngredientIds = allergens
  .filter(i => i.dietary_tags.some(tag => selectedPreset.tags.includes(tag)))
  .map(i => i.id)
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
