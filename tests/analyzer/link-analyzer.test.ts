/**
 * リンク解析のユニットテスト
 */
import { describe, it, expect } from "vitest";
import {
  buildLinkGraph,
  get1HopLinks,
  get2HopLinks,
  getBackLinks,
  type LinkGraph,
} from "../../src/analyzer/link-analyzer.js";
import type { CosensePage } from "../../src/parser/types.js";

const createPage = (
  title: string,
  lines: string[],
  id?: string
): CosensePage => ({
  title,
  created: Date.now(),
  updated: Date.now(),
  id,
  lines: [title, ...lines],
});

describe("buildLinkGraph", () => {
  it("ページ間のリンクグラフを構築できる", () => {
    const pages: CosensePage[] = [
      createPage("ページA", ["これは[ページB]へのリンク"]),
      createPage("ページB", ["これは[ページC]へのリンク"]),
      createPage("ページC", ["リンクなし"]),
    ];

    const graph = buildLinkGraph(pages);

    expect(graph.forwardLinks.get("ページA")).toContain("ページB");
    expect(graph.forwardLinks.get("ページB")).toContain("ページC");
    expect(graph.backLinks.get("ページB")).toContain("ページA");
    expect(graph.backLinks.get("ページC")).toContain("ページB");
  });

  it("複数リンクを正しく解析する", () => {
    const pages: CosensePage[] = [
      createPage("ページA", ["[ページB]と[ページC]へのリンク"]),
      createPage("ページB", []),
      createPage("ページC", []),
    ];

    const graph = buildLinkGraph(pages);

    const forwardLinks = graph.forwardLinks.get("ページA") || [];
    expect(forwardLinks).toContain("ページB");
    expect(forwardLinks).toContain("ページC");
  });

  it("ハッシュタグもリンクとして扱う", () => {
    const pages: CosensePage[] = [
      createPage("ページA", ["#タグ1"]),
      createPage("タグ1", ["タグページ"]),
    ];

    const graph = buildLinkGraph(pages);

    expect(graph.forwardLinks.get("ページA")).toContain("タグ1");
  });

  it("存在しないページへのリンクも記録する", () => {
    const pages: CosensePage[] = [
      createPage("ページA", ["[存在しないページ]へのリンク"]),
    ];

    const graph = buildLinkGraph(pages);

    expect(graph.forwardLinks.get("ページA")).toContain("存在しないページ");
  });

  it("リンクコンテキスト（前後のテキスト）を保存する", () => {
    const pages: CosensePage[] = [
      createPage("ページA", ["これは[ページB]へのリンクです"]),
      createPage("ページB", []),
    ];

    const graph = buildLinkGraph(pages);

    const contexts = graph.linkContexts.get("ページA")?.get("ページB");
    expect(contexts).toBeDefined();
    expect(contexts?.[0]).toContain("ページB");
  });
});

describe("get1HopLinks", () => {
  it("直接リンクしているページを取得できる", () => {
    const pages: CosensePage[] = [
      createPage("ページA", ["[ページB]と[ページC]"]),
      createPage("ページB", []),
      createPage("ページC", []),
    ];

    const graph = buildLinkGraph(pages);
    const oneHopLinks = get1HopLinks(graph, "ページA");

    expect(oneHopLinks.outgoing).toContain("ページB");
    expect(oneHopLinks.outgoing).toContain("ページC");
  });

  it("バックリンク（このページにリンクしているページ）を取得できる", () => {
    const pages: CosensePage[] = [
      createPage("ページA", ["[ページC]"]),
      createPage("ページB", ["[ページC]"]),
      createPage("ページC", []),
    ];

    const graph = buildLinkGraph(pages);
    const oneHopLinks = get1HopLinks(graph, "ページC");

    expect(oneHopLinks.incoming).toContain("ページA");
    expect(oneHopLinks.incoming).toContain("ページB");
  });
});

describe("get2HopLinks", () => {
  it("2ホップ先のページを取得できる", () => {
    const pages: CosensePage[] = [
      createPage("ページA", ["[ページB]"]),
      createPage("ページB", ["[ページC]"]),
      createPage("ページC", ["[ページD]"]),
      createPage("ページD", []),
    ];

    const graph = buildLinkGraph(pages);
    const twoHopLinks = get2HopLinks(graph, "ページA");

    // ページA -> ページB -> ページC
    expect(twoHopLinks).toContain("ページC");
    // ページDは3ホップ先なので含まれない
    expect(twoHopLinks).not.toContain("ページD");
  });

  it("1ホップ先のページは2ホップリンクに含まれない", () => {
    const pages: CosensePage[] = [
      createPage("ページA", ["[ページB]"]),
      createPage("ページB", ["[ページC]"]),
      createPage("ページC", []),
    ];

    const graph = buildLinkGraph(pages);
    const twoHopLinks = get2HopLinks(graph, "ページA");

    expect(twoHopLinks).not.toContain("ページB");
    expect(twoHopLinks).toContain("ページC");
  });

  it("自分自身は2ホップリンクに含まれない", () => {
    const pages: CosensePage[] = [
      createPage("ページA", ["[ページB]"]),
      createPage("ページB", ["[ページA]"]),
    ];

    const graph = buildLinkGraph(pages);
    const twoHopLinks = get2HopLinks(graph, "ページA");

    expect(twoHopLinks).not.toContain("ページA");
  });

  it("バックリンク経由の2ホップも取得できる", () => {
    const pages: CosensePage[] = [
      createPage("ページA", ["[ページC]"]),
      createPage("ページB", ["[ページC]"]),
      createPage("ページC", []),
    ];

    const graph = buildLinkGraph(pages);
    // ページC <- ページA, ページC <- ページB
    // ページCから見て、ページAとページBは1ホップ（バックリンク）
    // ページAから見て、ページCからのバックリンク経由でページBが2ホップ
    const twoHopLinks = get2HopLinks(graph, "ページA");

    // ページA -> ページC <- ページB
    expect(twoHopLinks).toContain("ページB");
  });
});

describe("getBackLinks", () => {
  it("バックリンクの一覧を取得できる", () => {
    const pages: CosensePage[] = [
      createPage("ページA", ["[ページC]"]),
      createPage("ページB", ["[ページC]"]),
      createPage("ページC", []),
    ];

    const graph = buildLinkGraph(pages);
    const backLinks = getBackLinks(graph, "ページC");

    expect(backLinks).toContain("ページA");
    expect(backLinks).toContain("ページB");
  });

  it("バックリンクがない場合は空配列を返す", () => {
    const pages: CosensePage[] = [createPage("ページA", [])];

    const graph = buildLinkGraph(pages);
    const backLinks = getBackLinks(graph, "ページA");

    expect(backLinks).toEqual([]);
  });
});
