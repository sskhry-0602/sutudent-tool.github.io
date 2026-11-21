# STUDY TOOLS

学生向け学習プラットフォーム。React + Vite / Supabase / Cloudflare Workers / GitHub Pages。

## できること

- Supabase Authによるメールアドレス・パスワード登録とログイン
- ユーザーごとの学習記録保存
- ユーザーごとの暗記カード保存
- Cloudflare Worker経由のAI学習チャット
- GitHub ActionsによるGitHub Pages自動デプロイ

## 1. ローカルで起動

Node.js 20以上を推奨。

```bash
npm install
cp .env.example .env.local
```

`.env.local` にSupabaseのURLと公開用anon/publishable key、Cloudflare Worker URLを設定してから：

```bash
npm run dev
```

## 2. Supabaseを設定

1. https://supabase.com でプロジェクトを作成
2. SQL Editorを開く
3. `supabase/schema.sql` の内容を貼り付けて実行
4. Project Settings → API からProject URLとanon/public keyを取得
5. `.env.local` の `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` に設定
6. Authentication → URL Configuration で Site URL と Redirect URLs に公開URLを追加

例：
- Site URL: `https://YOURNAME.github.io/YOUR-REPO/`
- Redirect URL: `https://YOURNAME.github.io/**`

Supabaseのメール確認を有効にする場合、メールテンプレートやSMTP設定も確認してください。

## 3. AIを設定（Cloudflare Workers）

`worker/README.md` を参照。OpenAI APIキーはWorker secretとして登録します。
フロントエンドの `.env.local` にはWorkerの公開URLだけを設定します。

## 4. GitHub Pagesへ公開

1. GitHubで新しい空のリポジトリを作成（例：`study-tools`）
2. このフォルダの内容をリポジトリの `main` ブランチにpush
3. GitHubリポジトリの Settings → Secrets and variables → Actions → Variables に以下を追加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_AI_WORKER_URL`
4. Settings → Pages → Build and deployment → Source を **GitHub Actions** にする
5. `main` にpushすると自動でビルド・公開

公開URLは通常 `https://YOURNAME.github.io/YOUR-REPO/` です。

## セキュリティ上の重要事項

- Supabaseのanon/publishable keyはブラウザに置く前提の公開キーです。必ずRLSを有効にし、SQLのポリシーを適用してください。
- Supabaseの`service_role` key、OpenAI API keyは絶対に`.env`やGitHubへコミットしないでください。
- OpenAI API keyはCloudflare Worker secretにのみ保存します。
- 公開前にWorkerへレート制限・利用量監視を設定してください。公開サイトは第三者も利用でき、AI API費用が発生する可能性があります。
- このスターターにはOAuth、パスワードリセットUI、アカウント削除UI、AI利用者認証・レート制限はまだ含まれません。公開運用前に追加することを推奨します。
