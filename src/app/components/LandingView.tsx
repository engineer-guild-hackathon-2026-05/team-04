'use client';

import React from 'react';
import { Compass, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';

interface LandingViewProps {
  onSignIn: () => void;
}

export default function LandingView({
  onSignIn,
}: LandingViewProps) {
  return (
    <div className="landing-container">
      {/* ヒーローセクション */}
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="hero-badge">
          <Sparkles size={14} className="badge-icon" />
          <span>新しい食の出会いを、すべてのひとに</span>
        </div>
        <h1 id="hero-title" className="hero-title-main">
          世界の美味しいを<br />
          <span className="text-gradient">日本の食材で再現</span>
        </h1>
        <p className="hero-subtitle">
          「アレルギーやヴィーガンだから、海外料理は諦めている…」<br />
          GlobalBitesは、<strong>世界中にもともと存在する食事制限対応レシピ</strong>を厳選。<br />
          さらに、入手困難な現地のスパイスやハーブを、日本のスーパーで買える食材に置き換えて提案します。
        </p>

        <div className="hero-cta-box">
          <p className="cta-text">まずはあなたのアレルギーや好みを選択してみましょう</p>
          <button className="cta-signin-btn" onClick={onSignIn} id="landing-start-btn">
            <Compass size={18} className="cta-icon" />
            <span>食の制限を設定して始める</span>
          </button>
        </div>
      </section>

      {/* 3つのコンセプト特徴 */}
      <section className="features-grid" aria-label="サービスの強み">
        <div className="feature-card">
          <div className="feature-icon-wrapper green">
            <CheckCircle2 size={24} />
          </div>
          <h3>伝統的なレシピがベース</h3>
          <p>
            既存の料理をヴィーガン風に無理やりアレンジするのではなく、世界の伝統的なヴィーガン・アレルギーフリー料理をご提案。
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrapper orange">
            <Compass size={24} />
          </div>
          <h3>日本のスーパーで揃う食材</h3>
          <p>
            「ケマツァリ」「アチョーテ」など、手に入らない現地の特有スパイスを、日本の身近な食材に置き換えた「代替レシピ」を明記。
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrapper red">
            <ShieldAlert size={24} />
          </div>
          <h3>パーソナライズされた安全性</h3>
          <p>
            アレルギーや食べられない食材を登録すると、該当する材料が含まれるレシピを自動検知。安心安全な料理を探せます。
          </p>
        </div>
      </section>

      {/* 特徴の下にもう一つの大きなCTAボタン */}
      <section className="landing-bottom-cta" style={{ textAlign: 'center', margin: '20px 0' }}>
        <button 
          className="submit-explore-btn" 
          onClick={onSignIn}
          id="landing-start-bottom-btn"
        >
          <span>さっそく好みを設定しにいく</span>
          <Compass size={20} className="btn-arrow-icon" />
        </button>
      </section>
    </div>
  );
}
