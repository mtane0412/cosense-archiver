/**
 * Cosense JSONファイルのパーサー
 * エクスポート形式・インポート形式の両方に対応
 */
import * as fs from "fs/promises";
import type { CosenseJson } from "./types.js";

/**
 * JSON文字列をパースしてCosenseJsonオブジェクトを返す
 * @param jsonString - JSON文字列
 * @returns パースされたCosenseJsonオブジェクト
 * @throws JSON構文エラーまたはバリデーションエラー
 */
export function parseCosenseJson(jsonString: string): CosenseJson {
  const data = JSON.parse(jsonString);

  // バリデーション
  if (!("pages" in data)) {
    throw new Error("Invalid Cosense JSON: pages array is required");
  }

  if (!Array.isArray(data.pages)) {
    throw new Error("Invalid Cosense JSON: pages must be an array");
  }

  return data as CosenseJson;
}

/**
 * ファイルからCosense JSONを読み込む
 * @param filePath - JSONファイルのパス
 * @returns パースされたCosenseJsonオブジェクト
 */
export async function loadCosenseJson(filePath: string): Promise<CosenseJson> {
  const content = await fs.readFile(filePath, "utf-8");
  return parseCosenseJson(content);
}
