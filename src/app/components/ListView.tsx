'use client';

import React, { useState, useMemo } from 'react';
import { Search, Compass, AlertTriangle, ShieldCheck, Clock, Eye, Sparkles } from 'lucide-react';
import { MOCK_RECIPES, Recipe } from '@/lib/mockData';

interface ListViewProps {
  restrictedIngredients: string[];
  preferredDishes: string[];
  preferredCuisines: string[];
  onSelectRecipe: (recipe: Recipe) => void;
  setCurrentView: (view: 'landing' | 'list' | 'profile') => void;
}

const CUISINE_MATCH_TERMS: Record<string, string[]> = {
  georgia: ['ジョージア', 'グルジア', 'georgia'],
  indonesia: ['インドネシア', 'indonesia'],
  india: ['インド', 'india'],
  mexico: ['メキシコ', 'mexico'],
  korea: ['韓国', 'korea'],
  china: ['中国', 'china'],
  thailand: ['タイ', 'thailand', 'thai'],
  vietnam: ['ベトナム', 'vietnam'],
  turkey: ['トルコ', 'turkey'],
  morocco: ['モロッコ', 'morocco'],
  lebanon: ['レバノン', 'lebanon'],
  italy: ['イタリア', 'italy'],
  france: ['フランス', 'france'],
  spain: ['スペイン', 'spain'],
  peru: ['ペルー', 'peru'],
  ethiopia: ['エチオピア', 'ethiopia'],
};

export default function ListView({
  restrictedIngredients,
  preferredDishes,
  preferredCuisines,
  onSelectRecipe,
  setCurrentView,
}: ListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // リアルタイム検索ロジック
  const filteredRecipes = useMemo(() => {
    return MOCK_RECIPES.filter(recipe => {
      const matchesQuery = 
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.ingredients.some(ing => ing.name_ja.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesQuery;
    });
  }, [searchQuery]);

  // レシピにアレルギー食材（ユーザーのNG材料）が含まれているかチェックするヘルパー
  const getAllergenWarnings = (recipe: Recipe) => {
    const matched = recipe.ingredients.filter(ing => 
      restrictedIngredients.includes(ing.id)
    );
    return matched.map(ing => ing.name_ja.split('（')[0].trim()); // 「卵 (半分カット)」などの表記から「卵」を抽出
  };

  // おすすめ優先度の判定（ユーザーの好みの国や料理タイプにマッチするか）
  const getRecommendationScore = React.useCallback((recipe: Recipe) => {
    let score = 0;

    // 好みの料理として直接選ばれたレシピは最優先
    if (preferredDishes.includes(recipe.id)) {
      score += 4;
    }
    
    // 好みの国にマッチ
    const cuisineKey = recipe.cuisine.toLowerCase();
    if (preferredCuisines.some(c => {
      const terms = CUISINE_MATCH_TERMS[c] ?? [c];
      return terms.some(term => cuisineKey.includes(term.toLowerCase()));
    })) {
      score += 2;
    }

    // 好みのカテゴリにマッチ
    if (preferredDishes.includes('soup') && recipe.tags.some(t => t.includes('シチュー') || t.includes('スープ'))) {
      score += 1;
    }
    if (preferredDishes.includes('noodle') && recipe.tags.some(t => t.includes('麺'))) {
      score += 1;
    }
    if (preferredDishes.includes('salad') && recipe.tags.some(t => t.includes('サラダ') || t.includes('前菜'))) {
      score += 1;
    }
    if (preferredDishes.includes('spicy') && recipe.tags.some(t => t.includes('辛'))) {
      score += 1;
    }
    
    return score;
  }, [preferredCuisines, preferredDishes]);

  // スコア順（おすすめ順）にレシピを並べ替え
  const sortedRecipes = useMemo(() => {
    return [...filteredRecipes].sort((a, b) => {
      return getRecommendationScore(b) - getRecommendationScore(a);
    });
  }, [filteredRecipes, getRecommendationScore]);

  // 上位3枚をおすすめ（Featured）とし、それ以外、または全体を通常一覧とする
  const featuredRecipes = useMemo(() => sortedRecipes.slice(0, 3), [sortedRecipes]);
  const otherRecipes = useMemo(() => sortedRecipes.slice(3), [sortedRecipes]);

  return (
    <div className="list-container">
      {/* 検索ヘッダーセクション */}
      <section className="search-filter-section" aria-label="レシピ検索">
        <div className="search-bar-wrapper">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="料理名、スパイス、材料などから世界のレシピを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            id="recipe-search-input"
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>×</button>
          )}
        </div>

        {/* ユーザープロフィールに基づくカスタマイズ状態の概要 */}
        {(restrictedIngredients.length > 0 || preferredCuisines.length > 0 || preferredDishes.length > 0) && (
          <div className="preference-summary-banner">
            <ShieldCheck size={16} className="text-green" />
            <span>
              プロフィール設定（食べられない食材: {restrictedIngredients.length}個、好み: {preferredCuisines.length + preferredDishes.length}個）に基づき、パーソナライズ表示中。
            </span>
            <button className="edit-pref-link-btn" onClick={() => setCurrentView('profile')}>
              変更する
            </button>
          </div>
        )}
      </section>

      {/* メインレシピ表示エリア */}
      {sortedRecipes.length === 0 ? (
        <div className="no-results-card">
          <Compass className="no-results-icon animate-bounce-slow" size={48} />
          <h3>条件に合うレシピが見つかりませんでした</h3>
          <p>検索ワードを変えて再検索してください。</p>
          <button className="reset-filters-btn" onClick={() => {
            setSearchQuery('');
          }}>
            検索をリセット
          </button>
        </div>
      ) : (
        <>
          {/* おすすめ料理 (Featured Section) - 上位3枚 */}
          {featuredRecipes.length > 0 && (
            <section className="recipes-featured-section" aria-labelledby="featured-section-title">
              <div className="section-title-wrapper">
                <Sparkles size={18} className="icon-gold" />
                <h2 id="featured-section-title">あなたにおすすめの海外レシピ</h2>
              </div>
              <div className="recipe-grid featured">
                {featuredRecipes.map((recipe) => {
                  const warnings = getAllergenWarnings(recipe);
                  const isRecommended = getRecommendationScore(recipe) > 0;
                  
                  return (
                    <article 
                      key={recipe.id} 
                      className={`recipe-card ${warnings.length > 0 ? 'has-allergen-warning' : ''} ${isRecommended ? 'recommended-highlight' : ''}`}
                      onClick={() => onSelectRecipe(recipe)}
                    >
                      {/* カード上部 */}
                      <div className="card-header">
                        <span className="food-name">{recipe.title.split('(')[0].trim()}</span>
                        <span className="flag-icon" title={recipe.cuisine}>{recipe.flag}</span>
                      </div>

                      {/* カード中央画像 */}
                      <div className="card-image-wrapper">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={recipe.image_url} 
                          alt={recipe.title}
                          className="recipe-photo"
                          loading="lazy"
                        />
                        <div className="card-overlay">
                          <span className="view-details-tag">
                            <Eye size={14} />
                            <span>レシピを見る</span>
                          </span>
                        </div>
                        
                        {isRecommended && (
                          <span className="recommendation-badge">
                            ✨ あなたの好みにマッチ
                          </span>
                        )}

                        <span className="cook-time-badge">
                          <Clock size={12} />
                          <span>{recipe.cook_time_min}分</span>
                        </span>
                      </div>

                      {/* カード説明 */}
                      <div className="card-body">
                        <p className="food-description">{recipe.description}</p>
                      </div>

                      {/* カードフッターと警告 */}
                      <div className="card-footer">
                        {warnings.length > 0 ? (
                          <div className="allergen-warning-alert">
                            <AlertTriangle size={14} />
                            <span>⚠️ {warnings.join(', ')} が含まれています</span>
                          </div>
                        ) : (
                          <div className="allergen-safe-badge">
                            <ShieldCheck size={14} />
                            <span>アレルギーチェック済</span>
                          </div>
                        )}

                        <div className="tags-container">
                          {recipe.tags.map((tag) => (
                            <span key={tag} className="recipe-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* 追加のレシピ (More Recipes Section) - 4枚目以降 */}
          {otherRecipes.length > 0 && (
            <section className="recipes-more-section" aria-labelledby="more-section-title">
              <h2 id="more-section-title" className="section-subtitle">こちらのレシピもチェック</h2>
              <div className="recipe-grid secondary">
                {otherRecipes.map((recipe) => {
                  const warnings = getAllergenWarnings(recipe);
                  return (
                    <article 
                      key={recipe.id} 
                      className={`recipe-card secondary ${warnings.length > 0 ? 'has-allergen-warning' : ''}`}
                      onClick={() => onSelectRecipe(recipe)}
                    >
                      <div className="card-header">
                        <span className="food-name">{recipe.title.split('(')[0].trim()}</span>
                        <span className="flag-icon">{recipe.flag}</span>
                      </div>
                      <div className="card-image-wrapper">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={recipe.image_url} 
                          alt={recipe.title} 
                          className="recipe-photo"
                          loading="lazy"
                        />
                        <div className="card-overlay">
                          <span className="view-details-tag">
                            <Eye size={14} />
                            <span>レシピを見る</span>
                          </span>
                        </div>
                        <span className="cook-time-badge">
                          <Clock size={12} />
                          <span>{recipe.cook_time_min}分</span>
                        </span>
                      </div>
                      <div className="card-body">
                        <p className="food-description">{recipe.description}</p>
                      </div>
                      <div className="card-footer">
                        {warnings.length > 0 && (
                          <div className="allergen-warning-alert">
                            <AlertTriangle size={14} />
                            <span>⚠️ {warnings.join(', ')} 含有</span>
                          </div>
                        )}
                        <div className="tags-container">
                          {recipe.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="recipe-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
