/**
 * Gyazo URL解決のユニットテスト
 */
import { describe, it, expect } from "vitest";
import {
  isGyazoUrl,
  extractGyazoId,
  createGyazoFallbackLink,
} from "../../src/resolver/gyazo-resolver.js";

describe("isGyazoUrl", () => {
  it("Gyazo URLを正しく判定する", () => {
    expect(isGyazoUrl("https://gyazo.com/abc123")).toBe(true);
    expect(isGyazoUrl("https://i.gyazo.com/abc123.png")).toBe(true);
    expect(isGyazoUrl("http://gyazo.com/abc123")).toBe(true);
  });

  it("Gyazo以外のURLはfalseを返す", () => {
    expect(isGyazoUrl("https://example.com/image.png")).toBe(false);
    expect(isGyazoUrl("https://imgur.com/abc123")).toBe(false);
    expect(isGyazoUrl("https://gyazo.example.com/abc")).toBe(false);
  });
});

describe("extractGyazoId", () => {
  it("GyazoのURLからIDを抽出する", () => {
    expect(extractGyazoId("https://gyazo.com/abc123")).toBe("abc123");
    expect(extractGyazoId("https://i.gyazo.com/xyz789.png")).toBe("xyz789");
    expect(extractGyazoId("https://gyazo.com/ABC123XYZ")).toBe("ABC123XYZ");
  });

  it("Gyazo以外のURLはnullを返す", () => {
    expect(extractGyazoId("https://example.com/abc123")).toBe(null);
    expect(extractGyazoId("https://imgur.com/abc123")).toBe(null);
  });
});

describe("createGyazoFallbackLink", () => {
  it("Gyazoリンクを生成する", () => {
    const link = createGyazoFallbackLink("https://gyazo.com/abc123");
    expect(link).toContain("Gyazo");
    expect(link).toContain('href="https://gyazo.com/abc123"');
    expect(link).toContain("gyazo-link");
    expect(link).toContain('target="_blank"');
  });
});
