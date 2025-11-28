/**
 * JSONパーサーのユニットテスト
 */
import { describe, it, expect } from "vitest";
import { parseCosenseJson, loadCosenseJson } from "../../src/parser/json-parser.js";
import { isCosenseExport } from "../../src/parser/types.js";
import * as path from "path";
import * as fs from "fs/promises";
import * as os from "os";

describe("parseCosenseJson", () => {
  it("エクスポート形式のJSONをパースできる", () => {
    const jsonString = JSON.stringify({
      name: "test-project",
      displayName: "テストプロジェクト",
      exported: 1700000000,
      users: [
        {
          id: "user1",
          name: "testuser",
          displayName: "テストユーザー",
          email: "test@example.com",
        },
      ],
      pages: [
        {
          title: "テストページ",
          created: 1700000000,
          updated: 1700000001,
          id: "page1",
          views: 10,
          lines: ["テストページ", "本文1行目", "本文2行目"],
        },
      ],
    });

    const result = parseCosenseJson(jsonString);

    expect(isCosenseExport(result)).toBe(true);
    if (isCosenseExport(result)) {
      expect(result.name).toBe("test-project");
      expect(result.displayName).toBe("テストプロジェクト");
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].title).toBe("テストページ");
    }
  });

  it("インポート形式のJSONをパースできる", () => {
    const jsonString = JSON.stringify({
      pages: [
        {
          title: "ページ1",
          lines: ["ページ1", "内容"],
        },
      ],
    });

    const result = parseCosenseJson(jsonString);

    expect(isCosenseExport(result)).toBe(false);
    expect(result.pages).toHaveLength(1);
  });

  it("テロメア情報付きのlinesをパースできる", () => {
    const jsonString = JSON.stringify({
      pages: [
        {
          title: "テロメアテスト",
          created: 1700000000,
          updated: 1700000001,
          lines: [
            { text: "テロメアテスト", created: 1700000000, updated: 1700000001 },
            { text: "行2", created: 1700000002, updated: 1700000003 },
          ],
        },
      ],
    });

    const result = parseCosenseJson(jsonString);
    const firstLine = result.pages[0].lines[0];

    expect(typeof firstLine).toBe("object");
    if (typeof firstLine === "object") {
      expect(firstLine.text).toBe("テロメアテスト");
    }
  });

  it("不正なJSONの場合エラーをスローする", () => {
    expect(() => parseCosenseJson("{ invalid json }")).toThrow();
  });

  it("pagesがない場合エラーをスローする", () => {
    expect(() => parseCosenseJson(JSON.stringify({ name: "test" }))).toThrow(
      "Invalid Cosense JSON: pages array is required"
    );
  });

  it("pagesが配列でない場合エラーをスローする", () => {
    expect(() => parseCosenseJson(JSON.stringify({ pages: "not an array" }))).toThrow(
      "Invalid Cosense JSON: pages must be an array"
    );
  });
});

describe("loadCosenseJson", () => {
  it("ファイルからJSONを読み込める", async () => {
    // 一時ファイルを作成
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `test-cosense-${Date.now()}.json`);

    const testData = {
      name: "file-test",
      displayName: "ファイルテスト",
      exported: 1700000000,
      pages: [
        {
          title: "ファイルからのテスト",
          created: 1700000000,
          updated: 1700000001,
          lines: ["ファイルからのテスト", "内容"],
        },
      ],
    };

    await fs.writeFile(tempFile, JSON.stringify(testData), "utf-8");

    try {
      const result = await loadCosenseJson(tempFile);

      expect(isCosenseExport(result)).toBe(true);
      if (isCosenseExport(result)) {
        expect(result.name).toBe("file-test");
      }
    } finally {
      // クリーンアップ
      await fs.unlink(tempFile);
    }
  });

  it("存在しないファイルの場合エラーをスローする", async () => {
    await expect(loadCosenseJson("/non/existent/file.json")).rejects.toThrow();
  });
});
