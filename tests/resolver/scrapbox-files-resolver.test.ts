/**
 * Scrapbox Files URL解決モジュールのテスト
 * scrapbox.io/files/ 形式のURLを認証付きで解決する
 */
import { describe, test, expect } from "vitest";
import {
  isScrapboxFilesUrl,
  extractScrapboxFileId,
  resolveScrapboxFileUrl,
} from "../../src/resolver/scrapbox-files-resolver.js";

describe("scrapbox-files-resolver", () => {
  describe("isScrapboxFilesUrl", () => {
    test("scrapbox.io/files/ 形式のURLを正しく判定する", () => {
      expect(isScrapboxFilesUrl("https://scrapbox.io/files/674d619ff9bc2444b77ffbca.png")).toBe(true);
      expect(isScrapboxFilesUrl("https://scrapbox.io/files/674d619ff9bc2444b77ffbca")).toBe(true);
      expect(isScrapboxFilesUrl("http://scrapbox.io/files/abc123.jpg")).toBe(true);
    });

    test("Scrapbox Files URL以外はfalseを返す", () => {
      expect(isScrapboxFilesUrl("https://gyazo.com/abc123")).toBe(false);
      expect(isScrapboxFilesUrl("https://example.com/image.png")).toBe(false);
      expect(isScrapboxFilesUrl("https://scrapbox.io/project/page")).toBe(false);
      expect(isScrapboxFilesUrl("https://storage.googleapis.com/xxx")).toBe(false);
    });
  });

  describe("extractScrapboxFileId", () => {
    test("URLからファイルIDを抽出する", () => {
      expect(extractScrapboxFileId("https://scrapbox.io/files/674d619ff9bc2444b77ffbca.png")).toBe("674d619ff9bc2444b77ffbca");
      expect(extractScrapboxFileId("https://scrapbox.io/files/674d619ff9bc2444b77ffbca")).toBe("674d619ff9bc2444b77ffbca");
      expect(extractScrapboxFileId("http://scrapbox.io/files/abc123def456.jpg")).toBe("abc123def456");
    });

    test("Scrapbox Files URL以外はnullを返す", () => {
      expect(extractScrapboxFileId("https://gyazo.com/abc123")).toBe(null);
      expect(extractScrapboxFileId("https://example.com/image.png")).toBe(null);
    });
  });

  describe("resolveScrapboxFileUrl", () => {
    test("connect.sidなしの場合は元のURLをそのまま返す", async () => {
      const result = await resolveScrapboxFileUrl(
        "https://scrapbox.io/files/674d619ff9bc2444b77ffbca.png"
      );
      expect(result.success).toBe(false);
      expect(result.originalUrl).toBe("https://scrapbox.io/files/674d619ff9bc2444b77ffbca.png");
      expect(result.resolvedUrl).toBe("https://scrapbox.io/files/674d619ff9bc2444b77ffbca.png");
      expect(result.error).toContain("connect.sid");
    });

    test("無効なURLの場合はエラーを返す", async () => {
      const result = await resolveScrapboxFileUrl(
        "https://example.com/image.png",
        "dummy_connect_sid"
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("Scrapbox Files URL");
    });
  });
});
