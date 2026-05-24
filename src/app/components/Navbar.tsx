'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Globe, LogIn, LogOut, Settings, User } from 'lucide-react';

interface NavbarProps {
  setCurrentView: (view: 'landing' | 'list' | 'profile') => void;
  onNavigateHome: () => void;
  userName: string;
  isLoggedIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

function getAvatarLabel(userName: string) {
  const trimmedName = userName.trim();
  if (!trimmedName) return 'G';
  return trimmedName.slice(0, 1).toUpperCase();
}

export default function Navbar({
  setCurrentView,
  onNavigateHome,
  userName,
  isLoggedIn,
  onSignIn,
  onSignOut,
}: NavbarProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const profileSettingsButtonRef = useRef<HTMLButtonElement>(null);
  const logoutButtonRef = useRef<HTMLButtonElement>(null);
  const shouldFocusFirstMenuItemRef = useRef(false);

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    if (shouldFocusFirstMenuItemRef.current) {
      profileSettingsButtonRef.current?.focus();
      shouldFocusFirstMenuItemRef.current = false;
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
  }, [isProfileMenuOpen]);

  const handleLogoClick = () => {
    onNavigateHome();
    setIsProfileMenuOpen(false);
  };

  const openProfileMenu = (focusFirstItem = false) => {
    shouldFocusFirstMenuItemRef.current = focusFirstItem;
    setIsProfileMenuOpen(true);
  };

  const handleProfileButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openProfileMenu(true);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      shouldFocusFirstMenuItemRef.current = false;
      setIsProfileMenuOpen(true);
      window.setTimeout(() => logoutButtonRef.current?.focus(), 0);
    }
  };

  const focusMenuItem = (direction: 'next' | 'previous') => {
    const menuItems = [profileSettingsButtonRef.current, logoutButtonRef.current].filter(
      (item): item is HTMLButtonElement => Boolean(item),
    );
    const activeIndex = menuItems.findIndex((item) => item === document.activeElement);
    const nextIndex = direction === 'next'
      ? (activeIndex + 1) % menuItems.length
      : (activeIndex - 1 + menuItems.length) % menuItems.length;
    menuItems[nextIndex]?.focus();
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
      focusMenuItem('next');
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusMenuItem('previous');
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      profileSettingsButtonRef.current?.focus();
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      logoutButtonRef.current?.focus();
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
        {/* ロゴクリックでログイン中のメインページ（レシピ検索）へ戻る */}
        <button
          type="button"
          className="brand-logo"
          onClick={handleLogoClick}
          title="メインページへ戻る"
        >
          <Globe className="logo-icon animate-pulse-slow" size={24} />
          <span className="brand-name">GlobalBites</span>
          <span className="brand-tagline">世界の味を、日本の食卓で。</span>
        </button>

        <div className="navbar-actions">
          {isLoggedIn ? (
            <div className="profile-menu-wrapper" ref={profileMenuRef}>
              <button
                type="button"
                className={`profile-avatar-btn ${isProfileMenuOpen ? 'active' : ''}`}
                ref={profileMenuButtonRef}
                onClick={() => {
                  shouldFocusFirstMenuItemRef.current = false;
                  setIsProfileMenuOpen((open) => !open);
                }}
                onKeyDown={handleProfileButtonKeyDown}
                title="プロフィールメニュー"
                aria-label="プロフィールメニューを開く"
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
                      <span className="profile-dropdown-caption">アカウントメニュー</span>
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
          )}
        </div>
      </div>
    </nav>
  );
}
