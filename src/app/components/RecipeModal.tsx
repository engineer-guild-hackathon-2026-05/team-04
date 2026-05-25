'use client';

import React, { useEffect } from 'react';
import { X, Clock, Users, ShieldAlert, ChefHat } from 'lucide-react';
import { Recipe } from '@/lib/mockData';

interface RecipeModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  restrictedIngredients: string[];
}

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

export default function RecipeModal({
  recipe,
  onClose,
  restrictedIngredients,
}: RecipeModalProps) {
  // モーダル表示時に背後のスクロールをロック
  useEffect(() => {
    if (recipe) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [recipe]);

  if (!recipe) return null;

  // アレルギー食材チェック
  const matchedAllergens = recipe.ingredients.filter(ing => 
    restrictedIngredients.includes(ing.id)
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
        {/* ヘッダー画像とグラデーション */}
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

        {/* スクロール可能なコンテンツ領域 */}
        <div className="modal-content">
          
          {/* アレルギー警告（該当する場合のみ） */}
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

          {/* クイックメタ情報 */}
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

          {/* 1. 材料リスト (箇条書き) */}
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

          {/* 2. レシピ手順 (番号付きリスト) */}
          <section className="modal-section" aria-labelledby="section-steps-title">
            <div className="section-header">
              <div className="section-dot orange"></div>
              <h2 id="section-steps-title">作り方・手順 (Instructions)</h2>
            </div>
            <ol className="modal-steps-list">
              {recipe.steps.map((step, index) => (
                <li key={index} className="step-item">
                  <div className="step-number-bubble">{index + 1}</div>
                  <div className="step-text-content">
                    <p>{step}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

        </div>

        {/* フッター */}
        <div className="modal-footer">
          <button className="modal-close-bottom-btn" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
