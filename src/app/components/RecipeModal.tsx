'use client';

import React, { useEffect } from 'react';
import { X, Clock, Users, ShieldAlert, Sparkles, ChefHat, Info } from 'lucide-react';
import { Recipe } from '@/lib/mockData';

interface RecipeModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  restrictedIngredients: string[];
}

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

          <p className="modal-recipe-desc">{recipe.description}</p>

          {/* 1. 材料リスト (箇条書き) */}
          <section className="modal-section" aria-labelledby="section-ingredients-title">
            <div className="section-header">
              <div className="section-dot green"></div>
              <h2 id="section-ingredients-title">材料リスト (Ingredients)</h2>
            </div>

            {/* 日本のスーパー代替に関するアドバイスバナー */}
            {recipe.ingredients.some(ing => ing.is_replacement) && (
              <div className="replacement-tips-banner">
                <Info size={16} className="text-orange" />
                <span>
                  💡 <strong>日本のスーパー再現対応:</strong> オレンジ色のバッジが付いている材料は、日本で入手しやすい代替食材に置き換えています！
                </span>
              </div>
            )}

            <ul className="modal-ingredient-list">
              {recipe.ingredients.map((ing, index) => {
                const isAllergen = restrictedIngredients.includes(ing.id);
                return (
                  <li 
                    key={index} 
                    className={`ingredient-item ${ing.is_replacement ? 'replacement' : ''} ${isAllergen ? 'has-allergy' : ''}`}
                  >
                    <div className="ingredient-left">
                      <span className="bullet">•</span>
                      <span className="ingredient-name">{ing.name_ja}</span>
                      
                      {ing.is_replacement && (
                        <span className="replacement-badge" title={`本来の食材: ${ing.original_name}`}>
                          <Sparkles size={10} />
                          <span>代用 ({ing.original_name})</span>
                        </span>
                      )}
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
