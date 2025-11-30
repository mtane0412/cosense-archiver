/**
 * Cosense記法の行パーサー
 * 各種記法（リンク、装飾、コード等）をパースしてノード構造に変換
 */
import type {
  ParsedLine,
  ParsedNode,
  TextNode,
  InternalLinkNode,
  ExternalLinkNode,
  ExternalProjectLinkNode,
  ImageNode,
  IconNode,
  HashtagNode,
  BoldNode,
  ItalicNode,
  StrikethroughNode,
  UnderlineNode,
  CodeNode,
  MathNode,
} from "./line-types.js";

// 画像拡張子のパターン
const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i;
// Gyazoドメインパターン
const GYAZO_PATTERN = /^https?:\/\/(i\.)?gyazo\.com\//;
// URLパターン（行頭用）
const URL_PATTERN = /^https?:\/\/[^\s\]]+/;
// URLパターン（文中検索用）
const URL_PATTERN_GLOBAL = /https?:\/\/[^\s\]]+/;
// ローカル画像パスパターン（../assets/images/xxx.png形式）
const LOCAL_IMAGE_PATH = /^\.\.\/assets\/images\/[^\s\]]+\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i;

/**
 * インデントを計測（スペースとタブを1文字としてカウント）
 */
function measureIndent(line: string): { indent: number; content: string } {
  let indent = 0;
  let i = 0;
  while (i < line.length && (line[i] === " " || line[i] === "\t")) {
    indent++;
    i++;
  }
  return { indent, content: line.slice(i) };
}

/**
 * 引用ブロック判定（>で始まる行）
 * >の後にスペースがあってもなくても引用として認識
 * ただし>>のような複数の>は引用として認識しない
 */
function parseQuote(content: string): { isQuote: boolean; quoteContent: string } {
  // 先頭が>で、次の文字が>でない場合のみ引用として認識
  if (content.startsWith(">") && !content.startsWith(">>")) {
    // > または > の形式
    const afterGt = content.slice(1);
    // >の後にスペースがある場合は除去、なければそのまま
    const quoteContent = afterGt.startsWith(" ") ? afterGt.slice(1) : afterGt;
    return { isQuote: true, quoteContent };
  }
  return { isQuote: false, quoteContent: content };
}

/**
 * コードブロック開始行かどうかを判定
 */
function isCodeBlockStart(content: string): {
  isCodeBlock: boolean;
  lang: string;
} {
  const match = content.match(/^code:([^\s]+)$/);
  if (match) {
    const filename = match[1];
    const extMatch = filename.match(/\.(\w+)$/);
    return {
      isCodeBlock: true,
      lang: extMatch ? extMatch[1] : "",
    };
  }
  return { isCodeBlock: false, lang: "" };
}

/**
 * ブラケット記法をパース [...]
 */
function parseBracket(content: string): ParsedNode | null {
  // 外部プロジェクトリンク [/project/page]
  const externalProjectMatch = content.match(/^\/([^\/]+)\/(.*)$/);
  if (externalProjectMatch) {
    return {
      type: "external-project-link",
      raw: `[${content}]`,
      project: externalProjectMatch[1],
      page: externalProjectMatch[2],
    } as ExternalProjectLinkNode;
  }

  // アイコン [user.icon]
  const iconMatch = content.match(/^([^\s.]+)\.icon$/);
  if (iconMatch) {
    return {
      type: "icon",
      raw: `[${content}]`,
      user: iconMatch[1],
    } as IconNode;
  }

  // 数式 [$ formula]
  if (content.startsWith("$ ")) {
    return {
      type: "math",
      raw: `[${content}]`,
      formula: content.slice(2),
    } as MathNode;
  }

  // 装飾記法
  // 太字 [* text] [** text] [*** text]
  const boldMatch = content.match(/^(\*+)\s+(.+)$/);
  if (boldMatch) {
    const boldContent = boldMatch[2];
    // 太字の中身が画像URLのみの場合は画像として扱う（[[画像URL]]記法に相当）
    if (
      GYAZO_PATTERN.test(boldContent) ||
      IMAGE_EXTENSIONS.test(boldContent) ||
      LOCAL_IMAGE_PATH.test(boldContent)
    ) {
      return {
        type: "image",
        raw: `[${content}]`,
        url: boldContent,
      } as ImageNode;
    }
    return {
      type: "bold",
      raw: `[${content}]`,
      level: boldMatch[1].length,
      children: parseInlineContent(boldContent),
    } as BoldNode;
  }

  // 斜体 [/ text]
  const italicMatch = content.match(/^\/\s+(.+)$/);
  if (italicMatch) {
    return {
      type: "italic",
      raw: `[${content}]`,
      children: parseInlineContent(italicMatch[1]),
    } as ItalicNode;
  }

  // 打消し線 [- text]
  const strikeMatch = content.match(/^-\s+(.+)$/);
  if (strikeMatch) {
    return {
      type: "strikethrough",
      raw: `[${content}]`,
      children: parseInlineContent(strikeMatch[1]),
    } as StrikethroughNode;
  }

  // 下線 [_ text]
  const underlineMatch = content.match(/^_\s+(.+)$/);
  if (underlineMatch) {
    return {
      type: "underline",
      raw: `[${content}]`,
      children: parseInlineContent(underlineMatch[1]),
    } as UnderlineNode;
  }

  // ローカル画像パス（../assets/images/xxx.png形式）
  if (LOCAL_IMAGE_PATH.test(content)) {
    return {
      type: "image",
      raw: `[${content}]`,
      url: content,
    } as ImageNode;
  }

  // URL関連の処理（文中のURLも検出）
  const urlMatch = content.match(URL_PATTERN_GLOBAL);
  const hasUrl = urlMatch !== null;
  const url = urlMatch ? urlMatch[0] : "";

  if (hasUrl) {
    // 画像判定（Gyazoまたは画像拡張子）
    if (GYAZO_PATTERN.test(url) || IMAGE_EXTENSIONS.test(url)) {
      return {
        type: "image",
        raw: `[${content}]`,
        url: url,
      } as ImageNode;
    }

    // 外部リンク
    // [URL タイトル] or [タイトル URL] or [URL]
    const parts = content.split(/\s+/);
    if (parts.length === 1) {
      // URLのみ
      return {
        type: "external-link",
        raw: `[${content}]`,
        url: url,
        title: url,
      } as ExternalLinkNode;
    }

    // URLが先頭かどうか
    if (parts[0].match(URL_PATTERN)) {
      // [URL タイトル]
      return {
        type: "external-link",
        raw: `[${content}]`,
        url: parts[0],
        title: parts.slice(1).join(" "),
      } as ExternalLinkNode;
    } else {
      // [タイトル URL]
      const urlPart = parts.find((p) => p.match(URL_PATTERN_GLOBAL));
      const titleParts = parts.filter((p) => !p.match(URL_PATTERN_GLOBAL));
      return {
        type: "external-link",
        raw: `[${content}]`,
        url: urlPart || "",
        title: titleParts.join(" "),
      } as ExternalLinkNode;
    }
  }

  // 内部リンク
  return {
    type: "internal-link",
    raw: `[${content}]`,
    title: content,
  } as InternalLinkNode;
}

/**
 * 行内のコンテンツをパース（再帰的に使用）
 */
function parseInlineContent(text: string): ParsedNode[] {
  const nodes: ParsedNode[] = [];
  let remaining = text;
  let textBuffer = "";

  const flushTextBuffer = () => {
    if (textBuffer) {
      nodes.push({
        type: "text",
        raw: textBuffer,
        text: textBuffer,
      } as TextNode);
      textBuffer = "";
    }
  };

  while (remaining.length > 0) {
    // 二重括弧太字 [[text]]
    const doubleBracketMatch = remaining.match(/^\[\[([^\]]+)\]\]/);
    if (doubleBracketMatch) {
      flushTextBuffer();
      nodes.push({
        type: "bold",
        raw: doubleBracketMatch[0],
        level: 1,
        children: parseInlineContent(doubleBracketMatch[1]),
      } as BoldNode);
      remaining = remaining.slice(doubleBracketMatch[0].length);
      continue;
    }

    // ブラケット記法 [...]
    const bracketMatch = remaining.match(/^\[([^\]]+)\]/);
    if (bracketMatch) {
      flushTextBuffer();
      const parsed = parseBracket(bracketMatch[1]);
      if (parsed) {
        nodes.push(parsed);
      }
      remaining = remaining.slice(bracketMatch[0].length);
      continue;
    }

    // インラインコード `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      flushTextBuffer();
      nodes.push({
        type: "code",
        raw: codeMatch[0],
        code: codeMatch[1],
      } as CodeNode);
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // ハッシュタグ #tag（行頭、スペース後、または特定の文字の後）
    if (remaining[0] === "#") {
      // 先頭、または前が空白/特定文字のときのみハッシュタグとして認識
      const lastChar = textBuffer.length > 0 ? textBuffer.slice(-1) : "";
      const isValidPosition =
        nodes.length === 0 && textBuffer === "" || // 行頭
        lastChar === " " ||
        lastChar === "\t" ||
        lastChar === "」" ||
        lastChar === "）" ||
        lastChar === "】" ||
        // 直前のノードがブラケット記法の場合も許可
        (textBuffer === "" && nodes.length > 0);

      if (isValidPosition) {
        const tagMatch = remaining.match(/^#([^\s\[\]#]+)/);
        if (tagMatch) {
          // 末尾の空白を除いてテキストバッファをフラッシュ
          if (textBuffer.endsWith(" ") || textBuffer.endsWith("\t")) {
            const lastSpace = textBuffer.slice(-1);
            textBuffer = textBuffer.slice(0, -1);
            flushTextBuffer();
            textBuffer = lastSpace;
            flushTextBuffer();
          } else {
            flushTextBuffer();
          }
          nodes.push({
            type: "hashtag",
            raw: tagMatch[0],
            tag: tagMatch[1],
          } as HashtagNode);
          remaining = remaining.slice(tagMatch[0].length);
          continue;
        }
      }
    }

    // 通常文字
    textBuffer += remaining[0];
    remaining = remaining.slice(1);
  }

  flushTextBuffer();
  return nodes;
}

/**
 * 1行をパースしてParsedLineを返す
 */
export function parseLine(
  line: string,
  inCodeBlock: boolean = false
): ParsedLine {
  const { indent, content } = measureIndent(line);

  // コードブロック内の行
  if (inCodeBlock && indent > 0) {
    return {
      indent,
      nodes: [
        {
          type: "text",
          raw: content,
          text: content,
        } as TextNode,
      ],
      isCodeBlock: false,
      isCodeBlockContent: true,
      isQuote: false,
    };
  }

  // コードブロック開始判定
  const codeBlockInfo = isCodeBlockStart(content);
  if (codeBlockInfo.isCodeBlock) {
    return {
      indent,
      nodes: [
        {
          type: "text",
          raw: content,
          text: content,
        } as TextNode,
      ],
      isCodeBlock: true,
      codeBlockLang: codeBlockInfo.lang,
      isCodeBlockContent: false,
      isQuote: false,
    };
  }

  // 引用ブロック判定
  const quoteInfo = parseQuote(content);
  if (quoteInfo.isQuote) {
    const nodes = quoteInfo.quoteContent
      ? parseInlineContent(quoteInfo.quoteContent)
      : [];
    return {
      indent,
      nodes,
      isCodeBlock: false,
      isCodeBlockContent: false,
      isQuote: true,
    };
  }

  // 通常行のパース
  const nodes = parseInlineContent(content);

  return {
    indent,
    nodes,
    isCodeBlock: false,
    isCodeBlockContent: false,
    isQuote: false,
  };
}

/**
 * 複数行をパースしてParsedLine配列を返す
 */
export function parseLines(lines: string[]): ParsedLine[] {
  const results: ParsedLine[] = [];
  let inCodeBlock = false;
  let codeBlockIndent = 0;

  for (const line of lines) {
    const { indent } = measureIndent(line);

    // コードブロック終了判定
    if (inCodeBlock && indent <= codeBlockIndent && line.trim() !== "") {
      inCodeBlock = false;
    }

    const parsed = parseLine(line, inCodeBlock);
    results.push(parsed);

    // コードブロック開始
    if (parsed.isCodeBlock) {
      inCodeBlock = true;
      codeBlockIndent = indent;
    }
  }

  return results;
}
