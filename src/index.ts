#!/usr/bin/env node
/**
 * Cosense Archiver CLI
 * CosenseのJSONエクスポートから静的サイトを生成するCLIツール
 */
import * as fs from "fs/promises";
import * as path from "path";
import { loadCosenseJson } from "./parser/json-parser.js";
import { isCosenseExport } from "./parser/types.js";
import { buildLinkGraph } from "./analyzer/link-analyzer.js";
import { buildSearchIndex, serializeSearchIndex } from "./analyzer/search-index.js";
import {
  extractImageUrls,
  downloadImages,
  generateImageMappingsSync,
} from "./downloader/image-downloader.js";
import {
  renderPage,
  renderIndexPage,
  generatePageFilename,
} from "./generator/html-generator.js";
import { generateCSS } from "./generator/css-generator.js";
import { generateSearchJS } from "./generator/js-generator.js";

interface Options {
  input: string;
  output: string;
  downloadImages: boolean;
  concurrency: number;
  gyazoAccessToken?: string;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    input: "",
    output: "./output",
    downloadImages: true,
    concurrency: 5,
    gyazoAccessToken: process.env.GYAZO_ACCESS_TOKEN,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-o" || arg === "--output") {
      options.output = args[++i] || "./output";
    } else if (arg === "--no-images") {
      options.downloadImages = false;
    } else if (arg === "-c" || arg === "--concurrency") {
      options.concurrency = parseInt(args[++i], 10) || 5;
    } else if (arg === "--gyazo-token") {
      options.gyazoAccessToken = args[++i];
    } else if (arg === "-h" || arg === "--help") {
      showHelp();
      process.exit(0);
    } else if (!arg.startsWith("-") && !options.input) {
      options.input = arg;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
Cosense Archiver - Cosense(旧Scrapbox)のJSONから静的サイトを生成

使用方法:
  cosense-archiver <input.json> [options]

引数:
  <input.json>     CosenseからエクスポートしたJSONファイル

オプション:
  -o, --output <dir>      出力先ディレクトリ (デフォルト: ./output)
  --no-images             画像のダウンロードをスキップ
  -c, --concurrency <n>   画像ダウンロードの並列数 (デフォルト: 5)
  --gyazo-token <token>   Gyazo APIアクセストークン (環境変数 GYAZO_ACCESS_TOKEN でも指定可)
  -h, --help              このヘルプを表示

例:
  cosense-archiver export.json
  cosense-archiver export.json -o ./dist
  cosense-archiver export.json --no-images
  GYAZO_ACCESS_TOKEN=xxx cosense-archiver export.json
`);
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (!options.input) {
    console.error("エラー: 入力JSONファイルを指定してください");
    showHelp();
    process.exit(1);
  }

  console.log("Cosense Archiver");
  console.log("================");
  console.log(`入力: ${options.input}`);
  console.log(`出力: ${options.output}`);
  console.log();

  // JSONを読み込む
  console.log("JSONファイルを読み込んでいます...");
  let data;
  try {
    data = await loadCosenseJson(options.input);
  } catch (error) {
    console.error(`エラー: JSONファイルの読み込みに失敗しました: ${error}`);
    process.exit(1);
  }

  const projectName = isCosenseExport(data) ? data.displayName : "Cosense Archive";
  const pages = data.pages;

  console.log(`プロジェクト: ${projectName}`);
  console.log(`ページ数: ${pages.length}`);
  console.log();

  // ディレクトリを作成
  const outputDir = options.output;
  const pagesDir = path.join(outputDir, "pages");
  const assetsDir = path.join(outputDir, "assets");
  const cssDir = path.join(assetsDir, "css");
  const jsDir = path.join(assetsDir, "js");
  const imagesDir = path.join(assetsDir, "images");

  await ensureDir(pagesDir);
  await ensureDir(cssDir);
  await ensureDir(jsDir);
  await ensureDir(imagesDir);

  // 画像をダウンロード
  if (options.downloadImages) {
    console.log("画像を抽出しています...");
    const imageUrls = extractImageUrls(pages);
    console.log(`画像数: ${imageUrls.length}`);

    if (options.gyazoAccessToken) {
      console.log("Gyazo APIトークンが設定されています");
    } else {
      console.log("注意: Gyazo APIトークンが未設定のため、Gyazo画像は.pngとしてダウンロードされます");
    }

    if (imageUrls.length > 0) {
      console.log("画像をダウンロードしています...");
      let downloaded = 0;
      const results = await downloadImages(imageUrls, assetsDir, {
        concurrency: options.concurrency,
        gyazoAccessToken: options.gyazoAccessToken,
        onProgress: (completed, total, result) => {
          if (result.success) {
            downloaded++;
          }
          process.stdout.write(`\r進捗: ${completed}/${total} (成功: ${downloaded})`);
        },
      });
      console.log();

      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        console.log(`警告: ${failed.length} 件の画像ダウンロードに失敗しました`);
      }
    }
    console.log();
  }

  // リンクグラフを構築
  console.log("リンクグラフを構築しています...");
  const linkGraph = buildLinkGraph(pages);
  console.log();

  // 検索インデックスを生成
  console.log("検索インデックスを生成しています...");
  const searchIndex = buildSearchIndex(pages);
  const searchIndexPath = path.join(outputDir, "search.json");
  await fs.writeFile(searchIndexPath, serializeSearchIndex(searchIndex));
  console.log();

  // CSSを生成
  console.log("CSSを生成しています...");
  const cssPath = path.join(cssDir, "style.css");
  await fs.writeFile(cssPath, generateCSS());

  // JSを生成
  console.log("JavaScriptを生成しています...");
  const jsPath = path.join(jsDir, "search.js");
  await fs.writeFile(jsPath, generateSearchJS());
  console.log();

  // 各ページのHTMLを生成
  console.log("ページHTMLを生成しています...");
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const filename = generatePageFilename(page.title);
    const filePath = path.join(pagesDir, filename);

    // 画像URLをローカルパスに置換（オプション）
    let pageToRender = page;
    if (options.downloadImages) {
      const imageUrls = extractImageUrls([page]);
      if (imageUrls.length > 0) {
        const mappings = generateImageMappingsSync(imageUrls);
        // linesの画像URLを置換
        const newLines = page.lines.map((line) => {
          if (typeof line === "string") {
            let newLine = line;
            for (const mapping of mappings) {
              newLine = newLine.replace(
                mapping.originalUrl,
                `../assets/${mapping.localPath}`
              );
            }
            return newLine;
          }
          return line;
        });
        pageToRender = { ...page, lines: newLines };
      }
    }

    const html = renderPage(pageToRender, linkGraph, projectName);
    await fs.writeFile(filePath, html);

    if ((i + 1) % 100 === 0 || i === pages.length - 1) {
      process.stdout.write(`\r進捗: ${i + 1}/${pages.length}`);
    }
  }
  console.log();
  console.log();

  // インデックスページを生成
  console.log("インデックスページを生成しています...");
  const indexHtml = renderIndexPage(pages, projectName);
  const indexPath = path.join(outputDir, "index.html");
  await fs.writeFile(indexPath, indexHtml);

  console.log();
  console.log("================");
  console.log("完了しました！");
  console.log(`出力先: ${outputDir}`);
  console.log();
  console.log("静的サイトを確認するには、以下のコマンドを実行してください:");
  console.log(`  cd ${outputDir} && python3 -m http.server 8080`);
  console.log("  ブラウザで http://localhost:8080 を開いてください");
}

main().catch((error) => {
  console.error("予期しないエラーが発生しました:", error);
  process.exit(1);
});
