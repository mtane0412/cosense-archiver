/**
 * Cosense(旧Scrapbox)のJSONエクスポートフォーマットの型定義
 * 実際のエクスポートデータ構造に基づいて定義
 */

/**
 * ユーザー情報
 */
export interface CosenseUser {
  id: string;
  name: string;
  displayName: string;
  email: string;
}

/**
 * 行データ（テロメア情報付き）
 */
export interface CosenseLineWithTelomere {
  text: string;
  created: number;
  updated: number;
}

/**
 * 行データ（文字列または詳細オブジェクト）
 */
export type CosenseLine = string | CosenseLineWithTelomere;

/**
 * ページデータ
 */
export interface CosensePage {
  title: string;
  created: number;
  updated: number;
  id?: string;
  views?: number;
  lines: CosenseLine[];
}

/**
 * エクスポートされたJSONのルート構造
 */
export interface CosenseExport {
  name: string;
  displayName: string;
  exported: number;
  users?: CosenseUser[];
  pages: CosensePage[];
}

/**
 * インポート用JSON（簡略形式）
 */
export interface CosenseImport {
  pages: CosensePage[];
}

/**
 * JSONデータ（エクスポート形式またはインポート形式）
 */
export type CosenseJson = CosenseExport | CosenseImport;

/**
 * CosenseJsonがエクスポート形式かどうかを判定
 */
export function isCosenseExport(json: CosenseJson): json is CosenseExport {
  return "name" in json && "displayName" in json;
}

/**
 * 行がテロメア情報付きかどうかを判定
 */
export function isLineWithTelomere(
  line: CosenseLine
): line is CosenseLineWithTelomere {
  return typeof line === "object" && "text" in line;
}

/**
 * 行のテキストを取得（文字列/オブジェクトどちらでも対応）
 */
export function getLineText(line: CosenseLine): string {
  return isLineWithTelomere(line) ? line.text : line;
}
