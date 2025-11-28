/**
 * HTML生成モジュール
 * パースされた行やページをHTMLに変換する
 * Gyazo画像はAPIで解決した直リンクを使用する
 */
import * as crypto from "crypto";
import type { CosensePage } from "../parser/types.js";
import type { LinkGraph } from "../analyzer/link-analyzer.js";
import { parseLine, parseLines } from "../parser/line-parser.js";
import { getLineText } from "../parser/types.js";
import { get1HopLinks, get2HopLinks } from "../analyzer/link-analyzer.js";
import type { ParsedNode, ParsedLine } from "../parser/line-types.js";
import {
  isGyazoUrl,
  createGyazoFallbackLink,
  type GyazoResolveResult,
} from "../resolver/gyazo-resolver.js";

// 最大ファイル名長（拡張子を除く）
const MAX_FILENAME_LENGTH = 200;

/**
 * レンダリングコンテキスト
 * ノードのレンダリングに必要な情報を保持
 */
export interface RenderContext {
  existingPages: Set<string>;
  /** Gyazo URL解決結果のマップ（元URL -> 解決結果） */
  gyazoResults?: Map<string, GyazoResolveResult>;
  /** Gyazo APIトークンが設定されているか */
  hasGyazoToken?: boolean;
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * ページタイトルからファイル名を生成（ファイルシステム用）
 * 長いタイトルはハッシュベースのファイル名を使用
 * ファイルシステムで問題になる文字は置換する
 */
export function generatePageFilename(title: string): string {
  // ファイルシステムで問題になる文字を置換
  // / はディレクトリ区切りとして解釈されるため _ に置換
  const safeTitle = title.replace(/\//g, "_");

  // ファイル名が長すぎる場合（UTF-8で255バイト以上）はハッシュを使用
  const byteLength = Buffer.byteLength(safeTitle, "utf8");
  if (byteLength > MAX_FILENAME_LENGTH) {
    const hash = crypto.createHash("md5").update(title).digest("hex");
    return `page_${hash}.html`;
  }

  // 日本語をそのままファイル名として使用
  return `${safeTitle}.html`;
}

/**
 * URLエンコード済みのファイル名を生成
 */
function getEncodedFilename(title: string): string {
  const filename = generatePageFilename(title);
  // ファイル名をURLエンコード（.htmlの.は維持）
  return encodeURIComponent(filename).replace(/%2E/g, ".");
}

/**
 * ページへのリンクURLを生成（インデックスページ用、pages/プレフィックス付き）
 */
function getPageUrlFromIndex(title: string): string {
  return `pages/${getEncodedFilename(title)}`;
}

/**
 * ページへのリンクURLを生成（ページ内リンク用、同じディレクトリ）
 */
function getPageUrlFromPage(title: string): string {
  return getEncodedFilename(title);
}

/**
 * Gyazo画像をレンダリング
 */
function renderGyazoImage(url: string, context: RenderContext): string {
  // Gyazo解決結果がある場合
  if (context.gyazoResults) {
    const result = context.gyazoResults.get(url);
    if (result && result.success) {
      // 動画の場合はGIF画像を表示
      if (result.type === "video") {
        return `<a href="${escapeHtml(result.videoUrl || url)}" target="_blank" rel="noopener"><img src="${escapeHtml(result.imageUrl)}" alt="" class="page-image gyazo-video" loading="lazy"></a>`;
      }
      // 通常の画像
      return `<img src="${escapeHtml(result.imageUrl)}" alt="" class="page-image" loading="lazy">`;
    }
  }

  // APIトークンがない場合は「Gyazo」リンクを表示
  if (!context.hasGyazoToken) {
    return createGyazoFallbackLink(url);
  }

  // 解決に失敗した場合はフォールバック（元のURLを使用）
  return `<img src="${escapeHtml(url)}" alt="" class="page-image" loading="lazy">`;
}

/**
 * ノードをHTMLにレンダリング
 */
function renderNode(node: ParsedNode, context: RenderContext): string {
  switch (node.type) {
    case "text":
      return escapeHtml(node.text);

    case "internal-link": {
      const exists = context.existingPages.has(node.title);
      const className = exists ? "internal-link" : "internal-link missing-link";
      const href = exists ? getPageUrlFromPage(node.title) : "#";
      return `<a href="${href}" class="${className}">${escapeHtml(node.title)}</a>`;
    }

    case "external-link":
      return `<a href="${escapeHtml(node.url)}" class="external-link" target="_blank" rel="noopener">${escapeHtml(node.title)}</a>`;

    case "external-project-link":
      return `<a href="https://scrapbox.io/${escapeHtml(node.project)}/${encodeURIComponent(node.page)}" class="external-project-link" target="_blank" rel="noopener">${escapeHtml(node.page || node.project)}</a>`;

    case "image":
      // Gyazo URLの場合は特別な処理
      if (isGyazoUrl(node.url)) {
        return renderGyazoImage(node.url, context);
      }
      return `<img src="${escapeHtml(node.url)}" alt="" class="page-image" loading="lazy">`;

    case "icon":
      return `<span class="icon">${escapeHtml(node.user)}</span>`;

    case "hashtag": {
      const exists = context.existingPages.has(node.tag);
      const className = exists ? "hashtag" : "hashtag missing-link";
      const href = exists ? getPageUrlFromPage(node.tag) : "#";
      return `<a href="${href}" class="${className}">#${escapeHtml(node.tag)}</a>`;
    }

    case "bold": {
      const level = Math.min(node.level, 3);
      const children = node.children.map((c) => renderNode(c, context)).join("");
      return `<strong class="bold-${level}">${children}</strong>`;
    }

    case "italic": {
      const children = node.children.map((c) => renderNode(c, context)).join("");
      return `<em>${children}</em>`;
    }

    case "strikethrough": {
      const children = node.children.map((c) => renderNode(c, context)).join("");
      return `<del>${children}</del>`;
    }

    case "underline": {
      const children = node.children.map((c) => renderNode(c, context)).join("");
      return `<u>${children}</u>`;
    }

    case "code":
      return `<code class="inline-code">${escapeHtml(node.code)}</code>`;

    case "math":
      return `<span class="math">${escapeHtml(node.formula)}</span>`;

    default:
      return "";
  }
}

/**
 * 1行をHTMLにレンダリング
 * インデントがある行には先頭に黒丸（•）を追加
 */
export function renderLine(
  line: string,
  existingPages: Set<string> = new Set(),
  context?: Partial<RenderContext>
): string {
  const parsed = parseLine(line);
  const renderContext: RenderContext = {
    existingPages,
    ...context,
  };
  const content = parsed.nodes.map((n) => renderNode(n, renderContext)).join("");

  if (parsed.indent > 0) {
    const bullet = '<span class="bullet">•</span>';
    return `<div class="line indent-${parsed.indent}">${bullet}${content}</div>`;
  }
  return `<div class="line">${content}</div>`;
}

/**
 * コードブロックをHTMLにレンダリング
 */
function renderCodeBlock(lines: string[], lang: string): string {
  const code = lines.map(escapeHtml).join("\n");
  const langClass = lang ? ` language-${lang}` : "";
  return `<pre class="code-block${langClass}"><code>${code}</code></pre>`;
}

/**
 * ページ本文をHTMLにレンダリング
 */
function renderPageContent(page: CosensePage, context: RenderContext): string {
  const lines = page.lines.map(getLineText);
  const parsedLines = parseLines(lines);
  const htmlParts: string[] = [];

  let i = 0;
  while (i < parsedLines.length) {
    const parsed = parsedLines[i];

    // タイトル行（最初の行）はスキップ
    if (i === 0) {
      i++;
      continue;
    }

    // コードブロック
    if (parsed.isCodeBlock) {
      const codeLines: string[] = [];
      const lang = parsed.codeBlockLang || "";
      i++;

      while (i < parsedLines.length && parsedLines[i].isCodeBlockContent) {
        codeLines.push(lines[i].replace(/^[\t ]+/, "")); // インデントを除去
        i++;
      }

      htmlParts.push(renderCodeBlock(codeLines, lang));
      continue;
    }

    // 通常行
    const content = parsed.nodes.map((n) => renderNode(n, context)).join("");
    if (parsed.indent > 0) {
      const bullet = '<span class="bullet">•</span>';
      htmlParts.push(`<div class="line indent-${parsed.indent}">${bullet}${content}</div>`);
    } else {
      htmlParts.push(`<div class="line">${content}</div>`);
    }
    i++;
  }

  return htmlParts.join("\n");
}

/**
 * 関連ページセクションをレンダリング
 */
function renderRelatedPages(
  pageTitle: string,
  linkGraph: LinkGraph
): string {
  const oneHop = get1HopLinks(linkGraph, pageTitle);
  const twoHop = get2HopLinks(linkGraph, pageTitle);

  const parts: string[] = [];

  // 1ホップリンク（outgoing）
  if (oneHop.outgoing.length > 0) {
    const links = oneHop.outgoing
      .filter((t) => linkGraph.existingPages.has(t))
      .map((t) => `<a href="${getPageUrlFromPage(t)}" class="related-link">${escapeHtml(t)}</a>`)
      .join("");
    if (links) {
      parts.push(`<div class="related-section"><h3>リンク先</h3><div class="related-links">${links}</div></div>`);
    }
  }

  // 1ホップリンク（incoming / バックリンク）
  if (oneHop.incoming.length > 0) {
    const links = oneHop.incoming
      .filter((t) => linkGraph.existingPages.has(t))
      .map((t) => `<a href="${getPageUrlFromPage(t)}" class="related-link">${escapeHtml(t)}</a>`)
      .join("");
    if (links) {
      parts.push(`<div class="related-section"><h3>リンク元</h3><div class="related-links">${links}</div></div>`);
    }
  }

  // 2ホップリンク
  if (twoHop.length > 0) {
    const links = twoHop
      .filter((t) => linkGraph.existingPages.has(t))
      .slice(0, 20) // 最大20件
      .map((t) => `<a href="${getPageUrlFromPage(t)}" class="related-link two-hop">${escapeHtml(t)}</a>`)
      .join("");
    if (links) {
      parts.push(`<div class="related-section"><h3>関連ページ</h3><div class="related-links">${links}</div></div>`);
    }
  }

  if (parts.length === 0) {
    return "";
  }

  return `<section class="related-pages">${parts.join("")}</section>`;
}

/**
 * 日付をフォーマット
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * ページ全体のHTMLを生成
 */
export function renderPage(
  page: CosensePage,
  linkGraph: LinkGraph,
  projectName: string,
  options?: {
    gyazoResults?: Map<string, GyazoResolveResult>;
    hasGyazoToken?: boolean;
  }
): string {
  const context: RenderContext = {
    existingPages: linkGraph.existingPages,
    gyazoResults: options?.gyazoResults,
    hasGyazoToken: options?.hasGyazoToken,
  };
  const content = renderPageContent(page, context);
  const relatedPages = renderRelatedPages(page.title, linkGraph);
  const createdDate = formatDate(page.created);
  const updatedDate = formatDate(page.updated);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(page.title)} - ${escapeHtml(projectName)}</title>
  <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
  <header class="site-header">
    <nav class="header-nav">
      <a href="../index.html" class="project-name">${escapeHtml(projectName)}</a>
      <div class="search-container">
        <input type="text" id="search-input" placeholder="検索..." class="search-input">
        <div id="search-results" class="search-results"></div>
      </div>
    </nav>
  </header>

  <main class="page-content">
    <article class="page">
      <h1 class="page-title">${escapeHtml(page.title)}</h1>
      <div class="page-meta">
        <span class="created">作成: ${createdDate}</span>
        <span class="updated">更新: ${updatedDate}</span>
      </div>
      <div class="page-body">
        ${content}
      </div>
    </article>

    ${relatedPages}
  </main>

  <script src="../assets/js/search.js"></script>
</body>
</html>`;
}

/**
 * インデックスページのHTMLを生成
 */
export function renderIndexPage(
  pages: CosensePage[],
  projectName: string
): string {
  // 更新日時でソート（新しい順）
  const sortedPages = [...pages].sort((a, b) => b.updated - a.updated);

  const pageList = sortedPages
    .map((page) => {
      const date = formatDate(page.updated);
      return `<li class="page-item">
        <a href="${getPageUrlFromIndex(page.title)}" class="page-link">${escapeHtml(page.title)}</a>
        <span class="page-date">${date}</span>
      </li>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(projectName)}</title>
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
  <header class="site-header">
    <nav class="header-nav">
      <a href="index.html" class="project-name">${escapeHtml(projectName)}</a>
      <div class="search-container">
        <input type="text" id="search-input" placeholder="検索..." class="search-input">
        <div id="search-results" class="search-results"></div>
      </div>
    </nav>
  </header>

  <main class="index-content">
    <h1 class="index-title">${escapeHtml(projectName)}</h1>
    <p class="page-count">${pages.length} ページ</p>
    <ul class="page-list">
      ${pageList}
    </ul>
  </main>

  <script src="assets/js/search.js"></script>
</body>
</html>`;
}
