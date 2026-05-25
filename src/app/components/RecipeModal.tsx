'use client';

import React, { useEffect, useState, type KeyboardEvent } from 'react';
import { X, Clock, Users, ShieldAlert, ChefHat } from 'lucide-react';
import { Recipe, type RecipeCultureSectionKey, type RecipeStep } from '@/lib/mockData';

type ModalTabKey = 'basic' | RecipeCultureSectionKey;

type ModalTab = {
  key: ModalTabKey;
  label: string;
};

interface RecipeModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  restrictedIngredients: string[];
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

const DIET_RESTRICTION_LABELS: Record<string, string> = {
  'diet-vegan': '完全ヴィーガン希望',
  'diet-lacto-vegetarian': 'ラクト・ベジタリアン希望',
  'diet-ovo-vegetarian': 'オボ・ベジタリアン希望',
  'diet-pescatarian': 'ペスカタリアン希望',
};

const RELIGIOUS_RESTRICTION_LABELS: Record<string, string> = {
  'ing-pork': '宗教上注意: 豚肉',
  'ing-beef': '宗教上注意: 牛肉',
  'ing-shrimp': '宗教上注意: えび',
  'ing-crab': '宗教上注意: かに',
  'ing-gelatin': '宗教上注意: ゼラチン',
};

const getIngredientListKey = (
  recipeId: string,
  ingredient: Recipe['ingredients'][number],
) => `${recipeId}:${ingredient.id}:${ingredient.name_ja}:${ingredient.quantity}`;

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
  const selectedDietLabels = restrictedIngredients
    .filter(id => DIET_RESTRICTION_LABELS[id])
    .map(id => DIET_RESTRICTION_LABELS[id]);
  const matchedReligiousLabels = recipe.ingredients
    .filter(ing => restrictedIngredients.includes(ing.id) && RELIGIOUS_RESTRICTION_LABELS[ing.id])
    .map(ing => RELIGIOUS_RESTRICTION_LABELS[ing.id]);
  const recipeRestrictionTags = [
    recipe.is_vegan ? { label: 'ヴィーガン対応', tone: 'safe' } : { label: 'ヴィーガン要確認', tone: 'caution' },
    recipe.is_gluten_free ? { label: 'グルテンフリー対応', tone: 'safe' } : { label: 'グルテン要確認', tone: 'caution' },
    ...matchedAllergens.map(ing => ({ label: `含有: ${ing.name_ja.split('（')[0].trim()}`, tone: 'danger' })),
    ...matchedReligiousLabels.map(label => ({ label, tone: 'caution' })),
    ...selectedDietLabels.map(label => ({ label, tone: 'neutral' })),
  ];

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
                    <span>カテゴリ: <strong>{recipe.tags[0]}</strong></span>
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

                <section className="modal-section" aria-labelledby="section-ingredients-title">
                  <div className="section-header">
                    <div className="section-dot green"></div>
                    <h2 id="section-ingredients-title">材料リスト (Ingredients)</h2>
                  </div>

                  <ul className="modal-ingredient-list">
                    {recipe.ingredients.map((ing) => {
                      const isAllergen = restrictedIngredients.includes(ing.id);
                      return (
                        <li
                          key={getIngredientListKey(recipe.id, ing)}
                          className={`ingredient-item ${isAllergen ? 'has-allergy' : ''}`}
                        >
                          <div className="ingredient-left">
                            <span className="bullet">•</span>
                            <span className="ingredient-name">{ing.name_ja}</span>

                            {isAllergen && (
                              <span className="allergen-badge-tag">NG食材</span>
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
                            <p>{normalizedStep.text}</p>
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
              className={`modal-content modal-tab-panel modal-tab-panel--${tab.key}`}
              role="tabpanel"
              aria-labelledby={`recipe-modal-tab-${tab.key}`}
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
          <button className="modal-close-bottom-btn" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
