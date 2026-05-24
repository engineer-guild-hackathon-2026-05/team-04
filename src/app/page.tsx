const setupItems = [
  "Next.js 15 を固定バージョンで導入",
  "TypeScript と ESLint を有効化",
  "App Router の初期ページを作成",
];

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero-card" aria-labelledby="page-title">
        <p className="eyebrow">Engineer Guild Hackathon 2026/05</p>
        <h1 id="page-title">Team 04 フロントエンド基盤</h1>
        <p className="lead">
          Next.js 15 をベースに、短期間で検証と改善を進められるアプリケーション基盤を用意しました。
        </p>
        <ul className="setup-list" aria-label="設定済み項目">
          {setupItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
