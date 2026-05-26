'use client';

import React from 'react';
import { Clock, Eye, LogIn, ShieldCheck, Sparkles } from 'lucide-react';
import { type Recipe } from '@/lib/mockData';

interface LandingViewProps {
  onSignIn: () => void;
  previewRecipes?: Recipe[];
}

export default function LandingView({ onSignIn, previewRecipes = [] }: LandingViewProps) {
  return (
    <div className="landing-container">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="hero-logo-wrapper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="GlobalBites" className="hero-logo" />
        </div>
        <h1 id="hero-title" className="hero-title-main">
          食べられる料理で、<span className="text-gradient">世界を旅する。</span>
        </h1>
        <p className="hero-subtitle">
          「食べられないものがあるから」と、諦めてきた料理がある。<br />
          あなたの食の制限を起点に、<strong>まだ知らない世界の味</strong>へ案内します。
        </p>
      </section>

      {previewRecipes.length > 0 && (
        <section className="landing-preview-section" aria-label="アプリプレビュー">
          <div className="landing-preview-heading">
            <span className="landing-preview-badge">
              <Sparkles size={12} />
              アプリプレビュー
            </span>
            <p className="landing-preview-label">実際に見つかるレシピの一例です</p>
          </div>

          <div className="landing-preview-grid">
            {previewRecipes.slice(0, 3).map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                className="landing-preview-card"
                onClick={onSignIn}
                aria-label={`${recipe.title} — ログインして詳細を見る`}
              >
                <div className="landing-preview-card-header">
                  <span className="landing-preview-title">{recipe.title.split('(')[0].trim()}</span>
                  <span className="landing-preview-flag">{recipe.flag}</span>
                </div>

                <div className="landing-preview-img-wrapper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={recipe.image_url} alt={recipe.title} className="landing-preview-photo" />
                  <span className="landing-preview-time">
                    <Clock size={11} />
                    {recipe.cook_time_min}分
                  </span>
                  <div className="landing-preview-hover-overlay">
                    <span className="landing-preview-hover-label">
                      <Eye size={14} />
                      ログインして見る
                    </span>
                  </div>
                </div>

                <div className="landing-preview-card-body">
                  <p className="landing-preview-desc">{recipe.description}</p>
                </div>

                <div className="landing-preview-card-footer">
                  <span className="landing-preview-safe">
                    <ShieldCheck size={12} />
                    制限設定で絞り込み可
                  </span>
                  <div className="landing-preview-tags">
                    {recipe.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="landing-preview-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button className="landing-preview-cta" onClick={onSignIn}>
            <LogIn size={16} />
            サインアップして無料で始める
          </button>
        </section>
      )}
    </div>
  );
}
