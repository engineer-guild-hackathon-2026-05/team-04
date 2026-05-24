'use client';

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingView from './components/LandingView';
import ListView from './components/ListView';
import ProfileView from './components/ProfileView';
import RecipeModal from './components/RecipeModal';
import { Recipe } from '@/lib/mockData';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';

export default function Home() {
  // -------------------------------------------------------------
  // グローバルステート管理
  // -------------------------------------------------------------
  const [currentView, setCurrentView] = useState<'landing' | 'list' | 'profile'>('landing');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('ゲスト愛好家');
  const [restrictedIngredients, setRestrictedIngredients] = useState<string[]>([]);
  const [preferredDishes, setPreferredDishes] = useState<string[]>([]);
  const [preferredCuisines, setPreferredCuisines] = useState<string[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // -------------------------------------------------------------
  // マウント時のデータ読み込み（LocalStorage / Supabase）
  // -------------------------------------------------------------
  useEffect(() => {
    // 1. ローカルストレージから既存の設定を復元
    const savedProfile = localStorage.getItem('globalbites_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (parsed.userName) setUserName(parsed.userName);
        if (parsed.restrictedIngredients) setRestrictedIngredients(parsed.restrictedIngredients);
        if (parsed.preferredDishes) setPreferredDishes(parsed.preferredDishes);
        if (parsed.preferredCuisines) setPreferredCuisines(parsed.preferredCuisines);
        if (parsed.isLoggedIn) {
          setIsLoggedIn(parsed.isLoggedIn);
          // ログイン済みなら直接リストビューへ
          setCurrentView('list');
        }
      } catch (e) {
        console.error('Failed to parse local storage profile', e);
      }
    }

    // 2. もし実際に Supabase のセッションが存在すれば同期
    const syncSupabaseSession = async () => {
      if (!isSupabaseEnabled() || !supabase) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsLoggedIn(true);
        setUserName(session.user.user_metadata?.name || '旅するグルメ');
        
        // Supabase の profiles から情報取得を試みる
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', session.user.id)
          .single();
        if (profile?.name) setUserName(profile.name);

        // Supabase の NG材料から情報取得を試みる
        const { data: userRestricted } = await supabase
          .from('user_restricted_ingredients')
          .select('ingredient_id')
          .eq('user_id', session.user.id);
        if (userRestricted) {
          setRestrictedIngredients(userRestricted.map(r => r.ingredient_id));
        }
        
        setCurrentView('list');
      }
    };

    syncSupabaseSession();
  }, []);

  // -------------------------------------------------------------
  // ローカルストレージへの永続化ユーティリティ
  // -------------------------------------------------------------
  const saveToLocalStorage = (updates: {
    userName?: string;
    restrictedIngredients?: string[];
    preferredDishes?: string[];
    preferredCuisines?: string[];
    isLoggedIn?: boolean;
  }) => {
    const current = {
      userName: updates.userName !== undefined ? updates.userName : userName,
      restrictedIngredients: updates.restrictedIngredients !== undefined ? updates.restrictedIngredients : restrictedIngredients,
      preferredDishes: updates.preferredDishes !== undefined ? updates.preferredDishes : preferredDishes,
      preferredCuisines: updates.preferredCuisines !== undefined ? updates.preferredCuisines : preferredCuisines,
      isLoggedIn: updates.isLoggedIn !== undefined ? updates.isLoggedIn : isLoggedIn,
    };
    localStorage.setItem('globalbites_profile', JSON.stringify(current));
  };

  // -------------------------------------------------------------
  // サインイン / サインアウト ハンドラ
  // -------------------------------------------------------------
  const handleSignIn = async () => {
    // もし Supabase が有効なら、本当の認証フローを試みることも可能ですが、
    // ハックの検証スピードを高めるため、ワンクリックのスマートログイン（モック/ダミー）を即座に動かします。
    // まずプロフィール画面で自分の名前を入力してもらうために初期値は空文字にします。
    const demoUserName = '';
    setIsLoggedIn(true);
    setUserName(demoUserName);
    
    saveToLocalStorage({
      isLoggedIn: true,
      userName: demoUserName
    });

    // まずプロフィール & 食の制限設定画面へ遷移します！
    setCurrentView('profile');

    // バックグラウンドで Supabase 連携時のテーブルへのモック接続
    if (isSupabaseEnabled() && supabase) {
      console.log('Supabase is enabled. Attempting demo login trigger...');
      // 実際の認証が存在しないデモ中であれば、匿名サインインやパスワード無しのモック操作として機能
    }
  };

  const handleSignOut = async () => {
    setIsLoggedIn(false);
    setUserName('ゲスト愛好家');
    setRestrictedIngredients([]);
    setPreferredDishes([]);
    setPreferredCuisines([]);
    
    localStorage.removeItem('globalbites_profile');
    setCurrentView('landing');

    if (isSupabaseEnabled() && supabase) {
      await supabase.auth.signOut();
    }
  };


  // -------------------------------------------------------------
  // プロフィール画面での保存ハンドラ
  // -------------------------------------------------------------
  const handleSaveProfile = async (profile: {
    userName: string;
    restrictedIngredients: string[];
    preferredDishes: string[];
    preferredCuisines: string[];
  }) => {
    setUserName(profile.userName);
    setRestrictedIngredients(profile.restrictedIngredients);
    setPreferredDishes(profile.preferredDishes);
    setPreferredCuisines(profile.preferredCuisines);

    saveToLocalStorage({
      userName: profile.userName,
      restrictedIngredients: profile.restrictedIngredients,
      preferredDishes: profile.preferredDishes,
      preferredCuisines: profile.preferredCuisines,
    });

    // 保存完了後、設定内容に適合したレシピ一覧ビュー（list）へ自動遷移！
    setCurrentView('list');

    // データベースへのリアルタイム同期
    if (isSupabaseEnabled() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          // プロフィール名の更新
          await supabase.from('profiles').update({ name: profile.userName }).eq('id', user.id);
          
          // NG食材の同期
          await supabase.from('user_restricted_ingredients').delete().eq('user_id', user.id);
          if (profile.restrictedIngredients.length > 0) {
            const inserts = profile.restrictedIngredients.map(ingId => ({
              user_id: user.id,
              ingredient_id: ingId,
              reason: 'allergy'
            }));
            await supabase.from('user_restricted_ingredients').insert(inserts);
          }
        } catch (dbErr) {
          console.warn('Supabase DB Update failed. Synchronized locally.', dbErr);
        }
      }
    }
  };

  // -------------------------------------------------------------
  // レンダリング
  // -------------------------------------------------------------
  return (
    <div className="app-container">
      {/* 1. ナビゲーションバー */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        userName={userName}
        isLoggedIn={isLoggedIn}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      {/* 2. メインコンテンツ領域（ビューの動的切り替え） */}
      <main className="main-content">
        {currentView === 'landing' && (
          <LandingView
            onSignIn={handleSignIn}
          />
        )}

        {currentView === 'list' && (
          <ListView
            restrictedIngredients={restrictedIngredients}
            preferredDishes={preferredDishes}
            preferredCuisines={preferredCuisines}
            onSelectRecipe={setSelectedRecipe}
            setCurrentView={setCurrentView}
          />
        )}

        {currentView === 'profile' && (
          <ProfileView
            initialUserName={userName}
            initialRestrictedIngredients={restrictedIngredients}
            initialPreferredDishes={preferredDishes}
            initialPreferredCuisines={preferredCuisines}
            onSaveProfile={handleSaveProfile}
            onBackToRecipes={() => setCurrentView('list')}
          />
        )}
      </main>

      {/* 3. 詳細モーダルポップアップ */}
      <RecipeModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        restrictedIngredients={restrictedIngredients}
      />
    </div>
  );
}
