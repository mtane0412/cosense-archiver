/**
 * Gyazo URL解決モジュール
 * Gyazo APIを使用して画像/動画の直リンクを取得する
 * ダウンロードせず、HTMLに埋め込むURLを解決する
 */

/**
 * Gyazo APIからのレスポンス
 */
export interface GyazoImageInfo {
  image_id: string;
  permalink_url: string;
  thumb_url: string;
  url: string;
  type: string; // "png", "jpg", "gif", "mp4" など
  created_at: string;
  // 動画の場合に存在するフィールド
  video_url?: string;
}

/**
 * Gyazo画像の解決結果
 */
export interface GyazoResolveResult {
  originalUrl: string;
  /** 画像として表示するURL（動画の場合はGIF URL） */
  imageUrl: string;
  /** 動画のMP4 URL（動画の場合のみ） */
  videoUrl?: string;
  /** コンテンツタイプ */
  type: "image" | "video";
  /** 成功したかどうか */
  success: boolean;
  /** エラーメッセージ */
  error?: string;
}

// Gyazoドメインパターン（URLからimage_idを抽出）
const GYAZO_PATTERN = /^https?:\/\/(i\.)?gyazo\.com\/([a-zA-Z0-9]+)(\.[a-z0-9]+)?$/;
// Gyazo APIエンドポイント
const GYAZO_API_ENDPOINT = "https://api.gyazo.com/api/images";

/**
 * URLがGyazo URLかどうか判定
 */
export function isGyazoUrl(url: string): boolean {
  return GYAZO_PATTERN.test(url);
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
 * 単一のGyazo URLを解決する
 */
export async function resolveGyazoUrl(
  url: string,
  accessToken: string
): Promise<GyazoResolveResult> {
  const imageId = extractGyazoId(url);

  if (!imageId) {
    return {
      originalUrl: url,
      imageUrl: url,
      type: "image",
      success: false,
      error: "Not a valid Gyazo URL",
    };
  }

  try {
    const info = await fetchGyazoImageInfo(imageId, accessToken);

    // 動画（MP4）の場合
    if (info.type === "mp4" || info.video_url) {
      // 動画の場合はGIF URLを使用（thumb_urlがGIF）
      // Gyazoの仕様: thumb_urlは動画のプレビューGIF
      const gifUrl = info.thumb_url || `https://i.gyazo.com/${imageId}.gif`;
      return {
        originalUrl: url,
        imageUrl: gifUrl,
        videoUrl: info.video_url || info.url,
        type: "video",
        success: true,
      };
    }

    // 通常の画像の場合
    return {
      originalUrl: url,
      imageUrl: info.url,
      type: "image",
      success: true,
    };
  } catch (error) {
    return {
      originalUrl: url,
      imageUrl: url,
      type: "image",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 複数のGyazo URLを解決する（並列実行）
 */
export async function resolveGyazoUrls(
  urls: string[],
  accessToken: string,
  options: {
    concurrency?: number;
    onProgress?: (completed: number, total: number, result: GyazoResolveResult) => void;
  } = {}
): Promise<Map<string, GyazoResolveResult>> {
  const { concurrency = 5, onProgress } = options;
  const results = new Map<string, GyazoResolveResult>();

  // Gyazo URLのみをフィルタ
  const gyazoUrls = urls.filter(isGyazoUrl);

  if (gyazoUrls.length === 0) {
    return results;
  }

  let completed = 0;
  const total = gyazoUrls.length;
  const queue = [...gyazoUrls];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < Math.min(concurrency, gyazoUrls.length); i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const url = queue.shift();
          if (!url) break;

          const result = await resolveGyazoUrl(url, accessToken);
          results.set(url, result);
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
 * APIトークンなしでGyazoリンクを生成する
 * 画像の代わりに「Gyazo」テキストリンクを返す
 */
export function createGyazoFallbackLink(url: string): string {
  return `<a href="${url}" class="gyazo-link" target="_blank" rel="noopener">Gyazo</a>`;
}
