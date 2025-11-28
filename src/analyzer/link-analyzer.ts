/**
 * リンク解析モジュール
 * ページ間のリンクグラフを構築し、1hop/2hopリンクを計算する
 */
import type { CosensePage } from "../parser/types.js";
import { parseLines } from "../parser/line-parser.js";
import { getLineText } from "../parser/types.js";

/**
 * リンクグラフの型定義
 */
export interface LinkGraph {
  /** 順方向リンク: ページタイトル -> リンク先ページタイトルのセット */
  forwardLinks: Map<string, Set<string>>;
  /** 逆方向リンク（バックリンク）: ページタイトル -> リンク元ページタイトルのセット */
  backLinks: Map<string, Set<string>>;
  /** リンクコンテキスト: ページタイトル -> (リンク先タイトル -> コンテキスト行の配列) */
  linkContexts: Map<string, Map<string, string[]>>;
  /** 存在するページタイトルのセット */
  existingPages: Set<string>;
}

/**
 * 1ホップリンクの結果
 */
export interface OneHopLinks {
  /** このページからリンクしているページ */
  outgoing: string[];
  /** このページにリンクしているページ（バックリンク） */
  incoming: string[];
}

/**
 * ページの内容からリンクを抽出する
 */
function extractLinks(page: CosensePage): Map<string, string[]> {
  const links = new Map<string, string[]>();
  const lines = page.lines.map(getLineText);
  const parsedLines = parseLines(lines);

  for (let i = 0; i < parsedLines.length; i++) {
    const parsedLine = parsedLines[i];
    const originalLine = lines[i];

    for (const node of parsedLine.nodes) {
      let linkTarget: string | null = null;

      if (node.type === "internal-link") {
        linkTarget = node.title;
      } else if (node.type === "hashtag") {
        linkTarget = node.tag;
      }

      if (linkTarget) {
        if (!links.has(linkTarget)) {
          links.set(linkTarget, []);
        }
        links.get(linkTarget)!.push(originalLine);
      }
    }
  }

  return links;
}

/**
 * ページ配列からリンクグラフを構築する
 */
export function buildLinkGraph(pages: CosensePage[]): LinkGraph {
  const forwardLinks = new Map<string, Set<string>>();
  const backLinks = new Map<string, Set<string>>();
  const linkContexts = new Map<string, Map<string, string[]>>();
  const existingPages = new Set<string>();

  // 存在するページを登録
  for (const page of pages) {
    existingPages.add(page.title);
    forwardLinks.set(page.title, new Set());
    backLinks.set(page.title, new Set());
    linkContexts.set(page.title, new Map());
  }

  // リンクを解析
  for (const page of pages) {
    const pageLinks = extractLinks(page);

    for (const [target, contexts] of pageLinks) {
      // 順方向リンク
      forwardLinks.get(page.title)!.add(target);

      // 逆方向リンク（バックリンク）
      if (!backLinks.has(target)) {
        backLinks.set(target, new Set());
      }
      backLinks.get(target)!.add(page.title);

      // コンテキスト
      const pageContexts = linkContexts.get(page.title)!;
      if (!pageContexts.has(target)) {
        pageContexts.set(target, []);
      }
      pageContexts.get(target)!.push(...contexts);
    }
  }

  return { forwardLinks, backLinks, linkContexts, existingPages };
}

/**
 * 指定ページの1ホップリンクを取得する
 */
export function get1HopLinks(graph: LinkGraph, pageTitle: string): OneHopLinks {
  const outgoing = Array.from(graph.forwardLinks.get(pageTitle) || []);
  const incoming = Array.from(graph.backLinks.get(pageTitle) || []);

  return { outgoing, incoming };
}

/**
 * 指定ページの2ホップリンクを取得する
 * 1ホップ先のページからさらにリンクされているページ（自分と1ホップ先を除く）
 */
export function get2HopLinks(graph: LinkGraph, pageTitle: string): string[] {
  const oneHop = get1HopLinks(graph, pageTitle);
  const oneHopSet = new Set([
    ...oneHop.outgoing,
    ...oneHop.incoming,
    pageTitle,
  ]);

  const twoHopSet = new Set<string>();

  // 順方向リンク経由
  for (const oneHopPage of oneHop.outgoing) {
    // 1ホップ先からの順方向リンク
    const forwardFromOneHop = graph.forwardLinks.get(oneHopPage) || new Set();
    for (const target of forwardFromOneHop) {
      if (!oneHopSet.has(target)) {
        twoHopSet.add(target);
      }
    }

    // 1ホップ先へのバックリンク（同じページにリンクしている他のページ）
    const backToOneHop = graph.backLinks.get(oneHopPage) || new Set();
    for (const source of backToOneHop) {
      if (!oneHopSet.has(source)) {
        twoHopSet.add(source);
      }
    }
  }

  // バックリンク経由
  for (const oneHopPage of oneHop.incoming) {
    // バックリンク元からの順方向リンク
    const forwardFromBacklink = graph.forwardLinks.get(oneHopPage) || new Set();
    for (const target of forwardFromBacklink) {
      if (!oneHopSet.has(target)) {
        twoHopSet.add(target);
      }
    }

    // バックリンク元へのバックリンク
    const backToBacklink = graph.backLinks.get(oneHopPage) || new Set();
    for (const source of backToBacklink) {
      if (!oneHopSet.has(source)) {
        twoHopSet.add(source);
      }
    }
  }

  return Array.from(twoHopSet);
}

/**
 * 指定ページのバックリンク一覧を取得する
 */
export function getBackLinks(graph: LinkGraph, pageTitle: string): string[] {
  return Array.from(graph.backLinks.get(pageTitle) || []);
}

/**
 * リンクのコンテキスト（前後のテキスト）を取得する
 */
export function getLinkContext(
  graph: LinkGraph,
  fromPage: string,
  toPage: string
): string[] {
  return graph.linkContexts.get(fromPage)?.get(toPage) || [];
}
