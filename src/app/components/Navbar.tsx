'use client';

import React from 'react';
import { Globe, User, LogIn, LogOut, Compass } from 'lucide-react';

interface NavbarProps {
  currentView: 'landing' | 'list' | 'profile';
  setCurrentView: (view: 'landing' | 'list' | 'profile') => void;
  userName: string;
  isLoggedIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export default function Navbar({
  currentView,
  setCurrentView,
  userName,
  isLoggedIn,
  onSignIn,
  onSignOut,
}: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* ロゴ部分。クリックすると現在の状態によってLPかリストへ遷移 */}
        <div 
          className="brand-logo" 
          onClick={() => setCurrentView(isLoggedIn ? 'list' : 'landing')}
          role="button"
          tabIndex={0}
        >
          <Globe className="logo-icon animate-pulse-slow" size={24} />
          <span className="brand-name">GlobalBites</span>
          <span className="brand-tagline">世界の味を、日本の食卓で。</span>
        </div>

        <div className="navbar-actions">
          {isLoggedIn ? (
            <>
              {/* レシピ一覧ボタン */}
              <button 
                className={`nav-btn ${currentView === 'list' ? 'active' : ''}`}
                onClick={() => setCurrentView('list')}
                title="レシピを探す"
              >
                <Compass size={18} />
                <span className="nav-btn-text">探す</span>
              </button>

              {/* プロフィール設定アイコン */}
              <button 
                className={`profile-icon-btn ${currentView === 'profile' ? 'active' : ''}`}
                onClick={() => setCurrentView('profile')}
                title="プロフィール設定"
                aria-label="プロフィール設定"
                id="profile-nav-btn"
              >
                <User size={18} />
                <span className="profile-badge-name">{userName || 'ゲスト'}</span>
              </button>

              {/* ログアウト */}
              <button 
                className="logout-btn" 
                onClick={onSignOut}
                title="サインアウト"
              >
                <LogOut size={16} />
                <span className="btn-text">サインアウト</span>
              </button>
            </>
          ) : (
            <button 
              className="signin-btn" 
              onClick={onSignIn}
              title="サインイン"
              id="signin-nav-btn"
            >
              <LogIn size={16} />
              <span>サインイン</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
