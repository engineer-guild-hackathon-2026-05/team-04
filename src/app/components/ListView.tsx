'use client';

import React, { useState, useMemo } from 'react';
import { Search, Compass, ShieldCheck, Clock, Eye, Sparkles, MessageCircle, Send } from 'lucide-react';
import { Recipe } from '@/lib/mockData';
import { violatesDietaryRestrictions } from '@/lib/dietaryRestrictions';
import { violatesPreparationRestrictions } from '@/lib/preparationRestrictions';

interface ListViewProps {
  recipes: Recipe[];
  restrictedIngredients: string[];
  preferredDishes: string[];
  preferredCuisines: string[];
  onSelectRecipe: (recipe: Recipe) => void;
  setCurrentView: (view: 'landing' | 'list' | 'profile') => void;
  onSuggestRecipes: (mood: string) => Promise<void>;
  suggestStatus: 'idle' | 'loading' | 'success' | 'error';
  suggestError: string | null;
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

function isCuisinePreferenceMatch(preferredCuisine: string, recipeCuisine: string) {
  const cuisineKey = recipeCuisine.toLowerCase();
  const terms = CUISINE_MATCH_TERMS[preferredCuisine] ?? [preferredCuisine];
  return terms.some((term) => cuisineKey === term.toLowerCase());
}

export default function ListView({
  recipes,
  restrictedIngredients,
  preferredDishes,
  preferredCuisines,
  onSelectRecipe,
  setCurrentView,
  onSuggestRecipes,
  suggestStatus,
  suggestError,
}: ListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMoodChatOpen, setIsMoodChatOpen] = useState(false);
  const [moodInput, setMoodInput] = useState('');

  // リアルタイム検索ロジック（ユーザーが食べられない食材を含むレシピは推薦前に除外）
  const filteredRecipes = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase();

    return recipes.filter((recipe) => {
      const matchesQuery =
        recipe.title.toLowerCase().includes(normalizedQuery) ||
        recipe.description.toLowerCase().includes(normalizedQuery) ||
        recipe.cuisine.toLowerCase().includes(normalizedQuery) ||
        recipe.ingredients.some((ingredient) =>
          ingredient.name_ja.toLowerCase().includes(normalizedQuery),
        );

      const containsRestrictedIngredient = recipe.ingredients.some((ingredient) =>
        restrictedIngredients.includes(ingredient.id),
      );
      const violatesSelectedDiet = violatesDietaryRestrictions(recipe, restrictedIngredients);
      const violatesSelectedPreparation = violatesPreparationRestrictions(recipe, restrictedIngredients);

      return matchesQuery && !containsRestrictedIngredient && !violatesSelectedDiet && !violatesSelectedPreparation;
    });
  }, [recipes, searchQuery, restrictedIngredients]);

  const handleRecipeCardKeyDown = (event: React.KeyboardEvent<HTMLElement>, recipe: Recipe) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectRecipe(recipe);
    }
  };

  // おすすめ優先度の判定（ユーザーの好みの国や料理タイプにマッチするか）
  const getRecommendationScore = React.useCallback((recipe: Recipe) => {
    let score = 0;

    // 好みの料理として直接選ばれたレシピは最優先
    if (preferredDishes.includes(recipe.id)) {
      score += 4;
    }
    
    // 好みの国にマッチ（インドとインドネシアなどの部分一致を避ける）
    if (preferredCuisines.some((cuisine) => isCuisinePreferenceMatch(cuisine, recipe.cuisine))) {
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

  const handleMoodSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const mood = moodInput.trim();
    if (!mood || suggestStatus === 'loading') return;

    await onSuggestRecipes(mood);
  };

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
            <button
              type="button"
              className="clear-search-btn"
              aria-label="検索をクリア"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
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
                  const isRecommended = getRecommendationScore(recipe) > 0;
                  
                  return (
                    <article 
                      key={recipe.id} 
                      className={`recipe-card ${isRecommended ? 'recommended-highlight' : ''}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${recipe.title}のレシピ詳細を開く`}
                      onClick={() => onSelectRecipe(recipe)}
                      onKeyDown={(event) => handleRecipeCardKeyDown(event, recipe)}
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

                      {/* カードフッター */}
                      <div className="card-footer">
                        <div className="allergen-safe-badge">
                          <ShieldCheck size={14} />
                          <span>設定条件で確認済</span>
                        </div>

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
                {otherRecipes.map((recipe) => (
                    <article 
                      key={recipe.id} 
                      className="recipe-card secondary"
                      role="button"
                      tabIndex={0}
                      aria-label={`${recipe.title}のレシピ詳細を開く`}
                      onClick={() => onSelectRecipe(recipe)}
                      onKeyDown={(event) => handleRecipeCardKeyDown(event, recipe)}
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
                        <div className="tags-container">
                          {recipe.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="recipe-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
            </section>
          )}
        </>
      )}


      <aside className={`mood-chat-widget ${isMoodChatOpen ? 'expanded' : ''}`} aria-label="気分からAIレシピを提案">
        {!isMoodChatOpen ? (
          <button
            type="button"
            className="mood-chat-toggle"
            aria-expanded="false"
            aria-controls="mood-chat-panel"
            onClick={() => setIsMoodChatOpen(true)}
          >
            <MessageCircle size={20} />
            <span>今の気分で提案</span>
          </button>
        ) : (
          <div className="mood-chat-panel" id="mood-chat-panel">
            <div className="mood-chat-header">
              <div>
                <p className="mood-chat-eyebrow">AIレシピ相談</p>
                <h3>今の気分を教えてください</h3>
              </div>
              <button
                type="button"
                className="mood-chat-collapse"
                aria-label="気分入力を閉じる"
                onClick={() => setIsMoodChatOpen(false)}
              >
                ×
              </button>
            </div>

            <form className="mood-chat-form" onSubmit={handleMoodSubmit}>
              <label htmlFor="mood-chat-input">
                例: 雨の日に温まる、辛さ控えめ、野菜たっぷり
              </label>
              <div className="mood-chat-input-row">
                <input
                  id="mood-chat-input"
                  type="text"
                  value={moodInput}
                  onChange={(event) => setMoodInput(event.target.value)}
                  placeholder="食べたい雰囲気を入力"
                  disabled={suggestStatus === 'loading'}
                />
                <button
                  type="submit"
                  className="mood-chat-submit"
                  disabled={!moodInput.trim() || suggestStatus === 'loading'}
                >
                  {suggestStatus === 'loading' ? '提案中...' : (
                    <>
                      <Send size={15} />
                      <span>送信</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <p className="mood-chat-helper" role="status" aria-live="polite">
              {suggestStatus === 'loading' && 'あなたの制限食材を避けてレシピを考えています。'}
              {suggestStatus === 'success' && '新しいAIレシピを一覧に追加しました。'}
              {suggestStatus === 'idle' && 'プロフィールの食材制限を反映して、日本語で提案します。'}
            </p>
            {suggestStatus === 'error' && suggestError && (
              <p className="mood-chat-error" role="alert">{suggestError}</p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
