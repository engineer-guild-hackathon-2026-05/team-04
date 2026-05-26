'use client';

import React from 'react';
import { Compass, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';

interface LandingViewProps {}

export default function LandingView({}: LandingViewProps) {
  return (
    <div className="landing-container">
      <section className="landing-hero" aria-labelledby="hero-title">
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
          GlobalBitesは、<strong>食事制限や好みに合う海外料理レシピ</strong>を探せる場所です。<br />
          食の選択肢を広げたい人と海外料理が好きな人が、条件に合うレシピを見つけられます。
        </p>
      </section>

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
