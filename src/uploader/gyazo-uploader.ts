/**
 * Gyazo画像アップロードモジュール
 * 非Gyazo画像をGyazoにアップロードし、Gyazo URLに置き換える
 * 既にダウンロード済みのローカルファイルがあれば、それを使用してアップロードする
 */
import * as fs from "fs/promises";
import * as path from "path";

/**
 * Gyazo Upload APIのレスポンス
 */
export interface GyazoUploadResponse {
  image_id: string;
  permalink_url: string;
  thumb_url: string;
  url: string;
  type: string;
}

/**
 * アップロード結果
 */
export interface UploadResult {
  originalUrl: string;
  gyazoUrl: string;
  gyazoImageUrl: string;
  success: boolean;
  error?: string;
}

// Gyazo Upload APIエンドポイント
const GYAZO_UPLOAD_ENDPOINT = "https://upload.gyazo.com/api/upload";

/**
 * 画像をダウンロードしてバイナリデータを取得する
 * @param url 画像URL
 * @param connectSid Scrapbox認証用Cookie（オプション）
 */
export async function fetchImageData(
  url: string,
  connectSid?: string
): Promise<{ data: ArrayBuffer; contentType: string }> {
  const headers: Record<string, string> = {};

  // Scrapbox Files URLの場合、connect.sidを使用
  if (connectSid && url.includes("scrapbox.io/files/")) {
    headers["Cookie"] = `connect.sid=${connectSid}`;
  }

  const response = await fetch(url, {
    headers,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const data = await response.arrayBuffer();

  return { data, contentType };
}

/**
 * ローカルファイルから画像データを読み込む
 * @param localPath ローカルファイルパス
 */
export async function readLocalImageData(
  localPath: string
): Promise<{ data: ArrayBuffer; contentType: string }> {
  const buffer = await fs.readFile(localPath);
  const ext = path.extname(localPath).toLowerCase().slice(1);

  const extToContentType: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
  };

  const contentType = extToContentType[ext] || "image/png";
  return { data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), contentType };
}

/**
 * URLから拡張子を推定する
 */
function guessExtension(url: string, contentType?: string): string {
  // Content-Typeから推定
  if (contentType) {
    const typeMap: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
      "image/bmp": "bmp",
    };
    const ext = typeMap[contentType.split(";")[0].trim()];
    if (ext) return ext;
  }

  // URLから推定
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  if (match) {
    const ext = match[1].toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext)) {
      return ext;
    }
  }

  return "png";
}

/**
 * 画像をGyazoにアップロードする
 * @param imageData 画像のバイナリデータ
 * @param accessToken Gyazo APIアクセストークン
 * @param filename ファイル名（拡張子付き）
 */
export async function uploadToGyazo(
  imageData: ArrayBuffer,
  accessToken: string,
  filename: string
): Promise<GyazoUploadResponse> {
  const formData = new FormData();
  const blob = new Blob([imageData]);
  formData.append("imagedata", blob, filename);

  const response = await fetch(GYAZO_UPLOAD_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gyazo upload failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json() as Promise<GyazoUploadResponse>;
}

/**
 * ローカルファイルが存在するか確認する
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 単一の画像をダウンロードしてGyazoにアップロードする
 * ローカルファイルが存在する場合はそれを使用する
 * @param url 元の画像URL
 * @param accessToken Gyazo APIアクセストークン
 * @param options オプション（connectSid, localPath）
 */
export async function uploadImageToGyazo(
  url: string,
  accessToken: string,
  options?: {
    connectSid?: string;
    localPath?: string;
  }
): Promise<UploadResult> {
  try {
    let data: ArrayBuffer;
    let contentType: string;

    // ローカルファイルが指定され、存在する場合はそれを使用
    if (options?.localPath && (await fileExists(options.localPath))) {
      const localData = await readLocalImageData(options.localPath);
      data = localData.data;
      contentType = localData.contentType;
    } else {
      // URLから画像をダウンロード
      const fetchedData = await fetchImageData(url, options?.connectSid);
      data = fetchedData.data;
      contentType = fetchedData.contentType;
    }

    // ファイル名を生成
    const ext = guessExtension(url, contentType);
    const filename = `image.${ext}`;

    // Gyazoにアップロード
    const uploadResult = await uploadToGyazo(data, accessToken, filename);

    return {
      originalUrl: url,
      gyazoUrl: uploadResult.permalink_url,
      gyazoImageUrl: uploadResult.url,
      success: true,
    };
  } catch (error) {
    return {
      originalUrl: url,
      gyazoUrl: url,
      gyazoImageUrl: url,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 複数画像アップロードのオプション
 */
export interface UploadImagesOptions {
  accessToken: string;
  connectSid?: string;
  /** ローカル画像ディレクトリ（assetsディレクトリ） */
  localImageDir?: string;
  /** URLからローカルパスへのマッピング */
  urlToLocalPath?: Map<string, string>;
  concurrency?: number;
  onProgress?: (completed: number, total: number, result: UploadResult) => void;
}

/**
 * 複数の画像をGyazoにアップロードする（並列実行）
 * ローカルファイルが存在する場合はそれを使用する
 */
export async function uploadImagesToGyazo(
  urls: string[],
  options: UploadImagesOptions
): Promise<Map<string, UploadResult>> {
  const { accessToken, connectSid, localImageDir, urlToLocalPath, concurrency = 3, onProgress } = options;
  const results = new Map<string, UploadResult>();

  if (urls.length === 0) {
    return results;
  }

  let completed = 0;
  const total = urls.length;
  const queue = [...urls];
  const workers: Promise<void>[] = [];

  // 並列数を抑えめに（Gyazo APIのレート制限を考慮）
  const actualConcurrency = Math.min(concurrency, 3);

  for (let i = 0; i < Math.min(actualConcurrency, urls.length); i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const url = queue.shift();
          if (!url) break;

          // ローカルパスを解決
          let localPath: string | undefined;
          if (urlToLocalPath && urlToLocalPath.has(url)) {
            const relativePath = urlToLocalPath.get(url)!;
            if (localImageDir) {
              localPath = path.join(localImageDir, relativePath);
            }
          }

          const result = await uploadImageToGyazo(url, accessToken, {
            connectSid,
            localPath,
          });
          results.set(url, result);
          completed++;

          if (onProgress) {
            onProgress(completed, total, result);
          }

          // レート制限を回避するための遅延
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      })()
    );
  }

  await Promise.all(workers);
  return results;
}
