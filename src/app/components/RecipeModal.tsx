'use client';

import React, { useEffect, useState, type KeyboardEvent } from 'react';
import { X, Clock, Users, ShieldAlert, ChefHat, Sparkles } from 'lucide-react';
import { Recipe, type RecipeCultureSectionKey, type RecipeStep } from '@/lib/mockData';
import type { IngredientSubstitution } from '@/lib/apiTypes';
import {
  DIETARY_RESTRICTION_RULES,
  getDietaryConflictingIngredients,
  getSelectedDietaryRestrictionIds,
} from '@/lib/dietaryRestrictions';
import {
  PREPARATION_RESTRICTION_RULES,
  getPreparationConflictingIngredients,
  getSelectedPreparationRestrictionIds,
} from '@/lib/preparationRestrictions';

type ModalTabKey = 'basic' | RecipeCultureSectionKey;

type ModalTab = {
  key: ModalTabKey;
  label: string;
};

type RestrictionTag = {
  label: string;
  tone: 'safe' | 'caution' | 'danger' | 'neutral';
};

interface RecipeModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  restrictedIngredients: string[];
  onSubstituteRecipe: (recipeId: string) => Promise<void>;
  substituteStatus: 'idle' | 'loading' | 'success' | 'error';
  substituteError: string | null;
  substituteSuggestions: IngredientSubstitution[];
}

const MODAL_TABS: ModalTab[] = [
  { key: 'basic', label: 'レシピ' },
  { key: 'origin', label: '由来' },
  { key: 'food_culture', label: '食文化' },
];

const CULTURE_SECTION_FALLBACK: Record<RecipeCultureSectionKey, string> = {
  origin: 'この料理の由来記事は現在準備中です。',
  food_culture: 'この料理と食文化の読み物は現在準備中です。',
};

const TAB_PANEL_IDS: Record<ModalTabKey, string> = {
  basic: 'recipe-modal-tabpanel-basic',
  origin: 'recipe-modal-tabpanel-origin',
  food_culture: 'recipe-modal-tabpanel-food_culture',
};

const RELIGIOUS_RESTRICTION_LABELS: Record<string, string> = {
  'ing-pork': '宗教上注意: 豚肉',
  'ing-beef': '宗教上注意: 牛肉',
  'ing-shrimp': '宗教上注意: えび',
  'ing-crab': '宗教上注意: かに',
  'ing-gelatin': '宗教上注意: ゼラチン',
};

const ANIMAL_PRODUCT_DIETARY_TAG = 'animal-product';
const GLUTEN_DIETARY_TAG = 'gluten';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidBackedRecipeId(recipeId: string) {
  return UUID_PATTERN.test(recipeId);
}

const getIngredientListKey = (
  recipeId: string,
  ingredient: Recipe['ingredients'][number],
) => `${recipeId}:${ingredient.id}:${ingredient.name_ja}:${ingredient.quantity}`;

const getBaseIngredientName = (name: string) => name.replace(/\s*[（(][^）)]*[）)]\s*$/, '').trim();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function findSubstitutionForIngredient(
  ingredientName: string,
  substitutions: IngredientSubstitution[],
) {
  const baseName = getBaseIngredientName(ingredientName);
  return substitutions.find((item) =>
    item.originalIngredientName === ingredientName ||
    item.originalIngredientName === baseName ||
    getBaseIngredientName(item.originalIngredientName) === baseName,
  );
}

function renderSubstitutedStepText(text: string, substitutions: IngredientSubstitution[]) {
  const activeSubstitutions = substitutions.filter((item) => item.originalIngredientName && item.substituteIngredient.name_ja);
  if (activeSubstitutions.length === 0) return text;

  const pattern = activeSubstitutions
    .flatMap((item) => [item.originalIngredientName, getBaseIngredientName(item.originalIngredientName)])
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  if (!pattern) return text;

  const regex = new RegExp(`(${pattern})`, 'g');
  const chunks = text.split(regex).filter((chunk) => chunk.length > 0);

  return chunks.map((chunk, index) => {
    const substitution = findSubstitutionForIngredient(chunk, activeSubstitutions);
    if (!substitution) return <React.Fragment key={`${chunk}-${index}`}>{chunk}</React.Fragment>;
    return (
      <span className="substituted-step-highlight" key={`${chunk}-${index}`}>
        {substitution.substituteIngredient.name_ja}
        <span className="substituted-step-original">（元: {chunk}）</span>
      </span>
    );
  });
}

const getUniqueIngredientNames = (ingredients: Recipe['ingredients']) =>
  Array.from(new Set(ingredients.map(ing => getBaseIngredientName(ing.name_ja)).filter(Boolean)));

const normalizeRecipeStep = (step: RecipeStep, index: number) => {
  if (typeof step === 'string') {
    return { order: index + 1, text: step };
  }

  return {
    order: step.order ?? index + 1,
    text: step.text,
  };
};

const isCultureTab = (tab: ModalTabKey): tab is RecipeCultureSectionKey =>
  tab === 'origin' || tab === 'food_culture';

export default function RecipeModal({
  recipe,
  onClose,
  restrictedIngredients,
  onSubstituteRecipe,
  substituteStatus,
  substituteError,
  substituteSuggestions,
}: RecipeModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTabKey>('basic');

  useEffect(() => {
    if (!recipe) return;

    const scrollY = window.scrollY;
    const previousBodyStyle = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      left: document.body.style.left,
      right: document.body.style.right,
    };
    const previousDocumentElementOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.left = '0';
    document.body.style.right = '0';

    return () => {
      document.documentElement.style.overflow = previousDocumentElementOverflow;
      document.body.style.overflow = previousBodyStyle.overflow;
      document.body.style.position = previousBodyStyle.position;
      document.body.style.top = previousBodyStyle.top;
      document.body.style.width = previousBodyStyle.width;
      document.body.style.left = previousBodyStyle.left;
      document.body.style.right = previousBodyStyle.right;
      window.scrollTo(0, scrollY);
    };
  }, [recipe]);

  useEffect(() => {
    setActiveTab('basic');
  }, [recipe?.id]);

  if (!recipe) return null;

  const matchedAllergens = recipe.ingredients.filter(ing =>
    restrictedIngredients.includes(ing.id),
  );
  const matchedReligiousLabels = recipe.ingredients
    .filter(ing => restrictedIngredients.includes(ing.id) && RELIGIOUS_RESTRICTION_LABELS[ing.id])
    .map(ing => RELIGIOUS_RESTRICTION_LABELS[ing.id]);
  const selectedDietaryRestrictionIds = getSelectedDietaryRestrictionIds(restrictedIngredients);
  const selectedPreparationRestrictionIds = getSelectedPreparationRestrictionIds(restrictedIngredients);
  const animalProductNames = getUniqueIngredientNames(
    recipe.ingredients.filter(ing => ing.dietary_tags?.includes(ANIMAL_PRODUCT_DIETARY_TAG)),
  );
  const glutenIngredientNames = getUniqueIngredientNames(
    recipe.ingredients.filter(ing => ing.dietary_tags?.includes(GLUTEN_DIETARY_TAG)),
  );
  const dietaryRestrictionTags: RestrictionTag[] = selectedDietaryRestrictionIds.length > 0
    ? selectedDietaryRestrictionIds.map((restrictionId) => {
        const rule = DIETARY_RESTRICTION_RULES[restrictionId];
        const conflictNames = getUniqueIngredientNames(getDietaryConflictingIngredients(recipe, restrictionId));

        return conflictNames.length > 0
          ? { label: `${rule.conflictLabel}: ${conflictNames.join(', ')}`, tone: 'danger' }
          : { label: rule.compatibleLabel, tone: 'safe' };
      })
    : [
        animalProductNames.length > 0
          ? { label: `動物性含有: ${animalProductNames.join(', ')}`, tone: 'caution' }
          : recipe.is_vegan
            ? { label: '完全ヴィーガン対応', tone: 'safe' }
            : { label: '食事制限要確認', tone: 'caution' },
      ];
  const preparationRestrictionTags: RestrictionTag[] = selectedPreparationRestrictionIds.map((restrictionId) => {
    const rule = PREPARATION_RESTRICTION_RULES[restrictionId];
    const conflictNames = getUniqueIngredientNames(getPreparationConflictingIngredients(recipe, restrictionId));

    return conflictNames.length > 0
      ? { label: `${rule.conflictLabel}: ${conflictNames.join(', ')}`, tone: 'danger' }
      : { label: rule.compatibleLabel, tone: 'safe' };
  });
  const preparationConflictNames = new Set(
    selectedPreparationRestrictionIds.flatMap((restrictionId) =>
      getPreparationConflictingIngredients(recipe, restrictionId).map((ing) => getBaseIngredientName(ing.name_ja)),
    ),
  );
  const glutenRestrictionTag: RestrictionTag = glutenIngredientNames.length > 0
    ? { label: `グルテン含有: ${glutenIngredientNames.join(', ')}`, tone: 'danger' }
    : recipe.is_gluten_free
      ? { label: 'グルテンフリー対応', tone: 'safe' }
      : { label: 'グルテン要確認', tone: 'caution' };
  const recipeRestrictionTags: RestrictionTag[] = [
    ...dietaryRestrictionTags,
    glutenRestrictionTag,
    ...preparationRestrictionTags,
    ...matchedAllergens.map(ing => ({ label: `含有: ${getBaseIngredientName(ing.name_ja)}`, tone: 'danger' as const })),
    ...matchedReligiousLabels.map(label => ({ label, tone: 'caution' as const })),
  ];
  const culturalBackground = recipe.cultural_background?.trim();
  const hasActiveSubstitutions = substituteStatus === 'success' && substituteSuggestions.length > 0;
  const canSubstituteRecipe = isUuidBackedRecipeId(recipe.id);
  const isSubstituteLoading = substituteStatus === 'loading';
  const primaryRecipeTag = recipe.tags[0] ?? '未分類';

  const handleSubstituteClick = async () => {
    if (!canSubstituteRecipe || isSubstituteLoading) return;
    await onSubstituteRecipe(recipe.id);
  };

  const focusTab = (tab: ModalTabKey) => {
    requestAnimationFrame(() => {
      document.getElementById(`recipe-modal-tab-${tab}`)?.focus();
    });
  };

  const handleTabClick = (tab: ModalTabKey) => {
    setActiveTab(tab);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentTab: ModalTabKey) => {
    const currentIndex = MODAL_TABS.findIndex(tab => tab.key === currentTab);
    const lastIndex = MODAL_TABS.length - 1;
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = lastIndex;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = MODAL_TABS[nextIndex].key;
    setActiveTab(nextTab);
    focusTab(nextTab);
  };

  const getCultureSection = (tab: RecipeCultureSectionKey) =>
    recipe.culture_sections.find(
      section => section.key === tab && (section.key === 'origin' || section.key === 'food_culture'),
    );
  const activeCultureSection = isCultureTab(activeTab) ? getCultureSection(activeTab) : undefined;
  const activeCultureFallback = isCultureTab(activeTab) ? CULTURE_SECTION_FALLBACK[activeTab] : '';
  const activePanelId = TAB_PANEL_IDS[activeTab];

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-hero-image-wrapper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="modal-hero-photo"
          />
          <div className="modal-hero-overlay"></div>

          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="閉じる"
            id="close-recipe-modal-btn"
          >
            <X size={20} />
          </button>

          <div className="modal-hero-title-box">
            <div className="modal-cuisine-badge">
              <span>{recipe.flag} {recipe.cuisine}料理</span>
            </div>
            <h1 id="modal-title" className="modal-recipe-title">{recipe.title}</h1>
          </div>
        </div>

        <div className="modal-body-with-tabs">
          <div
            id={activePanelId}
            className={`modal-content modal-tab-panel modal-tab-panel--${activeTab}`}
            role="tabpanel"
            aria-labelledby={`recipe-modal-tab-${activeTab}`}
          >
            {activeTab === 'basic' ? (
              <>
                {matchedAllergens.length > 0 && (
                  <div className="modal-danger-alert">
                    <ShieldAlert size={20} className="alert-icon animate-bounce-slow" />
                    <div>
                      <strong>⚠️ アレルギー警告</strong>
                      <p>
                        このレシピには、あなたが食べられない設定にしている食材「
                        <span className="bold-allergen">{matchedAllergens.map(a => a.name_ja.split('（')[0]).join(', ')}</span>
                        」が含まれています。調理・召し上がる際は十分にご注意ください。
                      </p>
                    </div>
                  </div>
                )}

                <div className="modal-meta-row">
                  <div className="meta-item">
                    <Clock size={16} />
                    <span>調理時間: <strong>{recipe.cook_time_min}分</strong></span>
                  </div>
                  <div className="meta-item">
                    <Users size={16} />
                    <span>分量: <strong>{recipe.servings}人前</strong></span>
                  </div>
                  <div className="meta-item">
                    <ChefHat size={16} />
                    <span>カテゴリ: <strong>{primaryRecipeTag}</strong></span>
                  </div>
                </div>

                <div className="modal-restriction-tags" aria-label="この料理の制限・アレルギー情報">
                  <span className="restriction-tags-title">制限・アレルギー情報</span>
                  <div className="restriction-tags-list">
                    {recipeRestrictionTags.map((tag, index) => (
                      <span key={`${tag.label}-${index}`} className={`modal-restriction-tag ${tag.tone}`}>
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="modal-recipe-desc">{recipe.description}</p>

                {culturalBackground && (
                  <section className="modal-cultural-background" aria-labelledby="modal-cultural-background-title">
                    <p className="modal-cultural-eyebrow">文化的背景</p>
                    <h2 id="modal-cultural-background-title">この料理の背景</h2>
                    <p>{culturalBackground}</p>
                  </section>
                )}

                <section className="modal-section" aria-labelledby="section-ingredients-title">
                  <div className="section-header">
                    <div className="section-dot green"></div>
                    <h2 id="section-ingredients-title">材料リスト (Ingredients)</h2>
                  </div>

                  <ul className="modal-ingredient-list">
                    {recipe.ingredients.map((ing) => {
                      const isAllergen = restrictedIngredients.includes(ing.id);
                      const substitution = findSubstitutionForIngredient(ing.name_ja, substituteSuggestions);
                      const hasPreparationConflict = preparationConflictNames.has(getBaseIngredientName(ing.name_ja));
                      return (
                        <li
                          key={getIngredientListKey(recipe.id, ing)}
                          className={`ingredient-item ${isAllergen || hasPreparationConflict ? 'has-allergy' : ''} ${substitution ? 'is-substituted' : ''}`}
                        >
                          <div className="ingredient-left">
                            <span className="bullet">•</span>
                            {substitution ? (
                              <span className="ingredient-name substituted-ingredient-name">
                                <span className="substituted-original">{ing.name_ja}</span>
                                <span className="substituted-arrow">→</span>
                                <span className="substituted-replacement">{substitution.substituteIngredient.name_ja}</span>
                              </span>
                            ) : (
                              <span className="ingredient-name">{ing.name_ja}</span>
                            )}

                            {isAllergen && (
                              <span className="allergen-badge-tag">NG食材</span>
                            )}
                            {hasPreparationConflict && !isAllergen && (
                              <span className="allergen-badge-tag">調理状態NG</span>
                            )}
                            {substitution && (
                              <span className="substitution-badge-tag">代替表示中</span>
                            )}
                          </div>
                          <span className="ingredient-qty">{ing.quantity}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section className="modal-section" aria-labelledby="section-steps-title">
                  <div className="section-header">
                    <div className="section-dot orange"></div>
                    <h2 id="section-steps-title">作り方・手順 (Instructions)</h2>
                  </div>
                  <ol className="modal-steps-list">
                    {recipe.steps.map((step, index) => {
                      const normalizedStep = normalizeRecipeStep(step, index);
                      return (
                        <li key={`${recipe.id}-step-${normalizedStep.order}`} className="step-item">
                          <div className="step-number-bubble">{normalizedStep.order}</div>
                          <div className="step-text-content">
                            <p>{hasActiveSubstitutions ? renderSubstitutedStepText(normalizedStep.text, substituteSuggestions) : normalizedStep.text}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              </>
            ) : (
              <article className="modal-culture-article" aria-live="polite">
                <span className="modal-culture-kicker">
                  {activeCultureSection?.label ?? MODAL_TABS.find(tab => tab.key === activeTab)?.label}
                </span>
                <h2>{activeCultureSection?.title ?? '準備中'}</h2>
                {(activeCultureSection?.body ?? activeCultureFallback)
                  .split(/\n+/)
                  .map((paragraph, index) => (
                    <p key={`${activeTab}-culture-paragraph-${index}`}>{paragraph}</p>
                  ))}
              </article>
            )}
          </div>

          {MODAL_TABS.filter(tab => tab.key !== activeTab).map(tab => (
            <div
              key={`inactive-panel-${tab.key}`}
              id={TAB_PANEL_IDS[tab.key]}
              className="modal-tab-panel-placeholder"
              role="tabpanel"
              aria-labelledby={`recipe-modal-tab-${tab.key}`}
              aria-hidden="true"
              hidden={activeTab !== tab.key}
            />
          ))}

          <div className="modal-bookmark-tabs" role="tablist" aria-label="レシピ詳細セクションタブ">
            {MODAL_TABS.map((tab) => {
              const selected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  id={`recipe-modal-tab-${tab.key}`}
                  type="button"
                  className={`modal-bookmark-tab ${selected ? 'active' : ''}`}
                  role="tab"
                  aria-selected={selected}
                  aria-controls={TAB_PANEL_IDS[tab.key]}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => handleTabClick(tab.key)}
                  onKeyDown={(event) => handleTabKeyDown(event, tab.key)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          {canSubstituteRecipe && (
            <div className="modal-substitute-area">
              <button
                type="button"
                className="modal-substitute-btn"
                onClick={handleSubstituteClick}
                disabled={isSubstituteLoading}
              >
                <Sparkles size={16} />
                <span>{isSubstituteLoading ? '再提案中...' : '日本の食材で再提案'}</span>
              </button>
              {substituteStatus === 'success' && (
                <div className="modal-substitute-success" role="status">
                  {substituteSuggestions.length > 0 ? (
                    <>
                      <p>日本のスーパーで見つけやすい代替候補です。</p>
                      <ul className="modal-substitute-list">
                        {substituteSuggestions.map((item) => (
                          <li key={`${item.originalIngredientName}:${item.substituteIngredient.id}`}>
                            <strong>{item.originalIngredientName}</strong>
                            {item.originalQuantity && <span>（{item.originalQuantity}）</span>}
                            <span> → {item.substituteIngredient.name_ja}</span>
                            <small>{item.reason}{item.usageNote ? ` / ${item.usageNote}` : ''}</small>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p>置き換えが必要そうな材料は見つかりませんでした。</p>
                  )}
                </div>
              )}
              {substituteStatus === 'error' && substituteError && (
                <p className="modal-substitute-error" role="alert">{substituteError}</p>
              )}
            </div>
          )}
          <button className="modal-close-bottom-btn" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
