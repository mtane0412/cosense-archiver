/**
 * 画像ダウンロードモジュール
 * ページ内の画像URLを抽出し、ローカルにダウンロードする
 * Gyazo画像はGyazo APIを使用して正確な拡張子で取得する
 * Scrapbox Files URLはconnect.sid Cookieを使用して認証付きでダウンロードする
 */
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import type { CosensePage } from "../parser/types.js";
import { parseLines } from "../parser/line-parser.js";
import { getLineText } from "../parser/types.js";
import {
  isScrapboxFilesUrl,
  extractScrapboxFileId,
  getScrapboxFileExtension,
  resolveScrapboxFileUrl,
} from "../resolver/scrapbox-files-resolver.js";

/**
 * 画像URLとローカルパスのマッピング
 */
export interface ImageMapping {
  originalUrl: string;
  localPath: string;
}

/**
 * ダウンロード結果
 */
export interface DownloadResult {
  url: string;
  localPath: string;
  success: boolean;
  error?: string;
}

/**
 * Gyazo APIからのレスポンス
 */
export interface GyazoImageInfo {
  image_id: string;
  permalink_url: string;
  thumb_url: string;
  url: string;
  type: string; // "png", "jpg", "gif" など
  created_at: string;
}

// Gyazoドメインパターン（URLからimage_idを抽出）
const GYAZO_PATTERN = /^https?:\/\/(i\.)?gyazo\.com\/([a-zA-Z0-9]+)(\.[a-z]+)?$/;
// 画像拡張子
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"];
// Gyazo APIエンドポイント
const GYAZO_API_ENDPOINT = "https://api.gyazo.com/api/images";

/**
 * ページ配列から画像URLを抽出する
 */
export function extractImageUrls(pages: CosensePage[]): string[] {
  const urls = new Set<string>();

  for (const page of pages) {
    const lines = page.lines.map(getLineText);
    const parsedLines = parseLines(lines);

    for (const parsedLine of parsedLines) {
      for (const node of parsedLine.nodes) {
        if (node.type === "image") {
          urls.add(node.url);
        }
      }
    }
  }

  return Array.from(urls);
}

/**
 * URLの拡張子を取得する
 */
function getExtension(url: string): string {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  if (match && IMAGE_EXTENSIONS.includes(match[1].toLowerCase())) {
    return match[1].toLowerCase();
  }
  return "png"; // デフォルト
}

/**
 * URLからGyazo画像IDを抽出する
 * @returns image_id または null（Gyazo URLでない場合）
 */
export function extractGyazoId(url: string): string | null {
  const match = url.match(GYAZO_PATTERN);
  return match ? match[2] : null;
}

/**
 * Gyazo APIを使用して画像情報を取得する
 * @param imageId Gyazo画像ID
 * @param accessToken Gyazo APIアクセストークン
 */
export async function fetchGyazoImageInfo(
  imageId: string,
  accessToken: string
): Promise<GyazoImageInfo> {
  const response = await fetch(`${GYAZO_API_ENDPOINT}/${imageId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Gyazo API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<GyazoImageInfo>;
}

/**
 * URLからローカルパスを生成する（拡張子はデフォルト値）
 * Gyazo画像の場合、実際の拡張子はAPI経由で取得後に決定される
 * Scrapbox Files URLの場合、ファイルIDをベースにしたパスを生成
 */
export function generateLocalPath(url: string, extension?: string): string {
  // Gyazo URLの場合
  const gyazoId = extractGyazoId(url);
  if (gyazoId) {
    const ext = extension || "png";
    return `images/gyazo-${gyazoId}.${ext}`;
  }

  // Scrapbox Files URLの場合
  const scrapboxFileId = extractScrapboxFileId(url);
  if (scrapboxFileId) {
    const ext = extension || getScrapboxFileExtension(url);
    return `images/scrapbox-${scrapboxFileId}.${ext}`;
  }

  // その他のURLの場合はハッシュベースのファイル名
  const hash = crypto.createHash("md5").update(url).digest("hex");
  const ext = extension || getExtension(url);
  return `images/${hash}.${ext}`;
}

/**
 * 画像マッピングを生成する
 * Gyazo画像の場合はAPIから取得した拡張子情報を使用
 */
export async function generateImageMappings(
  urls: string[],
  gyazoAccessToken?: string
): Promise<ImageMapping[]> {
  const mappings: ImageMapping[] = [];

  for (const url of urls) {
    const gyazoId = extractGyazoId(url);

    if (gyazoId && gyazoAccessToken) {
      try {
        const info = await fetchGyazoImageInfo(gyazoId, gyazoAccessToken);
        mappings.push({
          originalUrl: url,
          localPath: generateLocalPath(url, info.type),
        });
      } catch {
        // API取得失敗時はデフォルト拡張子を使用
        mappings.push({
          originalUrl: url,
          localPath: generateLocalPath(url),
        });
      }
    } else {
      mappings.push({
        originalUrl: url,
        localPath: generateLocalPath(url),
      });
    }
  }

  return mappings;
}

/**
 * 画像マッピングを生成する（同期版、Gyazo APIを使用しない）
 */
export function generateImageMappingsSync(urls: string[]): ImageMapping[] {
  return urls.map((url) => ({
    originalUrl: url,
    localPath: generateLocalPath(url),
  }));
}

/**
 * ダウンロードオプション
 */
export interface DownloadOptions {
  gyazoAccessToken?: string;
  connectSid?: string;
  skipExisting?: boolean;
}

/**
 * 画像をダウンロードする
 * Gyazo画像の場合はAPIを使用して正確な拡張子を取得する
 * Scrapbox Files URLの場合はconnect.sidを使用して認証付きでダウンロードする
 */
export async function downloadImage(
  url: string,
  outputDir: string,
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  const gyazoId = extractGyazoId(url);
  let localPath: string;
  let fetchUrl: string;
  let fetchOptions: RequestInit = {};

  try {
    // Gyazo URLの場合
    if (gyazoId) {
      let extension = "png"; // デフォルト
      let imageUrl = `https://i.gyazo.com/${gyazoId}.png`; // フォールバック

      if (options.gyazoAccessToken) {
        try {
          const info = await fetchGyazoImageInfo(gyazoId, options.gyazoAccessToken);
          extension = info.type;
          imageUrl = info.url;
        } catch {
          // API取得失敗時はフォールバックURLを使用
        }
      }

      localPath = generateLocalPath(url, extension);
      fetchUrl = imageUrl;
    } else if (isScrapboxFilesUrl(url)) {
      // Scrapbox Files URLの場合
      localPath = generateLocalPath(url);

      if (options.connectSid) {
        // connect.sidを使用してURLを解決
        const resolveResult = await resolveScrapboxFileUrl(url, options.connectSid);
        if (resolveResult.success) {
          fetchUrl = resolveResult.resolvedUrl;
        } else {
          // 解決失敗時は元のURLを使用（パブリックファイルの可能性）
          fetchUrl = url;
        }
      } else {
        // connect.sidがない場合は元のURLを使用
        fetchUrl = url;
      }
    } else {
      // 通常の画像URL
      localPath = generateLocalPath(url);
      fetchUrl = url;
    }

    const fullPath = path.join(outputDir, localPath);

    // 既存ファイルのスキップチェック
    if (options.skipExisting) {
      try {
        await fs.access(fullPath);
        // ファイルが存在する場合はスキップ
        return {
          url,
          localPath,
          success: true,
        };
      } catch {
        // ファイルが存在しない場合は続行
      }
    }

    // ディレクトリを作成
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // 画像をダウンロード
    const response = await fetch(fetchUrl, fetchOptions);
    if (!response.ok) {
      return {
        url,
        localPath,
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const buffer = await response.arrayBuffer();
    await fs.writeFile(fullPath, Buffer.from(buffer));

    return {
      url,
      localPath,
      success: true,
    };
  } catch (error) {
    return {
      url,
      localPath: generateLocalPath(url),
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 複数画像ダウンロードのオプション
 */
export interface DownloadImagesOptions extends DownloadOptions {
  concurrency?: number;
  onProgress?: (completed: number, total: number, result: DownloadResult) => void;
}

/**
 * 複数の画像をダウンロードする（並列実行）
 */
export async function downloadImages(
  urls: string[],
  outputDir: string,
  options: DownloadImagesOptions = {}
): Promise<DownloadResult[]> {
  const { concurrency = 5, onProgress, gyazoAccessToken, connectSid, skipExisting } = options;
  const results: DownloadResult[] = [];
  let completed = 0;
  const total = urls.length;

  // 並列実行のためのキュー処理
  const queue = [...urls];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < Math.min(concurrency, urls.length); i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const url = queue.shift();
          if (!url) break;

          const result = await downloadImage(url, outputDir, { gyazoAccessToken, connectSid, skipExisting });
          results.push(result);
          completed++;

          if (onProgress) {
            onProgress(completed, total, result);
          }
        }
      })()
    );
  }

  await Promise.all(workers);
  return results;
}

/**
 * ページ内容の画像URLをローカルパスに置換する
 */
export function replaceImageUrls(
  content: string,
  mappings: ImageMapping[]
): string {
  let result = content;
  for (const mapping of mappings) {
    result = result.replace(
      new RegExp(escapeRegExp(mapping.originalUrl), "g"),
      mapping.localPath
    );
  }
  return result;
}

/**
 * 正規表現の特殊文字をエスケープ
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
