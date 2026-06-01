# Weekly Menu Agent

フロントエンドのみで動作する、1週間分の献立提案アプリケーションです。

## コンセプト
- Googleカレンダーの献立履歴をベースにした提案
- 「無難な献立」と「新しい味」の2パターン表示
- 7日分を任意の日に反映可能
- 気に入らない場合に提案をリフレッシュ可能
- Gemini APIキーは初回入力時にブラウザのローカルに保存
- GitHub Pages でも公開できる構成

## セットアップ

```bash
npm install
npm run dev
```

## GitHub リモート追加

```bash
git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git
```

## GitHub Pages への公開

1. `package.json` に `deploy` スクリプトを追加済み
2. GitHub にリポジトリを作成
3. `git push -u origin master`
4. `npm run deploy`

公開後、GitHub Pages の設定で `gh-pages` ブランチをソースに指定します。

## 開発

## 公開URL

アプリは GitHub Pages にデプロイ済みです。公開 URL:

https://Alumi1309.github.io/Weekly-Menu-Agent/

※ 反映に数分かかる場合があります。

## Google Calendar 連携 (OAuth)

このアプリはフロントエンド単体で Google Calendar と OAuth(PKCE) による連携が可能です。手順：

1. Google Cloud Console にアクセスし、プロジェクトを作成
2. 左メニューの「APIとサービス」→「ライブラリ」で `Google Calendar API` を有効化
3. 「認証情報」→「OAuth同意画面」を設定（外部か内部を選択）
4. 「認証情報」→「認証情報を作成」→「OAuth クライアントID」を作成（アプリケーションの種類：ウェブ）
	- リダイレクトURIにはアプリの公開 URL を指定します（例: `https://Alumi1309.github.io/Weekly-Menu-Agent/`）
5. クライアントID をコピーして、アプリの「Google OAuth Client ID」欄に貼り付けて保存
6. 「Google でサインイン」を押すと Google の認証画面が開き、許可するとトークンがローカルに保存されます

注意点:
- トークンはブラウザの `localStorage` に保存されます（ローカルに保存する動作を変更する場合はコードを調整してください）
- 公開アプリで広く配布する場合、OAuth 同意画面の審査が必要になる可能性があります
- 書き込み（カレンダーへのイベント作成）権限は `https://www.googleapis.com/auth/calendar` スコープを使用します


- `src/App.tsx` に主要UIとロジックを実装
- `src/style.css` でレスポンシブレイアウト
- `requirements.md` に要件定義を保持
