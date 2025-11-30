/**
 * Gyazo画像アップロードモジュールのテスト
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchImageData,
  readLocalImageData,
  uploadToGyazo,
  uploadImageToGyazo,
  uploadImagesToGyazo,
  type GyazoUploadResponse,
} from "../../src/uploader/gyazo-uploader.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

describe("gyazo-uploader", () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("fetchImageData", () => {
    test("画像データを正常に取得できる", async () => {
      const mockImageData = new ArrayBuffer(100);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "image/png" }),
        arrayBuffer: () => Promise.resolve(mockImageData),
      });

      const result = await fetchImageData("https://example.com/image.png");

      expect(result.data).toBe(mockImageData);
      expect(result.contentType).toBe("image/png");
      expect(mockFetch).toHaveBeenCalledWith("https://example.com/image.png", {
        headers: {},
        redirect: "follow",
      });
    });

    test("Scrapbox Files URLの場合はCookieを付与する", async () => {
      const mockImageData = new ArrayBuffer(100);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "image/jpeg" }),
        arrayBuffer: () => Promise.resolve(mockImageData),
      });

      await fetchImageData(
        "https://scrapbox.io/files/abc123.png",
        "test-connect-sid"
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://scrapbox.io/files/abc123.png",
        {
          headers: { Cookie: "connect.sid=test-connect-sid" },
          redirect: "follow",
        }
      );
    });

    test("HTTPエラー時は例外をスローする", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(fetchImageData("https://example.com/notfound.png")).rejects.toThrow(
        "Failed to fetch image: 404 Not Found"
      );
    });
  });

  describe("readLocalImageData", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gyazo-uploader-test-"));
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true });
    });

    test("ローカルのPNG画像を読み込める", async () => {
      const testImagePath = path.join(tempDir, "test.png");
      const testData = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
      await fs.writeFile(testImagePath, testData);

      const result = await readLocalImageData(testImagePath);

      expect(result.contentType).toBe("image/png");
      expect(Buffer.from(result.data)).toEqual(testData);
    });

    test("ローカルのJPEG画像を読み込める", async () => {
      const testImagePath = path.join(tempDir, "test.jpg");
      const testData = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // JPEG magic bytes
      await fs.writeFile(testImagePath, testData);

      const result = await readLocalImageData(testImagePath);

      expect(result.contentType).toBe("image/jpeg");
    });

    test("存在しないファイルは例外をスローする", async () => {
      const nonExistentPath = path.join(tempDir, "nonexistent.png");

      await expect(readLocalImageData(nonExistentPath)).rejects.toThrow();
    });
  });

  describe("uploadToGyazo", () => {
    test("画像を正常にアップロードできる", async () => {
      const mockResponse: GyazoUploadResponse = {
        image_id: "abc123",
        permalink_url: "https://gyazo.com/abc123",
        thumb_url: "https://thumb.gyazo.com/thumb/abc123.png",
        url: "https://i.gyazo.com/abc123.png",
        type: "png",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const imageData = new ArrayBuffer(100);
      const result = await uploadToGyazo(imageData, "test-token", "image.png");

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://upload.gyazo.com/api/upload",
        expect.objectContaining({
          method: "POST",
          headers: { Authorization: "Bearer test-token" },
        })
      );
    });

    test("アップロード失敗時は例外をスローする", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: () => Promise.resolve("Invalid access token"),
      });

      const imageData = new ArrayBuffer(100);
      await expect(uploadToGyazo(imageData, "invalid-token", "image.png")).rejects.toThrow(
        "Gyazo upload failed: 401 Unauthorized - Invalid access token"
      );
    });
  });

  describe("uploadImageToGyazo", () => {
    test("画像のダウンロードとアップロードが正常に行われる", async () => {
      const mockImageData = new ArrayBuffer(100);
      const mockUploadResponse: GyazoUploadResponse = {
        image_id: "xyz789",
        permalink_url: "https://gyazo.com/xyz789",
        thumb_url: "https://thumb.gyazo.com/thumb/xyz789.png",
        url: "https://i.gyazo.com/xyz789.png",
        type: "png",
      };

      // fetchImageData のモック
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "image/png" }),
        arrayBuffer: () => Promise.resolve(mockImageData),
      });

      // uploadToGyazo のモック
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUploadResponse),
      });

      const result = await uploadImageToGyazo(
        "https://example.com/image.png",
        "test-token"
      );

      expect(result.success).toBe(true);
      expect(result.originalUrl).toBe("https://example.com/image.png");
      expect(result.gyazoUrl).toBe("https://gyazo.com/xyz789");
      expect(result.gyazoImageUrl).toBe("https://i.gyazo.com/xyz789.png");
    });

    test("ダウンロード失敗時はエラーを返す", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const result = await uploadImageToGyazo(
        "https://example.com/notfound.png",
        "test-token"
      );

      expect(result.success).toBe(false);
      expect(result.originalUrl).toBe("https://example.com/notfound.png");
      expect(result.error).toContain("404");
    });

    test("アップロード失敗時はエラーを返す", async () => {
      const mockImageData = new ArrayBuffer(100);

      // fetchImageData のモック
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "image/png" }),
        arrayBuffer: () => Promise.resolve(mockImageData),
      });

      // uploadToGyazo のモック（失敗）
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: () => Promise.resolve("Server error"),
      });

      const result = await uploadImageToGyazo(
        "https://example.com/image.png",
        "test-token"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("500");
    });

    test("ローカルファイルが存在する場合はそれを使用する", async () => {
      // 一時ファイルを作成
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gyazo-upload-test-"));
      const testImagePath = path.join(tempDir, "test.png");
      const testData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]); // PNG magic bytes
      await fs.writeFile(testImagePath, testData);

      const mockUploadResponse: GyazoUploadResponse = {
        image_id: "local123",
        permalink_url: "https://gyazo.com/local123",
        thumb_url: "https://thumb.gyazo.com/thumb/local123.png",
        url: "https://i.gyazo.com/local123.png",
        type: "png",
      };

      // uploadToGyazo のモックのみ（fetchImageDataは呼ばれない）
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUploadResponse),
      });

      const result = await uploadImageToGyazo(
        "https://example.com/image.png",
        "test-token",
        { localPath: testImagePath }
      );

      expect(result.success).toBe(true);
      expect(result.gyazoUrl).toBe("https://gyazo.com/local123");
      // fetchはuploadのみで1回だけ呼ばれる（fetchImageDataは呼ばれない）
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://upload.gyazo.com/api/upload",
        expect.anything()
      );

      // クリーンアップ
      await fs.rm(tempDir, { recursive: true });
    });

    test("ローカルファイルが存在しない場合はURLからダウンロードする", async () => {
      const mockImageData = new ArrayBuffer(100);
      const mockUploadResponse: GyazoUploadResponse = {
        image_id: "fallback123",
        permalink_url: "https://gyazo.com/fallback123",
        thumb_url: "https://thumb.gyazo.com/thumb/fallback123.png",
        url: "https://i.gyazo.com/fallback123.png",
        type: "png",
      };

      // fetchImageData のモック
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "image/png" }),
        arrayBuffer: () => Promise.resolve(mockImageData),
      });

      // uploadToGyazo のモック
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUploadResponse),
      });

      const result = await uploadImageToGyazo(
        "https://example.com/image.png",
        "test-token",
        { localPath: "/nonexistent/path/image.png" }
      );

      expect(result.success).toBe(true);
      // fetchが2回呼ばれる（fetchImageData + uploadToGyazo）
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("uploadImagesToGyazo", () => {
    test("複数画像を並列でアップロードできる", async () => {
      const mockImageData = new ArrayBuffer(100);
      const urls = [
        "https://example.com/image1.png",
        "https://example.com/image2.jpg",
      ];

      // URLに基づいて適切なレスポンスを返すモック
      mockFetch.mockImplementation((fetchUrl: string) => {
        // Gyazo upload APIへのリクエスト
        if (fetchUrl === "https://upload.gyazo.com/api/upload") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                image_id: "uploaded-id",
                permalink_url: "https://gyazo.com/uploaded-id",
                thumb_url: "https://thumb.gyazo.com/thumb/uploaded-id.png",
                url: "https://i.gyazo.com/uploaded-id.png",
                type: "png",
              }),
          });
        }
        // 画像取得リクエスト
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "image/png" }),
          arrayBuffer: () => Promise.resolve(mockImageData),
        });
      });

      const progressCallback = vi.fn();
      const results = await uploadImagesToGyazo(urls, {
        accessToken: "test-token",
        concurrency: 2,
        onProgress: progressCallback,
      });

      expect(results.size).toBe(2);
      expect(results.get(urls[0])?.success).toBe(true);
      expect(results.get(urls[1])?.success).toBe(true);
      expect(progressCallback).toHaveBeenCalledTimes(2);
    });

    test("空の配列の場合は空のMapを返す", async () => {
      const results = await uploadImagesToGyazo([], {
        accessToken: "test-token",
      });

      expect(results.size).toBe(0);
    });
  });
});
