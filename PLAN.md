# Cosense Archiver 実装計画

## 概要

Cosense（旧Scrapbox）のJSONエクスポートファイルから、GitHub Pagesでホスティング可能な静的サイトを生成するCLIツール。

## 技術スタック

- **言語**: TypeScript (Node.js)
- **出力**: 純粋HTML/CSS + Vanilla JavaScript
- **ビルド**: esbuild（シンプルで高速）
- **テスト**: Vitest
- **パッケージマネージャ**: npm

## アーキテクチャ

```
cosense-archiver/
├── src/
│   ├── index.ts              # CLIエントリーポイント
│   ├── parser/
│   │   ├── json-parser.ts    # CosenseJSON読み込み
│   │   ├── line-parser.ts    # 行のパース（リンク、コード等）
│   │   └── types.ts          # 型定義
│   ├── analyzer/
│   │   ├── link-analyzer.ts  # リンク解析（1hop/2hop計算）
│   │   └── search-index.ts   # 検索インデックス生成
│   ├── downloader/
│   │   └── image-downloader.ts # 画像ダウンロード
│   ├── generator/
│   │   ├── html-generator.ts # HTML生成
│   │   ├── css-generator.ts  # CSS生成
│   │   └── js-generator.ts   # クライアントJS生成
│   └── templates/
│       ├── page.html         # ページテンプレート
│       ├── index.html        # 一覧ページテンプレート
│       └── styles.css        # CosenseライクなCSS
├── tests/
│   ├── parser/
│   ├── analyzer/
│   └── generator/
├── dist/                     # ビルド成果物
└── output/                   # 生成された静的サイト（デフォルト）
```

## 実装フェーズ

### Phase 1: 基盤構築
1. プロジェクト初期化（TypeScript, Vitest, esbuild）
2. 型定義（CosenseJSON, Page, Line）
3. JSONパーサー実装

### Phase 2: 行パーサー
1. 内部リンク `[page title]` パース
2. 外部リンク `[url title]` / `[title url]` パース
3. 画像記法 `[https://gyazo.com/xxx]` パース
4. コードブロック `code:filename` パース
5. ハッシュタグ `#tag` パース
6. 装飾記法 `[* bold]` `[/ italic]` 等パース

### Phase 3: リンク解析
1. ページ間リンクグラフ構築
2. 1 hop link 計算（直接リンクしているページ）
3. 2 hop link 計算（1 hop先からリンクされているページ）
4. バックリンク（このページにリンクしているページ）計算

### Phase 4: 検索機能
1. 検索インデックス生成（JSON形式）
2. クライアントサイド検索JS実装
3. インクリメンタルサーチUI

### Phase 5: 画像処理
1. Gyazo画像URL抽出
2. 画像ダウンロード機能
3. ローカルパスへの置換
4. その他画像サービス対応（imgur等）

### Phase 6: HTML/CSS生成
1. CosenseライクなCSS設計
2. ページテンプレート生成
3. 一覧ページ生成
4. 1hop/2hop リンクUI実装
5. レスポンシブ対応

### Phase 7: CLI完成
1. コマンドライン引数処理
2. 設定ファイル対応（オプション）
3. エラーハンドリング
4. 進捗表示

## Cosense記法対応表

| 記法 | 例 | 優先度 |
|------|-----|--------|
| 内部リンク | `[ページ名]` | 必須 |
| 外部リンク | `[https://example.com タイトル]` | 必須 |
| 画像 | `[https://gyazo.com/xxx]` | 必須 |
| コードブロック | `code:filename.js` | 高 |
| インラインコード | `` `code` `` | 高 |
| 太字 | `[* text]` `[[text]]` | 高 |
| 斜体 | `[/ text]` | 中 |
| 打消し線 | `[- text]` | 中 |
| ハッシュタグ | `#tag` | 高 |
| 箇条書き | 先頭スペース/タブ | 必須 |
| 引用 | `> text` | 中 |
| アイコン | `[user.icon]` | 低（対応しない） |
| 数式 | `[$ formula]` | 低 |

## 1hop/2hop リンクUI仕様

### 表示位置
- ページ本文の下部に表示
- Cosenseと同様の2カラムレイアウト

### 1 hop links
- このページからリンクしているページ
- このページにリンクしているページ（バックリンク）
- リンクテキストの前後のコンテキスト表示

### 2 hop links
- 1 hop先のページからさらにリンクされているページ
- 関連度でソート

## 検索機能仕様

### 検索インデックス
- ページタイトル
- ページ本文（プレーンテキスト化）
- 作成日時・更新日時

### 検索UI
- ヘッダーに検索ボックス
- インクリメンタルサーチ（入力中に結果表示）
- タイトル一致を優先表示
- 本文一致はスニペット表示

## 出力ディレクトリ構造

```
output/
├── index.html              # ページ一覧
├── search.json             # 検索インデックス
├── pages/
│   ├── page-title-1.html   # 各ページ（URLエンコード済み）
│   ├── page-title-2.html
│   └── ...
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── search.js
│   └── images/             # ダウンロードした画像
│       ├── gyazo-xxx.png
│       └── ...
└── link-data.json          # リンクグラフデータ（1hop/2hop用）
```

## 開発順序（TDD）

各機能について以下の順序で開発：

1. 型定義
2. テストケース作成（RED）
3. 実装（GREEN）
4. リファクタリング（REFACTOR）

## 次のアクション

1. プロジェクト初期化（package.json, tsconfig.json, vitest.config.ts）
2. 型定義ファイル作成
3. JSONパーサーのテスト・実装から開始
