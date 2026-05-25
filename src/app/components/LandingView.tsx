'use client';

import React from 'react';
import { Clock, Globe } from 'lucide-react';
import { type Recipe } from '@/lib/mockData';

interface LandingViewProps {
  onSignIn: () => void;
  previewRecipes?: Recipe[];
}

export default function LandingView({ onSignIn, previewRecipes = [] }: LandingViewProps) {
  return (
    <div className="landing-container">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="hero-badge">
          <Globe size={14} className="badge-icon" />
          <span>世界の料理が、あなたのテーブルへ</span>
        </div>
        <h1 id="hero-title" className="hero-title-main">
          新しい世界、<span className="text-gradient">いただきます。</span>
        </h1>
        <p className="hero-subtitle">
          「食べられないものがあるから」と、諦めてきた料理がある。<br />
          GlobalBites は食の制限を起点に、<strong>まだ知らない世界の味</strong>へ案内します。<br />
          あなたの「食べられる」が、旅の始まりです。
        </p>
      </section>

      {previewRecipes.length > 0 && (
        <section className="landing-preview-section" aria-label="レシピプレビュー">
          <p className="landing-preview-label">こんな料理が見つかります</p>
          <div className="landing-preview-grid">
            {previewRecipes.slice(0, 3).map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                className="landing-preview-card"
                onClick={onSignIn}
                aria-label={`${recipe.title} — ログインして詳細を見る`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={recipe.image_url} alt={recipe.title} className="landing-preview-photo" />
                <div className="landing-preview-card-body">
                  <span className="landing-preview-flag">{recipe.flag}</span>
                  <span className="landing-preview-title">{recipe.title.split('(')[0].trim()}</span>
                  <span className="landing-preview-meta">
                    <Clock size={12} />
                    {recipe.cook_time_min}分
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
