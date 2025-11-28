/**
 * 検索インデックス生成モジュール
 * ページ内容からプレーンテキストを抽出し、検索可能なインデックスを作成
 */
import type { CosensePage } from "../parser/types.js";
import { parseLines } from "../parser/line-parser.js";
import { getLineText } from "../parser/types.js";
import type { ParsedNode } from "../parser/line-types.js";

/**
 * 検索インデックスのページエントリ
 */
export interface SearchIndexEntry {
  title: string;
  content: string; // プレーンテキスト化された本文
  created: number;
  updated: number;
}

/**
 * 検索インデックス全体
 */
export interface SearchIndex {
  pages: SearchIndexEntry[];
}

/**
 * 検索結果の1件
 */
export interface SearchResult {
  title: string;
  content: string;
  snippet: string;
  matchType: "title" | "content";
  score: number;
}

/**
 * ノードからプレーンテキストを抽出する（再帰的）
 */
function extractTextFromNode(node: ParsedNode): string {
  switch (node.type) {
    case "text":
      return node.text;
    case "internal-link":
      return node.title;
    case "external-link":
      return node.title;
    case "external-project-link":
      return node.page;
    case "image":
      return ""; // 画像はテキストなし
    case "icon":
      return ""; // アイコンはテキストなし
    case "hashtag":
      return node.tag;
    case "bold":
    case "italic":
    case "strikethrough":
    case "underline":
      return node.children.map(extractTextFromNode).join("");
    case "code":
      return node.code;
    case "math":
      return node.formula;
    default:
      return "";
  }
}

/**
 * ページからプレーンテキストを抽出する
 */
function extractPlainText(page: CosensePage): string {
  const lines = page.lines.map(getLineText);
  const parsedLines = parseLines(lines);

  const textLines: string[] = [];

  for (const parsedLine of parsedLines) {
    if (parsedLine.isCodeBlockContent) {
      // コードブロック内はそのままテキストとして含める
      const text = parsedLine.nodes.map(extractTextFromNode).join("");
      textLines.push(text);
    } else {
      const text = parsedLine.nodes.map(extractTextFromNode).join("");
      textLines.push(text);
    }
  }

  return textLines.join("\n");
}

/**
 * ページ配列から検索インデックスを構築する
 */
export function buildSearchIndex(pages: CosensePage[]): SearchIndex {
  const entries: SearchIndexEntry[] = pages.map((page) => ({
    title: page.title,
    content: extractPlainText(page),
    created: page.created,
    updated: page.updated,
  }));

  return { pages: entries };
}

/**
 * スニペットを生成する（マッチ箇所の前後を含む）
 */
function createSnippet(
  content: string,
  query: string,
  maxLength: number = 100
): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);

  if (index === -1) {
    // マッチしない場合は先頭から
    return content.slice(0, maxLength) + (content.length > maxLength ? "..." : "");
  }

  // マッチ箇所の前後を含める
  const start = Math.max(0, index - 30);
  const end = Math.min(content.length, index + query.length + 70);

  let snippet = content.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";

  return snippet;
}

/**
 * 検索を実行する
 */
export function search(index: SearchIndex, query: string): SearchResult[] {
  if (!query.trim()) {
    return [];
  }

  // 複数キーワードに分割（スペース区切り）
  const keywords = query
    .trim()
    .split(/\s+/)
    .filter((k) => k.length > 0);

  const results: SearchResult[] = [];

  for (const entry of index.pages) {
    const lowerTitle = entry.title.toLowerCase();
    const lowerContent = entry.content.toLowerCase();

    // すべてのキーワードがタイトルか本文に含まれているかチェック
    const allMatch = keywords.every((keyword) => {
      const lowerKeyword = keyword.toLowerCase();
      return (
        lowerTitle.includes(lowerKeyword) || lowerContent.includes(lowerKeyword)
      );
    });

    if (!allMatch) {
      continue;
    }

    // タイトル一致かどうかを判定（最初のキーワードで判定）
    const firstKeyword = keywords[0].toLowerCase();
    const titleMatch = lowerTitle.includes(firstKeyword);

    // スコア計算
    let score = 0;
    if (titleMatch) {
      score += 100;
      // タイトルが完全一致ならさらに高スコア
      if (lowerTitle === query.toLowerCase()) {
        score += 50;
      }
    }
    // 本文での一致数でスコア加算
    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      const contentMatches = (
        lowerContent.match(new RegExp(escapeRegExp(lowerKeyword), "gi")) || []
      ).length;
      score += contentMatches * 10;
    }

    results.push({
      title: entry.title,
      content: entry.content,
      snippet: createSnippet(entry.content, keywords[0]),
      matchType: titleMatch ? "title" : "content",
      score,
    });
  }

  // スコアでソート（降順）
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * 正規表現の特殊文字をエスケープ
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 検索インデックスをJSON文字列に変換する
 */
export function serializeSearchIndex(index: SearchIndex): string {
  return JSON.stringify(index);
}
