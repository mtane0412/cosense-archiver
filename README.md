# Cosense Archiver

Cosense（旧Scrapbox）のJSONエクスポートから、GitHub Pagesでホスティング可能な静的サイトを生成するCLIツールです。

## 機能

- CosenseのJSONエクスポートから静的HTMLサイトを生成
- Cosenseライクなデザインを再現
- 1hop/2hopリンクの表示（関連ページの発見に便利）
- クライアントサイド検索機能
- 画像の自動ダウンロード
  - Gyazo画像対応（APIトークンで高画質取得）
  - プライベートプロジェクトの画像対応（`connect.sid` 認証）
  - 既存画像のスキップ（再ビルド高速化）
- レスポンシブデザイン

## 対応記法

- 内部リンク `[ページ名]`
- 外部リンク `[https://example.com タイトル]`
- 画像 `[https://gyazo.com/xxx]`
- コードブロック `code:filename.js`
- インラインコード `` `code` ``
- 太字 `[* text]` `[[text]]`
- 斜体 `[/ text]`
- 打消し線 `[- text]`
- ハッシュタグ `#tag`
- 箇条書き（先頭スペース/タブ）
- 引用 `> text`

## インストール

```bash
git clone https://github.com/mtane0412/cosense-archiver.git
cd cosense-archiver
npm install
npm run build
```

## 使用方法

### 基本的な使い方

```bash
node dist/index.js export.json
```

### オプション

```
node dist/index.js <input.json> [options]

引数:
  <input.json>     CosenseからエクスポートしたJSONファイル

オプション:
  -o, --output <dir>      出力先ディレクトリ (デフォルト: ./output)
  --no-images             画像のダウンロードをスキップ
  -c, --concurrency <n>   画像ダウンロードの並列数 (デフォルト: 5)
  --gyazo-token <token>   Gyazo APIアクセストークン
  --connect-sid <sid>     Scrapbox認証用Cookie（プライベート画像用）
  -h, --help              このヘルプを表示
```

### 使用例

```bash
# 基本的な使用
node dist/index.js export.json

# 出力先を指定
node dist/index.js export.json -o ./dist

# 画像ダウンロードをスキップ
node dist/index.js export.json --no-images

# Gyazo APIトークンを指定（高画質画像のダウンロード）
node dist/index.js export.json --gyazo-token YOUR_TOKEN

# プライベートプロジェクトの画像をダウンロード
node dist/index.js export.json --connect-sid YOUR_CONNECT_SID

# 環境変数で認証情報を指定
GYAZO_ACCESS_TOKEN=xxx CONNECT_SID=xxx node dist/index.js export.json
```

## 画像ダウンロードについて

### Gyazo画像

Gyazo画像を高画質でダウンロードするには、Gyazo APIアクセストークンが必要です。

1. [Gyazo API](https://gyazo.com/api) にアクセス
2. アプリケーションを登録してアクセストークンを取得
3. 環境変数 `GYAZO_ACCESS_TOKEN` に設定するか、`--gyazo-token` オプションで指定

### プライベートプロジェクトの画像

プライベートプロジェクトの画像（`https://scrapbox.io/files/xxx`形式）をダウンロードするには、`connect.sid` Cookieが必要です。

1. ブラウザでScrapbox/Cosenseにログイン
2. DevTools（F12）→ Application → Cookies → `scrapbox.io` から `connect.sid` の値をコピー
3. 環境変数 `CONNECT_SID` に設定するか、`--connect-sid` オプションで指定

### 環境変数の設定

`.env` ファイルを使用する場合：

```bash
cp .env.example .env
# .env ファイルを編集してトークンを設定
```

`.env` ファイルの例：

```
GYAZO_ACCESS_TOKEN=your_gyazo_token_here
CONNECT_SID=your_connect_sid_here
```

### 再ビルド時の高速化

画像ダウンロードは既存ファイルを自動的にスキップします。再ビルド時には新規画像のみダウンロードされるため、効率的に更新できます。

## 生成されるサイト構造

```
output/
├── index.html          # ページ一覧
├── search.json         # 検索インデックス
├── pages/              # 各ページのHTML
│   ├── page-title.html
│   └── ...
└── assets/
    ├── css/
    │   └── style.css
    ├── js/
    │   └── search.js
    └── images/         # ダウンロードした画像
```

## ローカルでの確認

生成されたサイトを確認するには：

```bash
cd output
python3 -m http.server 8080
# ブラウザで http://localhost:8080 を開く
```

## GitHub Pagesへのデプロイ

1. 生成された `output/` ディレクトリの内容をリポジトリにプッシュ
2. GitHub リポジトリの Settings → Pages で公開設定

## 開発

```bash
# 依存関係のインストール
npm install

# ビルド
npm run build

# テスト
npm test

# 型チェック（lint）
npm run lint
```

## 技術スタック

- TypeScript
- Node.js
- esbuild（バンドラー）
- Vitest（テストフレームワーク）

## ライセンス

ISC
