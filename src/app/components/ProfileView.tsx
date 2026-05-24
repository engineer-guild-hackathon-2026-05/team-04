'use client';

import React, { useState } from 'react';
import { User, ShieldAlert, Sparkles, Save, ArrowLeft, Check } from 'lucide-react';
import { INGREDIENT_MASTER } from '@/lib/mockData';

interface ProfileViewProps {
  initialUserName: string;
  initialRestrictedIngredients: string[];
  initialPreferredDishes: string[];
  initialPreferredCuisines: string[];
  onSaveProfile: (profile: {
    userName: string;
    restrictedIngredients: string[];
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
const PREFERRED_CUISINES = [
  { id: 'georgia', label: '🇬🇪 ジョージア' },
  { id: 'indonesia', label: '🇮🇩 インドネシア' },
  { id: 'india', label: '🇮🇳 インド' },
  { id: 'mexico', label: '🇲🇽 メキシコ' },
  { id: 'korea', label: '🇰🇷 韓国' },
  { id: 'china', label: '🇨🇳 中国' }
];

export default function ProfileView({
  initialUserName,
  initialRestrictedIngredients,
  initialPreferredDishes,
  initialPreferredCuisines,
  onSaveProfile,
  onBackToRecipes,
}: ProfileViewProps) {
  const [userName, setUserName] = useState(initialUserName);
  const [selectedRestricted, setSelectedRestricted] = useState<string[]>(initialRestrictedIngredients);
  const [selectedDishes, setSelectedDishes] = useState<string[]>(initialPreferredDishes);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(initialPreferredCuisines);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 食べられない食材はマスタデータからテスト用に主要なものを抜粋
  const demoIngredients = INGREDIENT_MASTER.filter(ing => 
    ['ing-wheat', 'ing-egg', 'ing-milk', 'ing-peanut', 'ing-shrimp', 'ing-pork', 'ing-beef'].includes(ing.id)
  );

  const toggleRestricted = (id: string) => {
    setSelectedRestricted(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleDish = (id: string) => {
    setSelectedDishes(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

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
            <p className="group-subdesc">トグルがONの食材を含むレシピには、警告が表示されます。</p>
            <div className="toggle-grid">
              {demoIngredients.map(ing => {
                const active = selectedRestricted.includes(ing.id);
                return (
                  <button
                    key={ing.id}
                    type="button"
                    className={`toggle-chip restrict ${active ? 'active' : ''}`}
                    onClick={() => toggleRestricted(ing.id)}
                    aria-pressed={active}
                  >
                    <span className="chip-indicator"></span>
                    <span className="chip-label">{ing.name_ja}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="divider" />

          {/* 好みの料理 */}
          <div className="profile-form-group">
            <label className="profile-group-label">
              <Sparkles size={16} className="inline-icon text-gold" />
              <span>好みの料理タイプ</span>
            </label>
            <p className="group-subdesc">好きな料理カテゴリにマッチしたレシピが「あなたにおすすめ」として優先表示されます。</p>
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
          </div>

          <hr className="divider" />

          {/* 好みの国・食文化 */}
          <div className="profile-form-group">
            <label className="profile-group-label">
              <Sparkles size={16} className="inline-icon text-green" />
              <span>好みの国・食文化</span>
            </label>
            <p className="group-subdesc">登録した国々のレシピが「あなたにおすすめ」の最上位に優先して並びます。</p>
            <div className="toggle-grid">
              {PREFERRED_CUISINES.map(cuisine => {
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
              })}
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
