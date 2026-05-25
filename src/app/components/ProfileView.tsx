'use client';

import React, { useState } from 'react';
import { User, ShieldAlert, Sparkles, Save, ArrowLeft, Check, Search, X } from 'lucide-react';
import type { IngredientMaster, Recipe } from '@/lib/mockData';

type RestrictionReason = 'allergy' | 'dislike' | 'religious';

interface ProfileViewProps {
  ingredientOptions: IngredientMaster[];
  recipeOptions: Recipe[];
  initialUserName: string;
  initialRestrictedIngredients: string[];
  initialRestrictedIngredientReasons: Record<string, RestrictionReason>;
  initialPreferredDishes: string[];
  initialPreferredCuisines: string[];
  onSaveProfile: (profile: {
    userName: string;
    restrictedIngredients: string[];
    restrictedIngredientReasons: Record<string, RestrictionReason>;
    preferredDishes: string[];
    preferredCuisines: string[];
  }) => void;
  onBackToRecipes: () => void;
}

// 好みの料理の定義
const PREFERRED_DISHES = [
  { id: 'spicy', label: '🌶️ 辛い料理' },
  { id: 'soup', label: '🥣 スープ・シチュー' },
  { id: 'noodle', label: '🍜 麺類' },
  { id: 'salad', label: '🥗 サラダ・前菜' },
  { id: 'rice', label: '🍛 ご飯もの' }
];

// 好みの国の定義
type SelectableOption = {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
};

const PREFERRED_CUISINES: SelectableOption[] = [
  { id: 'georgia', label: '🇬🇪 ジョージア', keywords: ['georgia', 'グルジア', 'コーカサス'] },
  { id: 'indonesia', label: '🇮🇩 インドネシア', keywords: ['indonesia', '東南アジア'] },
  { id: 'india', label: '🇮🇳 インド', keywords: ['india', '南アジア', 'カレー'] },
  { id: 'mexico', label: '🇲🇽 メキシコ', keywords: ['mexico', 'ラテンアメリカ'] },
  { id: 'korea', label: '🇰🇷 韓国', keywords: ['korea', '韓国料理'] },
  { id: 'china', label: '🇨🇳 中国', keywords: ['china', '中華'] },
  { id: 'thailand', label: '🇹🇭 タイ', keywords: ['thai', '東南アジア'] },
  { id: 'vietnam', label: '🇻🇳 ベトナム', keywords: ['vietnam', '東南アジア'] },
  { id: 'turkey', label: '🇹🇷 トルコ', keywords: ['turkey', '中東'] },
  { id: 'morocco', label: '🇲🇦 モロッコ', keywords: ['morocco', '北アフリカ'] },
  { id: 'lebanon', label: '🇱🇧 レバノン', keywords: ['lebanon', '中東'] },
  { id: 'italy', label: '🇮🇹 イタリア', keywords: ['italy', '地中海'] },
  { id: 'france', label: '🇫🇷 フランス', keywords: ['france', '欧州'] },
  { id: 'spain', label: '🇪🇸 スペイン', keywords: ['spain', '地中海'] },
  { id: 'peru', label: '🇵🇪 ペルー', keywords: ['peru', '南米'] },
  { id: 'ethiopia', label: '🇪🇹 エチオピア', keywords: ['ethiopia', 'アフリカ'] },
];

const ALLERGEN_DISPLAY_ORDER = [
  'ing-shrimp',
  'ing-cashew',
  'ing-crab',
  'ing-walnut',
  'ing-wheat',
  'ing-buckwheat',
  'ing-egg',
  'ing-milk',
  'ing-peanut',
  'ing-almond',
  'ing-abalone',
  'ing-squid',
  'ing-roe',
  'ing-orange',
  'ing-kiwi',
  'ing-beef',
  'ing-sesame',
  'ing-salmon',
  'ing-mackerel',
  'ing-soybean',
  'ing-chicken',
  'ing-banana',
  'ing-pistachio',
  'ing-pork',
  'ing-macadamia',
  'ing-peach',
  'ing-yam',
  'ing-apple',
  'ing-gelatin',
] as const;

const ALLERGEN_DISPLAY_RANK = new Map<string, number>(
  ALLERGEN_DISPLAY_ORDER.map((id, index) => [id, index]),
);

const ALLERGY_SEARCH_KEYWORDS: Record<string, string[]> = {
  'ing-wheat': ['小麦粉', '薄力粉', '中力粉', '強力粉', '全粒粉', 'パン粉', '麩', 'ルウ', 'wheat flour', 'flour', 'gluten', '밀가루'],
  'ing-peanut': ['ピーナッツ', 'peanuts'],
  'ing-milk': ['牛乳', '乳製品', 'チーズ', 'バター', 'ヨーグルト', 'dairy', 'cheese', 'butter', 'yogurt'],
  'ing-egg': ['鶏卵', '玉子'],
  'ing-soybean': ['豆腐', '厚揚げ', '醤油', 'ソイ', 'soy'],
  'ing-sesame': ['胡麻'],
  'ing-roe': ['魚卵', 'salmon caviar'],
  'ing-macadamia': ['マカデミアナッツ', 'macadamia'],
  'ing-pistachio': ['pistachios'],
};

const VEGAN_LEVEL_OPTIONS: SelectableOption[] = [
  { id: 'diet-vegan', label: '完全ヴィーガン', description: '肉・魚・卵・乳・はちみつを避ける', keywords: ['vegan', 'ビーガン', '動物性'] },
  { id: 'diet-lacto-vegetarian', label: 'ラクト・ベジタリアン', description: '肉・魚・卵を避け、乳製品は可', keywords: ['vegetarian', '乳製品'] },
  { id: 'diet-ovo-vegetarian', label: 'オボ・ベジタリアン', description: '肉・魚・乳を避け、卵は可', keywords: ['vegetarian', '卵'] },
  { id: 'diet-pescatarian', label: 'ペスカタリアン', description: '肉を避け、魚介類は可', keywords: ['魚', 'pescatarian'] },
];


const PREPARATION_RESTRICTION_OPTIONS: SelectableOption[] = [
  {
    id: 'prep-raw-ing-shrimp',
    label: '生・半生のえび（加熱済みは可）',
    description: '生えび・加熱不足のえびだけを避ける。加熱済みのえび料理は残します。',
    keywords: ['raw shrimp', 'undercooked shrimp', '生えび', '半生えび', 'エビ', '새우', '익힌 새우'],
  },
  {
    id: 'prep-raw-ing-crab',
    label: '生・半生のかに（加熱済みは可）',
    description: '生かに・加熱不足のかにだけを避ける。',
    keywords: ['raw crab', '生かに', '半生かに', 'カニ'],
  },
  {
    id: 'prep-raw-ing-squid',
    label: '生・半生のいか（加熱済みは可）',
    description: '刺身・加熱不足のいかだけを避ける。',
    keywords: ['raw squid', '刺身', '生いか', '半生いか', 'イカ', '오징어'],
  },
  {
    id: 'prep-raw-ing-abalone',
    label: '生・半生のあわび（加熱済みは可）',
    description: '生・半生のあわびだけを避ける。',
    keywords: ['raw abalone', '生あわび', '半生あわび', 'アワビ'],
  },
  {
    id: 'prep-raw-ing-salmon',
    label: '生・半生のさけ（加熱済みは可）',
    description: '刺身用サーモンなど、生・半生のさけだけを避ける。',
    keywords: ['raw salmon', 'sashimi salmon', '刺身', 'サーモン', '生鮭', '연어'],
  },
  {
    id: 'prep-raw-ing-mackerel',
    label: '生・半生のさば（加熱済みは可）',
    description: '生・半生のさばだけを避ける。',
    keywords: ['raw mackerel', 'sashimi', '刺身', '生さば', '鯖'],
  },
  {
    id: 'prep-raw-ing-roe',
    label: '生・半生のいくら',
    description: 'いくらなど、加熱しない魚卵を避ける。',
    keywords: ['salmon roe', 'raw roe', '魚卵', 'いくら'],
  },
  {
    id: 'prep-raw-fish',
    label: '生・半生の魚全般',
    description: '刺身用魚、セビーチェ、寿司ネタの魚をまとめて避ける。',
    keywords: ['raw fish', 'sashimi', 'ceviche', 'salmon', '刺身', '生魚'],
  },
  {
    id: 'prep-raw-shellfish',
    label: '生・半生の甲殻類・軟体類全般',
    description: '生えび、生かに、生牡蠣、いか、あわび等をまとめて避ける。',
    keywords: ['raw shrimp', 'raw shellfish', 'raw mollusk', '生えび', '生かに', '牡蠣', 'あわび', 'いか', '軟体類', '甲殻類'],
  },
  {
    id: 'prep-raw-seafood',
    label: '生・半生の魚介類すべて',
    description: '魚・甲殻類・軟体類を含む、生・半生の魚介全般を避ける。',
    keywords: ['raw seafood', 'undercooked seafood', '刺身', 'セビーチェ', '寿司', '생선회', '날것'],
  },
];

const RELIGIOUS_RESTRICTION_OPTIONS: SelectableOption[] = [
  { id: 'ing-pork', label: '豚肉・豚由来食品', description: 'ハラール / コーシャ等で避けたい食材', keywords: ['イスラム', 'ユダヤ', 'halal', 'kosher'] },
  { id: 'ing-beef', label: '牛肉・牛由来食品', description: 'ヒンドゥー等で避けたい食材', keywords: ['ヒンドゥー', 'hindu'] },
  { id: 'ing-shrimp', label: 'えび', description: '宗教・戒律上の魚介制限にも利用', keywords: ['甲殻類', 'kosher'] },
  { id: 'ing-crab', label: 'かに', description: '宗教・戒律上の魚介制限にも利用', keywords: ['甲殻類', 'kosher'] },
  { id: 'ing-gelatin', label: 'ゼラチン', description: '動物由来原料を避けたい場合に利用', keywords: ['動物性', 'halal', 'kosher'] },
];

const normalizeSearchText = (text: string) => text.toLowerCase().trim();

const matchesOption = (option: SelectableOption, query: string) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const target = [
    option.label,
    option.description,
    ...(option.keywords ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
  return target.includes(normalizedQuery);
};

export default function ProfileView({
  ingredientOptions,
  recipeOptions,
  initialUserName,
  initialRestrictedIngredients,
  initialRestrictedIngredientReasons,
  initialPreferredDishes,
  initialPreferredCuisines,
  onSaveProfile,
  onBackToRecipes,
}: ProfileViewProps) {
  const [userName, setUserName] = useState(initialUserName);
  const [selectedRestricted, setSelectedRestricted] = useState<string[]>(initialRestrictedIngredients);
  const [selectedRestrictionReasons, setSelectedRestrictionReasons] = useState<Record<string, RestrictionReason>>(
    initialRestrictedIngredientReasons,
  );
  const [selectedDishes, setSelectedDishes] = useState<string[]>(initialPreferredDishes);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(initialPreferredCuisines);
  const [allergyQuery, setAllergyQuery] = useState('');
  const [veganQuery, setVeganQuery] = useState('');
  const [religiousQuery, setReligiousQuery] = useState('');
  const [preparationQuery, setPreparationQuery] = useState('');
  const [dishQuery, setDishQuery] = useState('');
  const [cuisineQuery, setCuisineQuery] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const allergyOptions: SelectableOption[] = [...ingredientOptions]
    .sort((a, b) => {
      const aRank = ALLERGEN_DISPLAY_RANK.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bRank = ALLERGEN_DISPLAY_RANK.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;
      return a.name_ja.localeCompare(b.name_ja, 'ja');
    })
    .map(ingredient => ({
      id: ingredient.id,
      label: ingredient.name_ja,
      description: ingredient.category,
      keywords: [
        ingredient.name_en,
        ingredient.category,
        ...(ingredient.dietary_tags ?? []),
        ...(ALLERGY_SEARCH_KEYWORDS[ingredient.id] ?? []),
      ],
    }));
  const visibleAllergyOptions = allergyOptions.filter(option => matchesOption(option, allergyQuery));
  const visibleVeganOptions = VEGAN_LEVEL_OPTIONS.filter(option => matchesOption(option, veganQuery));
  const visibleReligiousOptions = RELIGIOUS_RESTRICTION_OPTIONS.filter(option => matchesOption(option, religiousQuery));
  const visiblePreparationOptions = PREPARATION_RESTRICTION_OPTIONS.filter(option => matchesOption(option, preparationQuery));
  const recipeDishOptions: SelectableOption[] = recipeOptions.map(recipe => ({
    id: recipe.id,
    label: recipe.title.split('(')[0].trim(),
    description: `${recipe.cuisine}料理 / ${recipe.tags.join('、')}`,
    keywords: [recipe.title, recipe.cuisine, ...recipe.tags],
  }));
  const visibleRecipeDishOptions = (dishQuery
    ? recipeDishOptions.filter(option => matchesOption(option, dishQuery))
    : recipeDishOptions
  );
  const visibleCuisineOptions = (cuisineQuery
    ? PREFERRED_CUISINES.filter(option => matchesOption(option, cuisineQuery))
    : PREFERRED_CUISINES
  );

  const getDefaultRestrictionReason = (id: string): RestrictionReason => {
    if (id.startsWith('diet-') || id.startsWith('prep-')) return 'dislike';
    return 'allergy';
  };

  const getRestrictionReason = (id: string) => selectedRestrictionReasons[id] ?? 'allergy';
  const getVisibleRestrictionReason = (id: string) => {
    const savedReason = getRestrictionReason(id);
    return selectedRestrictionReasons[id] ? savedReason : getDefaultRestrictionReason(id);
  };

  const isRestrictionSelectedForReason = (id: string, reason: RestrictionReason) =>
    selectedRestricted.includes(id) && getVisibleRestrictionReason(id) === reason;

  const toggleRestricted = (id: string, reason?: RestrictionReason) => {
    const nextReason = reason ?? 'allergy';

    setSelectedRestricted(prev => {
      const isSelected = prev.includes(id);
      if (isSelected) {
        const currentReason = selectedRestrictionReasons[id] ?? getDefaultRestrictionReason(id);
        if (currentReason !== nextReason) {
          setSelectedRestrictionReasons(current => ({
            ...current,
            [id]: nextReason,
          }));
          return prev;
        }

        setSelectedRestrictionReasons(current => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        return prev.filter(x => x !== id);
      }

      setSelectedRestrictionReasons(current => ({
        ...current,
        [id]: nextReason,
      }));
      return [...prev, id];
    });
  };

  const getSelectedOptions = (options: SelectableOption[], reason: RestrictionReason) => (
    options.filter(option => isRestrictionSelectedForReason(option.id, reason))
  );

  const renderSearchableRestrictionField = ({
    inputId,
    query,
    setQuery,
    options,
    selectedOptions,
    reason,
    placeholder,
    emptyText,
    chipClassName,
  }: {
    inputId: string;
    query: string;
    setQuery: (value: string) => void;
    options: SelectableOption[];
    selectedOptions: SelectableOption[];
    reason: RestrictionReason;
    placeholder: string;
    emptyText: string;
    chipClassName: string;
  }) => (
    <div className="searchable-select-block">
      <div className="profile-search-wrapper">
        <Search size={16} className="profile-search-icon" />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="profile-search-input"
        />
      </div>

      <div className="toggle-grid compact">
        {options.length > 0 ? options.map(option => {
          const active = isRestrictionSelectedForReason(option.id, reason);
          return (
            <button
              key={`${inputId}-${option.id}`}
              type="button"
              className={`toggle-chip restrict ${active ? 'active' : ''}`}
              onClick={() => toggleRestricted(option.id, reason)}
              aria-pressed={active}
            >
              <span className="chip-indicator"></span>
              <span className="chip-label">{option.label}</span>
            </button>
          );
        }) : (
          <p className="select-empty-text">{emptyText}</p>
        )}
      </div>

      {selectedOptions.length > 0 && (
        <div className="selected-tag-row" aria-label="現在選択中の項目">
          {selectedOptions.map(option => (
            <button
              key={`selected-${inputId}-${option.id}`}
              type="button"
              className={`selected-tag ${chipClassName}`}
              onClick={() => toggleRestricted(option.id, reason)}
              aria-label={`${option.label}を解除`}
            >
              <span>{option.label}</span>
              <X size={12} />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const toggleDish = (id: string) => {
    setSelectedDishes(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectedRecipeDishOptions = recipeDishOptions.filter(option => selectedDishes.includes(option.id));
  const selectedCuisineOptions = PREFERRED_CUISINES.filter(option => selectedCuisines.includes(option.id));

  const toggleCuisine = (id: string) => {
    setSelectedCuisines(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      userName,
      restrictedIngredients: selectedRestricted,
      restrictedIngredientReasons: Object.fromEntries(
        selectedRestricted.map((id) => [id, selectedRestrictionReasons[id] ?? 'allergy']),
      ) as Record<string, RestrictionReason>,
      preferredDishes: selectedDishes,
      preferredCuisines: selectedCuisines
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="profile-container">
      {/* 戻るボタンとヘッダー */}
      <div className="profile-header-actions">
        <button className="back-to-recipes-btn" onClick={onBackToRecipes}>
          <ArrowLeft size={16} />
          <span>レシピ一覧へ戻る</span>
        </button>
      </div>

      <div className="profile-card">
        <div className="profile-card-header">
          <div className="avatar-wrapper">
            <User size={32} className="avatar-icon" />
          </div>
          <div>
            <h2>プロフィール & 食の制限設定</h2>
            <p>アレルギー食材や料理の好みをいつでもここでカスタマイズできます。</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          
          {/* 保存完了トースト/アラート */}
          {saveSuccess && (
            <div className="save-success-alert">
              <Check size={16} />
              <span>設定を正常に更新しました！レシピ一覧に即座に適用されます。</span>
            </div>
          )}

          {/* ユーザー名入力 */}
          <div className="profile-form-group">
            <label className="profile-group-label" htmlFor="username-input">
              <User size={16} className="inline-icon" />
              <span>ユーザー名</span>
              <span className="required-marker" aria-label="必須">*</span>
              <span className="required-label">必須</span>
            </label>
            <input
              type="text"
              id="username-input"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="あなたの名前を入力..."
              className="profile-text-input"
              required
            />
          </div>

          <hr className="divider" />

          {/* 食べられない食材 */}
          <div className="profile-form-group">
            <label className="profile-group-label">
              <ShieldAlert size={16} className="inline-icon text-red" />
              <span>食べられない・アレルギーのある食材</span>
            </label>
            <p className="group-subdesc">食材そのものがNGなら「アレルギー要素」、生・半生だけNGなら「調理状態」を選んでください。例: 生えびだけNGなら「えび」ではなく「生・半生のえび（加熱済みは可）」を選択します。</p>

            <div className="restriction-field-stack">
              <div className="restriction-field-card">
                <span className="restriction-field-title">アレルギー要素（加熱済みも含めて避ける）</span>
                {renderSearchableRestrictionField({
                  inputId: 'allergy-search-input',
                  query: allergyQuery,
                  setQuery: setAllergyQuery,
                  options: visibleAllergyOptions,
                  selectedOptions: getSelectedOptions(allergyOptions, 'allergy'),
                  reason: 'allergy',
                  placeholder: '小麦粉、卵、えび、ピスタチオなどを検索...',
                  emptyText: '該当するアレルギー要素が見つかりません。',
                  chipClassName: 'danger',
                })}
              </div>

              <div className="restriction-field-card">
                <span className="restriction-field-title">ヴィーガンレベル</span>
                {renderSearchableRestrictionField({
                  inputId: 'vegan-level-search-input',
                  query: veganQuery,
                  setQuery: setVeganQuery,
                  options: visibleVeganOptions,
                  selectedOptions: getSelectedOptions(VEGAN_LEVEL_OPTIONS, 'dislike'),
                  reason: 'dislike',
                  placeholder: '完全ヴィーガン、ベジタリアンなどを検索...',
                  emptyText: '該当するヴィーガンレベルが見つかりません。',
                  chipClassName: 'green',
                })}
              </div>

              <div className="restriction-field-card">
                <span className="restriction-field-title">調理状態で避けたいもの（生・半生だけNG）</span>
                {renderSearchableRestrictionField({
                  inputId: 'preparation-restriction-search-input',
                  query: preparationQuery,
                  setQuery: setPreparationQuery,
                  options: visiblePreparationOptions,
                  selectedOptions: getSelectedOptions(PREPARATION_RESTRICTION_OPTIONS, 'dislike'),
                  reason: 'dislike',
                  placeholder: '生えび、生サーモン、刺身、セビーチェなどを検索...',
                  emptyText: '該当する調理条件が見つかりません。',
                  chipClassName: 'amber',
                })}
              </div>

              <div className="restriction-field-card">
                <span className="restriction-field-title">宗教上食べられない食品・食材</span>
                {renderSearchableRestrictionField({
                  inputId: 'religious-restriction-search-input',
                  query: religiousQuery,
                  setQuery: setReligiousQuery,
                  options: visibleReligiousOptions,
                  selectedOptions: getSelectedOptions(RELIGIOUS_RESTRICTION_OPTIONS, 'religious'),
                  reason: 'religious',
                  placeholder: '豚肉、牛肉、甲殻類などを検索...',
                  emptyText: '該当する宗教上の制限項目が見つかりません。',
                  chipClassName: 'amber',
                })}
              </div>
            </div>
          </div>

          <hr className="divider" />

          {/* 好みの料理 */}
          <div className="profile-form-group">
            <label className="profile-group-label">
              <Sparkles size={16} className="inline-icon text-gold" />
              <span>好みの料理タイプ・好みの料理</span>
            </label>
            <p className="group-subdesc">料理タイプは残しつつ、データ内にある具体的な料理も検索して追加できます。</p>
            <span className="restriction-field-title">好みの料理タイプ</span>
            <div className="toggle-grid">
              {PREFERRED_DISHES.map(dish => {
                const active = selectedDishes.includes(dish.id);
                return (
                  <button
                    key={dish.id}
                    type="button"
                    className={`toggle-chip dish ${active ? 'active' : ''}`}
                    onClick={() => toggleDish(dish.id)}
                    aria-pressed={active}
                  >
                    <span className="chip-indicator"></span>
                    <span className="chip-label">{dish.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="restriction-field-card dish-search-card">
              <span className="restriction-field-title">好みの料理</span>
              <div className="searchable-select-block">
                <div className="profile-search-wrapper">
                  <Search size={16} className="profile-search-icon" />
                  <input
                    id="preferred-dish-search-input"
                    type="search"
                    value={dishQuery}
                    onChange={(e) => setDishQuery(e.target.value)}
                    placeholder="ロビオ、タコス、国名、タグから検索..."
                    className="profile-search-input"
                  />
                </div>

                <div className="toggle-grid compact">
                  {visibleRecipeDishOptions.length > 0 ? visibleRecipeDishOptions.map(option => {
                    const active = selectedDishes.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`toggle-chip dish ${active ? 'active' : ''}`}
                        onClick={() => toggleDish(option.id)}
                        aria-pressed={active}
                      >
                        <span className="chip-indicator"></span>
                        <span className="chip-label">{option.label}</span>
                      </button>
                    );
                  }) : (
                    <p className="select-empty-text">該当する料理が見つかりません。</p>
                  )}
                </div>

                {selectedRecipeDishOptions.length > 0 && (
                  <div className="selected-tag-row" aria-label="現在選択中の好みの料理">
                    {selectedRecipeDishOptions.map(option => (
                      <button
                        key={`selected-dish-${option.id}`}
                        type="button"
                        className="selected-tag gold"
                        onClick={() => toggleDish(option.id)}
                        aria-label={`${option.label}を解除`}
                      >
                        <span>{option.label}</span>
                        <X size={12} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="divider" />

          {/* 好みの国・食文化 */}
          <div className="profile-form-group">
            <label className="profile-group-label">
              <Sparkles size={16} className="inline-icon text-green" />
              <span>好みの国・食文化</span>
            </label>
            <p className="group-subdesc">国や食文化を検索して選択できます。登録した地域のレシピが「あなたにおすすめ」で優先表示されます。</p>
            <div className="restriction-field-card cuisine-search-card">
              <div className="searchable-select-block">
                <div className="profile-search-wrapper">
                  <Search size={16} className="profile-search-icon" />
                  <input
                    id="preferred-cuisine-search-input"
                    type="search"
                    value={cuisineQuery}
                    onChange={(e) => setCuisineQuery(e.target.value)}
                    placeholder="国名、地域、食文化から検索..."
                    className="profile-search-input"
                  />
                </div>

                <div className="toggle-grid compact">
                  {visibleCuisineOptions.length > 0 ? visibleCuisineOptions.map(cuisine => {
                    const active = selectedCuisines.includes(cuisine.id);
                    return (
                      <button
                        key={cuisine.id}
                        type="button"
                        className={`toggle-chip cuisine ${active ? 'active' : ''}`}
                        onClick={() => toggleCuisine(cuisine.id)}
                        aria-pressed={active}
                      >
                        <span className="chip-indicator"></span>
                        <span className="chip-label">{cuisine.label}</span>
                      </button>
                    );
                  }) : (
                    <p className="select-empty-text">該当する国・食文化が見つかりません。</p>
                  )}
                </div>

                {selectedCuisineOptions.length > 0 && (
                  <div className="selected-tag-row" aria-label="現在選択中の好みの国・食文化">
                    {selectedCuisineOptions.map(cuisine => (
                      <button
                        key={`selected-cuisine-${cuisine.id}`}
                        type="button"
                        className="selected-tag green"
                        onClick={() => toggleCuisine(cuisine.id)}
                        aria-label={`${cuisine.label}を解除`}
                      >
                        <span>{cuisine.label}</span>
                        <X size={12} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 送信アクション */}
          <div className="profile-submit-row">
            <button type="submit" className="profile-save-btn" id="save-profile-btn">
              <Save size={18} />
              <span>設定を保存する</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
