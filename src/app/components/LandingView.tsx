'use client';

import Image from 'next/image';
import React from 'react';
import { Clock, Compass, CheckCircle2, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';
import { MOCK_RECIPES, type Recipe } from '@/lib/mockData';

type LandingViewProps = {
  previewRecipes?: Recipe[];
};

export default function LandingView({ previewRecipes = MOCK_RECIPES }: LandingViewProps) {
  const visiblePreviewRecipes = previewRecipes.slice(0, 3);

  return (
    <div className="landing-container">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="hero-logo-wrapper">
          <Image
            src="/logo-cropped.png"
            alt="Edible"
            width={569}
            height={223}
            className="hero-logo"
            priority
          />
        </div>
        <div className="hero-badge">
          <Sparkles size={14} className="badge-icon" />
          <span>新しい食の出会いを、すべてのひとに</span>
        </div>
        <h1 id="hero-title" className="hero-title-main">
          食べられる世界の料理を<br />
          <span className="text-gradient">みんなで見つける</span>
        </h1>
        <p className="hero-subtitle">
          「食べられないものがあるから、外食や新しい料理を諦めがち…」<br />
          Edibleは、<strong>食事制限や好みに合う海外料理レシピ</strong>を探せる場所です。<br />
          食の選択肢を広げたい人と海外料理が好きな人が、条件に合うレシピを見つけられます。
        </p>
      </section>

      {visiblePreviewRecipes.length > 0 && (
        <section className="landing-preview-section" aria-label="アプリプレビュー">
          <div className="landing-preview-heading">
            <span className="landing-preview-badge">
              <Sparkles size={12} />
              アプリプレビュー
            </span>
            <p className="landing-preview-label">実際に見つかるレシピの一例です</p>
          </div>

          <div className="landing-preview-grid">
            {visiblePreviewRecipes.map((recipe) => (
              <article key={recipe.id} className="landing-preview-card">
                <div className="landing-preview-card-header">
                  <span className="landing-preview-title">{recipe.title.split('(')[0].trim()}</span>
                  <span className="landing-preview-flag" aria-hidden="true">{recipe.flag}</span>
                </div>

                <div className="landing-preview-img-wrapper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={recipe.image_url} alt={recipe.title} className="landing-preview-photo" />
                  <span className="landing-preview-time">
                    <Clock size={11} />
                    {recipe.cook_time_min}分
                  </span>
                </div>

                <div className="landing-preview-card-body">
                  <p className="landing-preview-desc">{recipe.description}</p>
                </div>

                <div className="landing-preview-card-footer">
                  <span className="landing-preview-safe">
                    <ShieldCheck size={12} />
                    制限設定で絞り込み可
                  </span>
                  <div className="landing-preview-tags" aria-label={`${recipe.title}の特徴`}>
                    {recipe.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="landing-preview-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="features-grid" aria-label="サービスの強み">
        <div className="feature-card">
          <div className="feature-icon-wrapper green">
            <CheckCircle2 size={24} />
          </div>
          <h3>伝統的なレシピがベース</h3>
          <p>
            既存の料理をヴィーガン風に無理やりアレンジするのではなく、世界の伝統的なヴィーガン料理や、アレルギー情報を確認しながら選べる海外料理をご提案。
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrapper orange">
            <Compass size={24} />
          </div>
          <h3>好みから広がる海外料理</h3>
          <p>
            気になる国や料理の好みを登録すると、まだ知らなかった海外料理との出会いを広げられます。
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrapper red">
            <ShieldAlert size={24} />
          </div>
          <h3>条件に合うレシピ推薦</h3>
          <p>
            アレルギーや食べられない食材を登録すると、自分の条件に合うレシピを見つけやすくなります。
          </p>
        </div>
      </section>
    </div>
  );
}
