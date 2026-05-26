export interface IngredientMaster {
  id: string;
  name_ja: string;
  name_en: string;
  category: string;
  dietary_tags: string[];
}

export type RecipeStep = string | {
  order: number;
  text: string;
};

export type RecipeCultureSectionKey = 'origin' | 'food_culture';

export interface RecipeCultureSection {
  key: RecipeCultureSectionKey;
  label: string;
  title: string;
  body: string;
  sort_order: number;
}

export interface RecipeRelatedReference {
  recipe_id: string;
  reason_label?: string;
  sort_order: number;
}

export interface RecipeRelatedSection {
  key: RecipeCultureSectionKey;
  recipes: RecipeRelatedReference[];
}

export interface RecipeIngredient {
  id: string;           // ingredient_id
  name_ja: string;      // 材料名(日本語)
  quantity: string;     // 分量
  is_optional: boolean; // オプション（省略可能）か
  category?: string;    // DB ingredients.category（制限表示の根拠）
  is_allergen?: boolean; // DB ingredients.is_allergen（特定原材料判定の根拠）
  dietary_tags?: string[]; // DB ingredients.dietary_tags（ヴィーガン等の判定根拠）
  preparation_tags?: string[]; // DB recipe_ingredients.preparation_tags（生・半生など調理状態の判定根拠）
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  cuisine: string;      // 国・地域 (例: ジョージア, インドネシア, インド, メキシコ)
  flag: string;         // 国旗絵文字
  image_url: string;
  cook_time_min: number;
  servings: number;
  is_vegan: boolean;
  is_gluten_free: boolean;
  tags: string[];       // 料理の特徴タグ
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];  // 調理手順（DBでは { order, text }[]、旧mock文字列も許容）
  culture_sections: RecipeCultureSection[]; // 由来・食文化の読み物（DB-primary、fallbackは空配列）
  related_sections: RecipeRelatedSection[]; // 由来・食文化タブの関連レシピ参照（DB-primary、fallbackは空配列）
}

// データベースの `ingredients` 初期データ (令和8年4月時点: 特定原材料9品目 + 推奨20品目) に準拠
export const INGREDIENT_MASTER: IngredientMaster[] = [
  // 特定原材料（表示義務あり・9品目）
  { id: "ing-shrimp", name_ja: "えび", name_en: "shrimp", category: "甲殻類", dietary_tags: ["shellfish", "animal-product"] },
  { id: "ing-cashew", name_ja: "カシューナッツ", name_en: "cashew nut", category: "ナッツ類", dietary_tags: [] },
  { id: "ing-crab", name_ja: "かに", name_en: "crab", category: "甲殻類", dietary_tags: ["shellfish", "animal-product"] },
  { id: "ing-walnut", name_ja: "くるみ", name_en: "walnut", category: "ナッツ類", dietary_tags: [] },
  { id: "ing-wheat", name_ja: "小麦", name_en: "wheat", category: "穀類", dietary_tags: ["gluten"] },
  { id: "ing-buckwheat", name_ja: "そば", name_en: "buckwheat", category: "穀類", dietary_tags: [] },
  { id: "ing-egg", name_ja: "卵", name_en: "egg", category: "卵・乳", dietary_tags: ["egg", "animal-product"] },
  { id: "ing-milk", name_ja: "乳", name_en: "milk", category: "卵・乳", dietary_tags: ["dairy", "animal-product"] },
  { id: "ing-peanut", name_ja: "落花生", name_en: "peanut", category: "ナッツ類", dietary_tags: [] },

  // 特定原材料に準ずるもの（表示推奨・20品目）
  { id: "ing-almond", name_ja: "アーモンド", name_en: "almond", category: "ナッツ類", dietary_tags: [] },
  { id: "ing-sesame", name_ja: "ごま", name_en: "sesame", category: "その他", dietary_tags: [] },
  { id: "ing-soybean", name_ja: "大豆", name_en: "soybean", category: "穀類", dietary_tags: [] },
  { id: "ing-abalone", name_ja: "あわび", name_en: "abalone", category: "魚介類", dietary_tags: ["shellfish", "animal-product"] },
  { id: "ing-squid", name_ja: "いか", name_en: "squid", category: "魚介類", dietary_tags: ["shellfish", "animal-product"] },
  { id: "ing-roe", name_ja: "いくら", name_en: "salmon roe", category: "魚介類", dietary_tags: ["fish", "animal-product"] },
  { id: "ing-salmon", name_ja: "さけ", name_en: "salmon", category: "魚介類", dietary_tags: ["fish", "animal-product"] },
  { id: "ing-mackerel", name_ja: "さば", name_en: "mackerel", category: "魚介類", dietary_tags: ["fish", "animal-product"] },
  { id: "ing-beef", name_ja: "牛肉", name_en: "beef", category: "肉類", dietary_tags: ["meat", "animal-product"] },
  { id: "ing-chicken", name_ja: "鶏肉", name_en: "chicken", category: "肉類", dietary_tags: ["meat", "animal-product"] },
  { id: "ing-orange", name_ja: "オレンジ", name_en: "orange", category: "果物", dietary_tags: [] },
  { id: "ing-kiwi", name_ja: "キウイフルーツ", name_en: "kiwi fruit", category: "果物", dietary_tags: [] },
  { id: "ing-banana", name_ja: "バナナ", name_en: "banana", category: "果物", dietary_tags: [] },
  { id: "ing-pistachio", name_ja: "ピスタチオ", name_en: "pistachio", category: "ナッツ類", dietary_tags: [] },
  { id: "ing-pork", name_ja: "豚肉", name_en: "pork", category: "肉類", dietary_tags: ["meat", "animal-product", "pork"] },
  { id: "ing-macadamia", name_ja: "マカダミアナッツ", name_en: "macadamia nut", category: "ナッツ類", dietary_tags: [] },
  { id: "ing-peach", name_ja: "もも", name_en: "peach", category: "果物", dietary_tags: [] },
  { id: "ing-yam", name_ja: "やまいも", name_en: "yam", category: "その他", dietary_tags: [] },
  { id: "ing-apple", name_ja: "りんご", name_en: "apple", category: "果物", dietary_tags: [] },
  { id: "ing-gelatin", name_ja: "ゼラチン", name_en: "gelatin", category: "その他", dietary_tags: ["animal-product"] },
];

export const MOCK_RECIPES: Recipe[] = [
  {
    id: "rec-lobio",
    title: "ロビオ (ジョージア伝統の赤インゲン豆シチュー)",
    description: "ジョージア（旧グルジア）で古くから愛される、お肉を使わないスパイス豆シチュー。とろっとしたインゲン豆の旨味に、くるみのコクとコリアンダーの香りが絶妙にマッチした絶品スープです。現地では伝統的な粘土の器でサーブされます。",
    cuisine: "ジョージア",
    flag: "🇬🇪",
    image_url: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=800",
    cook_time_min: 25,
    servings: 2,
    is_vegan: true,
    is_gluten_free: true,
    tags: ["ヴィーガン", "グルテンフリー", "温まるシチュー", "ナッツ使用"],
    ingredients: [
      { id: "none-kidney-beans", name_ja: "赤インゲン豆（キドニービーンズ缶詰）", quantity: "400g (1缶)", is_optional: false },
      { id: "ing-walnut", name_ja: "くるみ (細かく刻む)", quantity: "50g", is_optional: false },
      { id: "none-onion", name_ja: "玉ねぎ (みじん切り)", quantity: "1個", is_optional: false },
      { id: "none-garlic", name_ja: "ニンニク (すりおろし)", quantity: "2片", is_optional: false },
      { id: "none-coriander", name_ja: "パクチー（フレッシュ・刻む）", quantity: "1/2束", is_optional: false },
      { id: "none-coriander-pwd", name_ja: "コリアンダーパウダー", quantity: "小さじ1", is_optional: false },
      { id: "none-cumin", name_ja: "クミンパウダー", quantity: "小さじ1/2", is_optional: false },
      { id: "none-vinegar", name_ja: "ワインビネガー (または酢)", quantity: "大さじ1", is_optional: false },
      { id: "none-salt", name_ja: "塩・ブラックペッパー", quantity: "適量", is_optional: false },
    ],
    culture_sections: [],
    related_sections: [
      {
        key: "origin",
        recipes: [
          { recipe_id: 'rec-dal', reason_label: "豆を主役にした日常料理", sort_order: 1 },
        ],
      },
    ],
    steps: [
      "フライパンにオリーブオイルを熱し、みじん切りにした玉ねぎを透き通るまで中火で炒めます。",
      "すりおろしたニンニク、コリアンダーパウダー、クミンパウダーを加え、香りが立つまでさらに1分炒めます。",
      "水気を軽く切った赤インゲン豆と、ひたひたになる程度の水（約150ml）を加え、弱火で豆を潰しながら10分煮込みます。",
      "細かく刻んだくるみとワインビネガーを加え、さらに3分煮てとろみをつけます。",
      "火を止め、刻んだパクチーを混ぜ合わせ、塩・コショウで味を整えて完成です。お好みでグルテンフリーのコーンブレッドなどを添えてください。"
    ]
  },
  {
    id: "rec-gadogado",
    title: "ガドガド (インドネシアの温野菜厚揚げピーナッツサラダ)",
    description: "「ごちゃ混ぜにする」という意味を持つ、インドネシアの代表的な温野菜料理。茹でたキャベツやもやし、厚揚げ（タフ）に、濃厚でスパイシーなピーナッツソースをたっぷりかけていただきます。動物性食材を使わず、ヴィーガンとして楽しめる一皿です。",
    cuisine: "インドネシア",
    flag: "🇮🇩",
    image_url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800",
    cook_time_min: 20,
    servings: 2,
    is_vegan: true,
    is_gluten_free: true,
    tags: ["ヴィーガン", "グルテンフリー対応", "温野菜", "アジアン"],
    ingredients: [
      { id: "ing-peanut", name_ja: "無糖ピーナッツバター (ソース用)", quantity: "大さじ4", is_optional: false },
      { id: "ing-soybean", name_ja: "厚揚げ (一口大に切ってカリッと焼く)", quantity: "1パック", is_optional: false },
      { id: "none-cabbage", name_ja: "キャベツ (ざく切りして茹でる)", quantity: "3〜4枚", is_optional: false },
      { id: "none-bean-sprouts", name_ja: "もやし (サッと茹でる)", quantity: "1/2袋", is_optional: false },
      { id: "none-cucumber", name_ja: "きゅうり (スライス)", quantity: "1/2本", is_optional: true },
      { id: "ing-soybean", name_ja: "たまり醤油 (またはグルテンフリー醤油・ソース用)", quantity: "大さじ1", is_optional: false },
      { id: "none-maple", name_ja: "メープルシロップ（または甜菜糖・ソース用）", quantity: "大さじ1", is_optional: false },
      { id: "none-chili", name_ja: "一味唐辛子 (またはチリソース・ソース用)", quantity: "小さじ1/2", is_optional: true },
      { id: "none-lime", name_ja: "レモン汁 (またはライム汁・ソース用)", quantity: "大さじ1", is_optional: false }
    ],
    culture_sections: [],
    related_sections: [
      {
        key: "origin",
        recipes: [
          { recipe_id: 'rec-lobio', reason_label: "植物性の共同食", sort_order: 1 },
        ],
      },
    ],
    steps: [
      "鍋にお湯を沸かし、キャベツともやしをシャキシャキ感が残る程度にサッと茹でてザルに上げ、水気をしっかり切ります。",
      "厚揚げはフライパンまたはトースターで表面がカリッとするまで焼き、食べやすい大きさに切ります。",
      "【ソース作り】耐熱ボウルにピーナッツバター、たまり醤油、メープルシロップ、レモン汁、一味唐辛子を入れ、大さじ2の温水を少しずつ加えながら、なめらかなクリーム状になるまでよく混ぜ合わせます。",
      "お皿に茹で野菜、きゅうり、カリカリ厚揚げを美しく盛り付けます。",
      "食べる直前に、温かいピーナッツソースをたっぷりとかけ、全体を「ごちゃ混ぜ」にして召し上がれ！"
    ]
  },
  {
    id: "rec-dal",
    title: "レンズ豆のダル (南インドの本格まろやか豆カレー)",
    description: "小麦粉（ルウ）や動物性食材を使わず、レンズ豆のデンプンとココナッツミルクのまろやかさだけで仕上げる南インドの日常食。スパイスの香りと豆のやさしい甘みを楽しめる、アレルギー特定原材料9品目を含まないレシピです。",
    cuisine: "インド",
    flag: "🇮🇳",
    image_url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=800",
    cook_time_min: 30,
    servings: 3,
    is_vegan: true,
    is_gluten_free: true,
    tags: ["ヴィーガン", "グルテンフリー", "9大アレルギーフリー", "スパイス薬膳"],
    ingredients: [
      { id: "none-lentils", name_ja: "赤レンズ豆（皮なし乾燥・水洗いする）", quantity: "150g", is_optional: false },
      { id: "none-coconut-milk", name_ja: "ココナッツミルク缶", quantity: "200ml", is_optional: false },
      { id: "none-tomato", name_ja: "トマト缶 (カットタイプ)", quantity: "200g (1/2缶)", is_optional: false },
      { id: "none-onion", name_ja: "玉ねぎ (細かくみじん切り)", quantity: "1個", is_optional: false },
      { id: "none-ginger", name_ja: "生姜 (すりおろし)", quantity: "1片", is_optional: false },
      { id: "none-garlic", name_ja: "ニンニク (すりおろし)", quantity: "1片", is_optional: false },
      { id: "none-curry", name_ja: "グルテンフリーカレー粉 (または クミン・コリアンダー・ターメリック各大さじ1)", quantity: "大さじ1", is_optional: false },
      { id: "none-soup", name_ja: "野菜ブイヨン (または水)", quantity: "300ml", is_optional: false },
      { id: "none-salt", name_ja: "塩", quantity: "小さじ1", is_optional: false }
    ],
    culture_sections: [],
    related_sections: [
      {
        key: "origin",
        recipes: [
          { recipe_id: 'rec-lobio', reason_label: "豆料理の家庭食", sort_order: 1 },
        ],
      },
    ],
    steps: [
      "赤レンズ豆は水で軽く洗い、ザルに上げておきます。（浸水時間は不要です）",
      "深鍋に少量の油（またはココナッツオイル）を熱し、玉ねぎ、生姜、ニンニクを入れてキツネ色になるまで中火で炒めます。",
      "グルテンフリーカレー粉（またはスパイス）を加え、弱火で全体に馴染ませるように30秒ほど炒め、スパイスの香りを引き出します。",
      "トマト缶、野菜ブイヨン（水）、洗ったレンズ豆を加え、沸騰したら弱火にし、フタをして時々混ぜながら15分ほど、豆が柔らかくなるまで煮込みます。",
      "ココナッツミルクを加えて弱火のままさらに5分煮込み、豆がクリーミーに煮崩れたら塩で味を整えて完成です。インディカ米や玄米と相性抜群です。"
    ]
  },
  {
    id: "rec-tacos",
    title: "タコス・デ・ソヤ (メキシコ風大豆ミートのストリートタコス)",
    description: "メキシコシティの屋台で大人気のエスニックストリートフード。伝統的なタコスは小麦粉ではなく「トウモロコシ粉（マサ）」のトルティーヤを使うため、もともと完全グルテンフリーです。大豆ミート（ソイミート）をスパイスで味付けし、ジューシーでヘルシーに仕上げます。",
    cuisine: "メキシコ",
    flag: "🇲🇽",
    image_url: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&q=80&w=800",
    cook_time_min: 20,
    servings: 2,
    is_vegan: true,
    is_gluten_free: true,
    tags: ["ヴィーガン", "グルテンフリー", "ピリ辛サルサ", "手づかみフード"],
    ingredients: [
      { id: "none-tortillas", name_ja: "コーントルティーヤ (カルディ等で入手可)", quantity: "4〜6枚", is_optional: false },
      { id: "ing-soybean", name_ja: "大豆ミート (乾燥ミンチまたはフィレタイプ)", quantity: "50g (湯戻し後150g)", is_optional: false },
      { id: "none-onion", name_ja: "玉ねぎ (1/2個はみじん切り、1/2個はトッピング用)", quantity: "1個", is_optional: false },
      { id: "none-tomato", name_ja: "完熟トマト (サルサ用・角切り)", quantity: "1個", is_optional: false },
      { id: "none-cilantro", name_ja: "パクチー (細かく刻む)", quantity: "1/2束", is_optional: false },
      { id: "none-lime", name_ja: "ライム (またはレモン・くし形切り)", quantity: "1個", is_optional: false },
      { id: "none-taco-seasoning", name_ja: "タコスパイス (チリパウダー、クミン、パプリカ、オレガノ各大さじ1/2)", quantity: "大さじ1.5", is_optional: false },
      { id: "ing-soybean", name_ja: "たまり醤油（またはグルテンフリー醤油）", quantity: "小さじ1", is_optional: false },
      { id: "none-salt", name_ja: "塩・コショウ", quantity: "適量", is_optional: false }
    ],
    culture_sections: [],
    related_sections: [
      {
        key: "origin",
        recipes: [
          { recipe_id: 'rec-gadogado', reason_label: "屋台と手軽な食事", sort_order: 1 },
        ],
      },
    ],
    steps: [
      "大豆ミートはパッケージの指示通りにお湯で戻し、水気をギューッとしっかり絞ります（大豆臭さを抜くポイントです）。",
      "【フレッシュサルサ作り】ボウルに角切りトマト、みじん切りのトッピング用玉ねぎ、刻んだパクチーの半分、レモン汁（大さじ1）、塩少々を混ぜ合わせて冷やしておきます。",
      "フライパンにオイルを熱し、みじん切り玉ねぎを炒め、しんなりしたら大豆ミートを加えます。タコスパイス、たまり醤油、塩・コショウを振り、全体がジューシーでこんがりするまで中火で5分炒めます。",
      "コーントルティーヤをトースターやフライパンで両面サッと温め、柔らかくします。",
      "温めたトルティーヤにスパイシー大豆ミートを乗せ、サルサ、残りのパクチーを散らし、ライムを添えて手で包み込んで豪快に召し上がれ！"
    ]
  }
];
