/**
 * HTML生成のユニットテスト
 */
import { describe, it, expect } from "vitest";
import {
  renderLine,
  renderPage,
  generatePageFilename,
} from "../../src/generator/html-generator.js";
import type { CosensePage } from "../../src/parser/types.js";
import type { LinkGraph } from "../../src/analyzer/link-analyzer.js";

const createPage = (title: string, lines: string[]): CosensePage => ({
  title,
  created: Date.now(),
  updated: Date.now(),
  lines: [title, ...lines],
});

const createEmptyLinkGraph = (): LinkGraph => ({
  forwardLinks: new Map(),
  backLinks: new Map(),
  linkContexts: new Map(),
  existingPages: new Set(),
});

describe("renderLine", () => {
  it("プレーンテキストをレンダリングできる", () => {
    const html = renderLine("単純なテキスト");
    expect(html).toContain("単純なテキスト");
  });

  it("内部リンクをHTMLリンクに変換する", () => {
    const html = renderLine("[テストページ]", new Set(["テストページ"]));
    expect(html).toContain('<a href="');
    expect(html).toContain("テストページ");
    expect(html).toContain("internal-link");
  });

  it("存在しないページへのリンクに別のスタイルを適用する", () => {
    const html = renderLine("[存在しないページ]", new Set());
    expect(html).toContain("missing-link");
  });

  it("外部リンクをHTMLリンクに変換する", () => {
    const html = renderLine("[https://example.com サンプル]");
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("サンプル");
    expect(html).toContain("external-link");
  });

  it("画像を img タグに変換する", () => {
    const html = renderLine("[https://gyazo.com/abc123]");
    expect(html).toContain("<img");
    expect(html).toContain("gyazo.com/abc123");
  });

  it("ハッシュタグをリンクに変換する", () => {
    const html = renderLine("#タグ", new Set(["タグ"]));
    expect(html).toContain('<a href="');
    expect(html).toContain("hashtag");
  });

  it("太字を strong タグに変換する", () => {
    const html = renderLine("[* 太字テスト]");
    expect(html).toContain("<strong");
    expect(html).toContain("太字テスト");
  });

  it("二重括弧太字を strong タグに変換する", () => {
    const html = renderLine("[[強調]]");
    expect(html).toContain("<strong");
    expect(html).toContain("強調");
  });

  it("斜体を em タグに変換する", () => {
    const html = renderLine("[/ 斜体]");
    expect(html).toContain("<em");
    expect(html).toContain("斜体");
  });

  it("打消し線を del タグに変換する", () => {
    const html = renderLine("[- 削除]");
    expect(html).toContain("<del");
    expect(html).toContain("削除");
  });

  it("インラインコードを code タグに変換する", () => {
    const html = renderLine("`console.log()`");
    expect(html).toContain("<code");
    expect(html).toContain("console.log()");
  });

  it("インデントを適切にレンダリングする", () => {
    const html = renderLine("  インデントされた行");
    expect(html).toContain("indent-2");
  });

  it("インデントがある行には黒丸（•）を追加する", () => {
    const html = renderLine(" インデント1");
    expect(html).toContain("•");
    expect(html).toContain('<span class="bullet">•</span>');
    expect(html).toContain("インデント1");
  });

  it("インデントが深い行にも黒丸を追加する", () => {
    const html = renderLine("   インデント3");
    expect(html).toContain('<span class="bullet">•</span>');
    expect(html).toContain("indent-3");
  });

  it("インデントがない行には黒丸を追加しない", () => {
    const html = renderLine("通常の行");
    expect(html).not.toContain("•");
    expect(html).not.toContain("bullet");
  });
});

describe("generatePageFilename", () => {
  it("ページタイトルからファイル名を生成する", () => {
    const filename = generatePageFilename("テストページ");
    expect(filename).toMatch(/\.html$/);
  });

  it("特殊文字をエンコードする", () => {
    const filename = generatePageFilename("Test/Page");
    expect(filename).not.toContain("/");
  });

  it("空白を含むタイトルでもファイル名を生成できる", () => {
    const filename = generatePageFilename("Test Page");
    expect(filename).toBe("Test Page.html");
  });
});

describe("renderPage", () => {
  it("ページ全体のHTMLを生成する", () => {
    const page = createPage("テストページ", ["本文1行目", "本文2行目"]);
    const linkGraph = createEmptyLinkGraph();

    const html = renderPage(page, linkGraph, "テストプロジェクト");

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("テストページ");
    expect(html).toContain("本文1行目");
    expect(html).toContain("本文2行目");
  });

  it("プロジェクト名をタイトルに含める", () => {
    const page = createPage("ページ", []);
    const linkGraph = createEmptyLinkGraph();

    const html = renderPage(page, linkGraph, "マイプロジェクト");

    expect(html).toContain("マイプロジェクト");
  });

  it("1hopリンクセクションを含める", () => {
    const page = createPage("ページA", ["[ページB]"]);
    const linkGraph: LinkGraph = {
      forwardLinks: new Map([["ページA", new Set(["ページB"])]]),
      backLinks: new Map([["ページB", new Set(["ページA"])]]),
      linkContexts: new Map(),
      existingPages: new Set(["ページA", "ページB"]),
    };

    const html = renderPage(page, linkGraph, "プロジェクト");

    expect(html).toContain("related-pages");
  });
});
