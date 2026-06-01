# Weekly Menu Agent

フロントエンドのみで動作する、1週間分の献立提案アプリケーションです。

## コンセプト
- Googleカレンダーの献立履歴をベースにした提案
- 「無難な献立」と「新しい味」の2パターン表示
- 7日分を任意の日に反映可能
- 気に入らない場合に提フレッシュ可能
- GitHub Pages でも公開できる構成

## セットアップ

```bash
npm install
npm run dev
```

## 開発

- `src/App.tsx` に主要UIとロジックを実装
- `src/style.css` でレスポンシブレイアウト
- `requirements.md` に要件定義を保持
