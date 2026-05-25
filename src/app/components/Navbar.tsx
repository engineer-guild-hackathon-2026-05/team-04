'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LogIn, LogOut, Settings, User, UserPlus } from 'lucide-react';

interface NavbarProps {
  setCurrentView: (view: 'landing' | 'list' | 'profile') => void;
  onNavigateHome: () => void;
  userName: string;
  isLoggedIn: boolean;
  onSignIn: () => void;
  onSignUp: () => void;
  onSignOut: () => void;
}

function getAvatarLabel(userName: string) {
  const trimmedName = userName.trim();
  if (!trimmedName) return 'G';
  return (Array.from(trimmedName)[0] ?? 'G').toLocaleUpperCase('ja-JP');
}

export default function Navbar({
  setCurrentView,
  onNavigateHome,
  userName,
  isLoggedIn,
  onSignIn,
  onSignUp,
  onSignOut,
}: NavbarProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const profileSettingsButtonRef = useRef<HTMLButtonElement>(null);
  const logoutButtonRef = useRef<HTMLButtonElement>(null);
  const pendingMenuFocusRef = useRef<'first' | 'last' | null>(null);

  const focusProfileMenuItem = useCallback((focusTarget: 'first' | 'last' | 'next' | 'previous') => {
    const menuItems = [profileSettingsButtonRef.current, logoutButtonRef.current].filter(
      (item): item is HTMLButtonElement => Boolean(item),
    );
    if (menuItems.length === 0) return;

    if (focusTarget === 'first') {
      menuItems[0]?.focus();
      return;
    }

    if (focusTarget === 'last') {
      menuItems[menuItems.length - 1]?.focus();
      return;
    }

    const activeIndex = menuItems.findIndex((item) => item === document.activeElement);
    const nextIndex = focusTarget === 'next'
      ? (activeIndex + 1) % menuItems.length
      : (activeIndex - 1 + menuItems.length) % menuItems.length;
    menuItems[nextIndex]?.focus();
  }, []);

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    if (pendingMenuFocusRef.current) {
      focusProfileMenuItem(pendingMenuFocusRef.current);
      pendingMenuFocusRef.current = null;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
        profileMenuButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [focusProfileMenuItem, isProfileMenuOpen]);

  const handleLogoClick = () => {
    onNavigateHome();
    setIsProfileMenuOpen(false);
  };

  const openProfileMenu = (focusTarget: 'first' | 'last' | null = null) => {
    pendingMenuFocusRef.current = focusTarget;

    if (isProfileMenuOpen) {
      if (focusTarget) {
        window.setTimeout(() => focusProfileMenuItem(focusTarget), 0);
      }
      return;
    }

    setIsProfileMenuOpen(true);
  };

  const handleProfileButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openProfileMenu('first');
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      openProfileMenu('last');
    }
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsProfileMenuOpen(false);
      profileMenuButtonRef.current?.focus();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusProfileMenuItem('next');
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusProfileMenuItem('previous');
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      focusProfileMenuItem('first');
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      focusProfileMenuItem('last');
    }
  };

  const handleProfileSettingsClick = () => {
    setCurrentView('profile');
    setIsProfileMenuOpen(false);
  };

  const handleSignOutClick = () => {
    setIsProfileMenuOpen(false);
    onSignOut();
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <button
          type="button"
          className="brand-logo"
          onClick={handleLogoClick}
          title="メインページへ戻る"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="GlobalBites ロゴ" className="logo-svg" />
          <span className="brand-tagline">新しい世界、いただきます</span>
        </button>

        <div className="navbar-actions">
          {isLoggedIn ? (
            <div className="profile-menu-wrapper" ref={profileMenuRef}>
              <button
                type="button"
                className={`profile-avatar-btn ${isProfileMenuOpen ? 'active' : ''}`}
                ref={profileMenuButtonRef}
                onClick={() => {
                  pendingMenuFocusRef.current = null;
                  setIsProfileMenuOpen((open) => !open);
                }}
                onKeyDown={handleProfileButtonKeyDown}
                title="プロフィールメニュー"
                aria-label={isProfileMenuOpen ? 'プロフィールメニューを閉じる' : 'プロフィールメニューを開く'}
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
                id="profile-nav-btn"
              >
                <span className="profile-avatar-image" aria-hidden="true">
                  {getAvatarLabel(userName || 'ゲスト')}
                </span>
              </button>

              {isProfileMenuOpen && (
                <div
                  className="profile-dropdown-menu"
                  role="menu"
                  aria-label="プロフィールメニュー"
                  onKeyDown={handleMenuKeyDown}
                >
                  <div className="profile-dropdown-user">
                    <span className="profile-dropdown-avatar" aria-hidden="true">
                      <User size={18} />
                    </span>
                    <div className="profile-dropdown-user-text">
                      <span className="profile-dropdown-name">{userName || 'ゲスト'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="profile-menu-item"
                    ref={profileSettingsButtonRef}
                    onClick={handleProfileSettingsClick}
                    role="menuitem"
                  >
                    <Settings size={16} />
                    <span>プロフィール設定</span>
                  </button>

                  <button
                    type="button"
                    className="profile-menu-item danger"
                    ref={logoutButtonRef}
                    onClick={handleSignOutClick}
                    role="menuitem"
                  >
                    <LogOut size={16} />
                    <span>ログアウト</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="navbar-auth-btns">
              <button
                type="button"
                className="signup-btn"
                onClick={onSignUp}
                title="新規登録"
                id="signup-nav-btn"
              >
                <UserPlus size={16} />
                <span>新規登録</span>
              </button>
              <button
                type="button"
                className="signin-btn"
                onClick={onSignIn}
                title="サインイン"
                id="signin-nav-btn"
              >
                <LogIn size={16} />
                <span>サインイン</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
