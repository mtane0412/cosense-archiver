/**
 * Scrapbox Files URL解決モジュール
 * scrapbox.io/files/ 形式のURLをconnect.sid Cookieを使用して
 * 認証付きでGoogle Cloud Storageの直リンクに解決する
 */

/**
 * Scrapbox Files URLの解決結果
 */
export interface ScrapboxFileResolveResult {
  /** 元のURL */
  originalUrl: string;
  /** 解決後のURL（GCSの直リンク） */
  resolvedUrl: string;
  /** 成功したかどうか */
  success: boolean;
  /** エラーメッセージ */
  error?: string;
}

// Scrapbox Files URLパターン
const SCRAPBOX_FILES_PATTERN = /^https?:\/\/scrapbox\.io\/files\/([a-zA-Z0-9]+)(\.[a-z]+)?$/;

/**
 * URLがScrapbox Files URLかどうか判定
 */
export function isScrapboxFilesUrl(url: string): boolean {
  return SCRAPBOX_FILES_PATTERN.test(url);
}

/**
 * URLからScrapboxファイルIDを抽出する
 * @returns ファイルID または null（Scrapbox Files URLでない場合）
 */
export function extractScrapboxFileId(url: string): string | null {
  const match = url.match(SCRAPBOX_FILES_PATTERN);
  return match ? match[1] : null;
}

/**
 * Scrapbox Files URLの拡張子を取得する
 */
export function getScrapboxFileExtension(url: string): string {
  const match = url.match(SCRAPBOX_FILES_PATTERN);
  if (match && match[2]) {
    return match[2].slice(1); // 先頭の . を除去
  }
  return "png"; // デフォルト
}

/**
 * 単一のScrapbox Files URLを解決する
 * connect.sidを使用してGCSの直リンクを取得する
 */
export async function resolveScrapboxFileUrl(
  url: string,
  connectSid?: string
): Promise<ScrapboxFileResolveResult> {
  if (!isScrapboxFilesUrl(url)) {
    return {
      originalUrl: url,
      resolvedUrl: url,
      success: false,
      error: "Not a valid Scrapbox Files URL",
    };
  }

  if (!connectSid) {
    return {
      originalUrl: url,
      resolvedUrl: url,
      success: false,
      error: "connect.sid is required for private project images",
    };
  }

  try {
    // connect.sidを使ってScrapboxにリクエストを送り、リダイレクト先を取得
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Cookie: `connect.sid=${connectSid}`,
      },
      redirect: "manual", // リダイレクトを自動で追わない
    });

    // 302リダイレクトの場合、LocationヘッダーにGCSのURLが含まれる
    if (response.status === 302 || response.status === 301) {
      const locationHeader = response.headers.get("location");
      if (locationHeader && locationHeader.includes("storage.googleapis.com")) {
        return {
          originalUrl: url,
          resolvedUrl: locationHeader,
          success: true,
        };
      }
    }

    // 200の場合は直接ダウンロード可能（パブリックファイル）
    if (response.status === 200) {
      return {
        originalUrl: url,
        resolvedUrl: url,
        success: true,
      };
    }

    return {
      originalUrl: url,
      resolvedUrl: url,
      success: false,
      error: `Failed to resolve URL: HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      originalUrl: url,
      resolvedUrl: url,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 複数のScrapbox Files URLを解決する（並列実行）
 */
export async function resolveScrapboxFileUrls(
  urls: string[],
  connectSid: string,
  options: {
    concurrency?: number;
    onProgress?: (completed: number, total: number, result: ScrapboxFileResolveResult) => void;
  } = {}
): Promise<Map<string, ScrapboxFileResolveResult>> {
  const { concurrency = 5, onProgress } = options;
  const results = new Map<string, ScrapboxFileResolveResult>();

  // Scrapbox Files URLのみをフィルタ
  const scrapboxFilesUrls = urls.filter(isScrapboxFilesUrl);

  if (scrapboxFilesUrls.length === 0) {
    return results;
  }

  let completed = 0;
  const total = scrapboxFilesUrls.length;
  const queue = [...scrapboxFilesUrls];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < Math.min(concurrency, scrapboxFilesUrls.length); i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const url = queue.shift();
          if (!url) break;

          const result = await resolveScrapboxFileUrl(url, connectSid);
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
