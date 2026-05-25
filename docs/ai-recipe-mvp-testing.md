# AIレシピMVP テスト方針

worker-3 のテスト lane は、AIレシピ提案・日本食材での再提案の MVP 契約を `scripts/regression/` に固定する。

## 追加した回帰テスト

- `scripts/regression/ai-recipe-mvp-contract.test.mjs`
  - OpenRouter / service-role secret が Client Component や `NEXT_PUBLIC_*` に漏れないことを常時検査する。
  - DB/API/UI 実装ファイルがマージされた時点で、MVP カラム、RPC 権限、固定モデル `google/gemini-3.1-flash-lite`、認証優先、非UUIDレシピの日本語 disabled copy などを自動的に検査する ratchet テスト。
- `scripts/regression/ai-recipe-validation-mocks.test.mjs`
  - OpenRouter JSON 失敗、未対応 restriction、制限食材混入、`diet-vegan` 違反を mock payload で固定する。

## 並行作業中の扱い

この worker worktree には DB/API/UI lane の実装がまだ存在しないため、contract test は該当ファイルが存在するまでは存在チェックを ratchet 方式で有効化する。統合ブランチで他 lane のファイルが入ると、同じテストが実装契約を強制する。

## 完了判定

統合後は少なくとも以下を実行する。

```bash
npm run lint
npm run typecheck
npm run build
npm run test
```

`npm run test` は `scripts/run-regression-tests.mjs` 経由で全 `scripts/regression/*.test.mjs` を実行する。
