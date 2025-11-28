/**
 * 検索インデックス生成のユニットテスト
 */
import { describe, it, expect } from "vitest";
import {
  buildSearchIndex,
  search,
  type SearchIndex,
  type SearchResult,
} from "../../src/analyzer/search-index.js";
import type { CosensePage } from "../../src/parser/types.js";

const createPage = (
  title: string,
  lines: string[],
  options: { created?: number; updated?: number } = {}
): CosensePage => ({
  title,
  created: options.created || Date.now(),
  updated: options.updated || Date.now(),
  lines: [title, ...lines],
});

describe("buildSearchIndex", () => {
  it("ページの検索インデックスを構築できる", () => {
    const pages: CosensePage[] = [
      createPage("テストページ", ["これはテスト内容です"]),
      createPage("サンプル", ["サンプルの本文"]),
    ];

    const index = buildSearchIndex(pages);

    expect(index.pages).toHaveLength(2);
    expect(index.pages[0].title).toBe("テストページ");
    expect(index.pages[0].content).toContain("テスト内容");
  });

  it("Cosense記法を除去してプレーンテキストを抽出する", () => {
    const pages: CosensePage[] = [
      createPage("ページ", [
        "[リンク]と#タグと`コード`を含む行",
        "[* 太字]と[/ 斜体]の装飾",
      ]),
    ];

    const index = buildSearchIndex(pages);
    const content = index.pages[0].content;

    // リンクやタグのテキストは残るが、記法の記号は除去される
    expect(content).toContain("リンク");
    expect(content).toContain("タグ");
    expect(content).toContain("コード");
    expect(content).toContain("太字");
    expect(content).toContain("斜体");
  });

  it("作成日時と更新日時を含む", () => {
    const pages: CosensePage[] = [
      createPage("ページ", ["内容"], {
        created: 1700000000,
        updated: 1700000001,
      }),
    ];

    const index = buildSearchIndex(pages);

    expect(index.pages[0].created).toBe(1700000000);
    expect(index.pages[0].updated).toBe(1700000001);
  });
});

describe("search", () => {
  it("タイトルに一致するページを検索できる", () => {
    const pages: CosensePage[] = [
      createPage("TypeScript入門", ["プログラミング言語"]),
      createPage("JavaScript基礎", ["Webの言語"]),
      createPage("Python入門", ["機械学習に人気"]),
    ];

    const index = buildSearchIndex(pages);
    const results = search(index, "入門");

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.title)).toContain("TypeScript入門");
    expect(results.map((r) => r.title)).toContain("Python入門");
  });

  it("本文に一致するページを検索できる", () => {
    const pages: CosensePage[] = [
      createPage("ページA", ["これはTypeScriptの説明"]),
      createPage("ページB", ["これはPythonの説明"]),
    ];

    const index = buildSearchIndex(pages);
    const results = search(index, "TypeScript");

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("ページA");
  });

  it("タイトル一致を本文一致より優先する", () => {
    const pages: CosensePage[] = [
      createPage("JavaScript", ["基本的な言語"]),
      createPage("プログラミング", ["JavaScriptを使う"]),
    ];

    const index = buildSearchIndex(pages);
    const results = search(index, "JavaScript");

    expect(results[0].title).toBe("JavaScript");
    expect(results[0].matchType).toBe("title");
  });

  it("検索結果にスニペットを含む", () => {
    const pages: CosensePage[] = [
      createPage("ページ", ["これはテストの行です。重要な内容が含まれています。"]),
    ];

    const index = buildSearchIndex(pages);
    const results = search(index, "テスト");

    expect(results[0].snippet).toBeDefined();
    expect(results[0].snippet).toContain("テスト");
  });

  it("大文字小文字を区別しない検索ができる", () => {
    const pages: CosensePage[] = [
      createPage("TypeScript", ["TYPESCRIPT and typescript"]),
    ];

    const index = buildSearchIndex(pages);
    const results = search(index, "typescript");

    expect(results).toHaveLength(1);
  });

  it("検索結果がない場合は空配列を返す", () => {
    const pages: CosensePage[] = [createPage("ページ", ["内容"])];

    const index = buildSearchIndex(pages);
    const results = search(index, "存在しないキーワード");

    expect(results).toEqual([]);
  });

  it("複数キーワードでAND検索ができる", () => {
    const pages: CosensePage[] = [
      createPage("TypeScript入門", ["基本的な型の使い方"]),
      createPage("JavaScript入門", ["動的型付け言語"]),
      createPage("型の基礎", ["静的型付けについて"]),
    ];

    const index = buildSearchIndex(pages);
    const results = search(index, "入門 型");

    // 「入門」と「型」の両方を含むページ
    expect(results.length).toBeGreaterThanOrEqual(1);
    results.forEach((result) => {
      const fullText = result.title + result.content;
      expect(fullText.toLowerCase()).toContain("入門");
      expect(fullText.toLowerCase()).toContain("型");
    });
  });
});
