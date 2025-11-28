/**
 * 型定義のユニットテスト
 */
import { describe, it, expect } from "vitest";
import {
  isCosenseExport,
  isLineWithTelomere,
  getLineText,
  type CosenseExport,
  type CosenseImport,
  type CosenseLine,
} from "../../src/parser/types.js";

describe("isCosenseExport", () => {
  it("エクスポート形式の場合trueを返す", () => {
    const exportData: CosenseExport = {
      name: "test-project",
      displayName: "テストプロジェクト",
      exported: 1700000000,
      pages: [],
    };
    expect(isCosenseExport(exportData)).toBe(true);
  });

  it("インポート形式の場合falseを返す", () => {
    const importData: CosenseImport = {
      pages: [],
    };
    expect(isCosenseExport(importData)).toBe(false);
  });
});

describe("isLineWithTelomere", () => {
  it("テロメア情報付きオブジェクトの場合trueを返す", () => {
    const line: CosenseLine = {
      text: "テスト行",
      created: 1700000000,
      updated: 1700000001,
    };
    expect(isLineWithTelomere(line)).toBe(true);
  });

  it("文字列の場合falseを返す", () => {
    const line: CosenseLine = "テスト行";
    expect(isLineWithTelomere(line)).toBe(false);
  });
});

describe("getLineText", () => {
  it("文字列の場合そのまま返す", () => {
    const line: CosenseLine = "テスト行";
    expect(getLineText(line)).toBe("テスト行");
  });

  it("テロメア情報付きオブジェクトの場合textを返す", () => {
    const line: CosenseLine = {
      text: "テスト行",
      created: 1700000000,
      updated: 1700000001,
    };
    expect(getLineText(line)).toBe("テスト行");
  });

  it("空文字列を正しく処理する", () => {
    expect(getLineText("")).toBe("");
  });
});
