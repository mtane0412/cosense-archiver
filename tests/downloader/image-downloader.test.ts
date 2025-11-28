/**
 * 画像ダウンローダーのユニットテスト
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  extractImageUrls,
  generateLocalPath,
  extractGyazoId,
  generateImageMappingsSync,
  type ImageMapping,
} from "../../src/downloader/image-downloader.js";
import type { CosensePage } from "../../src/parser/types.js";

const createPage = (title: string, lines: string[]): CosensePage => ({
  title,
  created: Date.now(),
  updated: Date.now(),
  lines: [title, ...lines],
});

describe("extractImageUrls", () => {
  it("Gyazo画像URLを抽出できる", () => {
    const pages: CosensePage[] = [
      createPage("ページ", ["[https://gyazo.com/abc123]"]),
    ];

    const urls = extractImageUrls(pages);

    expect(urls).toContain("https://gyazo.com/abc123");
  });

  it("i.gyazo.com形式のURLを抽出できる", () => {
    const pages: CosensePage[] = [
      createPage("ページ", ["[https://i.gyazo.com/abc123.png]"]),
    ];

    const urls = extractImageUrls(pages);

    expect(urls).toContain("https://i.gyazo.com/abc123.png");
  });

  it("画像拡張子のURLを抽出できる", () => {
    const pages: CosensePage[] = [
      createPage("ページ", [
        "[https://example.com/image.png]",
        "[https://example.com/photo.jpg]",
        "[https://example.com/anim.gif]",
      ]),
    ];

    const urls = extractImageUrls(pages);

    expect(urls).toContain("https://example.com/image.png");
    expect(urls).toContain("https://example.com/photo.jpg");
    expect(urls).toContain("https://example.com/anim.gif");
  });

  it("重複するURLは1つにまとめる", () => {
    const pages: CosensePage[] = [
      createPage("ページ1", ["[https://gyazo.com/abc123]"]),
      createPage("ページ2", ["[https://gyazo.com/abc123]"]),
    ];

    const urls = extractImageUrls(pages);

    expect(urls.filter((url) => url === "https://gyazo.com/abc123")).toHaveLength(
      1
    );
  });

  it("画像以外のURLは抽出しない", () => {
    const pages: CosensePage[] = [
      createPage("ページ", ["[https://example.com]"]),
    ];

    const urls = extractImageUrls(pages);

    expect(urls).not.toContain("https://example.com");
  });
});

describe("extractGyazoId", () => {
  it("gyazo.comのURLからIDを抽出できる", () => {
    expect(extractGyazoId("https://gyazo.com/abc123")).toBe("abc123");
  });

  it("i.gyazo.comのURLからIDを抽出できる", () => {
    expect(extractGyazoId("https://i.gyazo.com/abc123.png")).toBe("abc123");
  });

  it("i.gyazo.comのGIF URLからIDを抽出できる", () => {
    expect(extractGyazoId("https://i.gyazo.com/abc123.gif")).toBe("abc123");
  });

  it("Gyazo以外のURLはnullを返す", () => {
    expect(extractGyazoId("https://example.com/abc123.png")).toBeNull();
  });
});

describe("generateLocalPath", () => {
  it("GyazoURLからローカルパスを生成できる（デフォルトpng）", () => {
    const url = "https://gyazo.com/abc123";
    const localPath = generateLocalPath(url);

    expect(localPath).toBe("images/gyazo-abc123.png");
  });

  it("Gyazo URLで拡張子を指定できる", () => {
    const url = "https://gyazo.com/abc123";
    const localPath = generateLocalPath(url, "gif");

    expect(localPath).toBe("images/gyazo-abc123.gif");
  });

  it("i.gyazo.comのURLからローカルパスを生成できる", () => {
    const url = "https://i.gyazo.com/abc123.png";
    const localPath = generateLocalPath(url);

    expect(localPath).toBe("images/gyazo-abc123.png");
  });

  it("通常の画像URLからローカルパスを生成できる", () => {
    const url = "https://example.com/path/to/image.jpg";
    const localPath = generateLocalPath(url);

    // ハッシュベースのファイル名
    expect(localPath).toMatch(/^images\/[a-f0-9]+\.jpg$/);
  });

  it("拡張子がない場合はpngを使用する", () => {
    const url = "https://gyazo.com/abc123";
    const localPath = generateLocalPath(url);

    expect(localPath.endsWith(".png")).toBe(true);
  });
});

describe("generateImageMappingsSync", () => {
  it("URLリストからマッピングを生成できる", () => {
    const urls = [
      "https://gyazo.com/abc123",
      "https://example.com/image.jpg",
    ];
    const mappings = generateImageMappingsSync(urls);

    expect(mappings).toHaveLength(2);
    expect(mappings[0].originalUrl).toBe("https://gyazo.com/abc123");
    expect(mappings[0].localPath).toBe("images/gyazo-abc123.png");
    expect(mappings[1].originalUrl).toBe("https://example.com/image.jpg");
    expect(mappings[1].localPath).toMatch(/^images\/[a-f0-9]+\.jpg$/);
  });
});
