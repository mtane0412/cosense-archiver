/**
 * 行パーサーの結果を表す型定義
 * Cosense記法をパースした後のノード構造
 */

/**
 * ノードの種類
 */
export type NodeType =
  | "text" // プレーンテキスト
  | "internal-link" // 内部リンク [ページ名]
  | "external-link" // 外部リンク [URL タイトル] or [タイトル URL]
  | "external-project-link" // 外部プロジェクトリンク [/project/ページ名]
  | "image" // 画像 [https://gyazo.com/xxx]
  | "icon" // アイコン [user.icon]
  | "hashtag" // ハッシュタグ #tag
  | "bold" // 太字 [* text] or [[text]]
  | "italic" // 斜体 [/ text]
  | "strikethrough" // 打消し線 [- text]
  | "underline" // 下線 [_ text]
  | "code" // インラインコード `code`
  | "math"; // 数式 [$ formula]

/**
 * 基本ノードインターフェース
 */
export interface BaseNode {
  type: NodeType;
  raw: string; // 元の文字列
}

/**
 * テキストノード
 */
export interface TextNode extends BaseNode {
  type: "text";
  text: string;
}

/**
 * 内部リンクノード
 */
export interface InternalLinkNode extends BaseNode {
  type: "internal-link";
  title: string;
}

/**
 * 外部リンクノード
 */
export interface ExternalLinkNode extends BaseNode {
  type: "external-link";
  url: string;
  title: string;
}

/**
 * 外部プロジェクトリンクノード
 */
export interface ExternalProjectLinkNode extends BaseNode {
  type: "external-project-link";
  project: string;
  page: string;
}

/**
 * 画像ノード
 */
export interface ImageNode extends BaseNode {
  type: "image";
  url: string;
}

/**
 * アイコンノード
 */
export interface IconNode extends BaseNode {
  type: "icon";
  user: string;
}

/**
 * ハッシュタグノード
 */
export interface HashtagNode extends BaseNode {
  type: "hashtag";
  tag: string;
}

/**
 * 太字ノード
 */
export interface BoldNode extends BaseNode {
  type: "bold";
  level: number; // 太字レベル（*の数）
  children: ParsedNode[];
}

/**
 * 斜体ノード
 */
export interface ItalicNode extends BaseNode {
  type: "italic";
  children: ParsedNode[];
}

/**
 * 打消し線ノード
 */
export interface StrikethroughNode extends BaseNode {
  type: "strikethrough";
  children: ParsedNode[];
}

/**
 * 下線ノード
 */
export interface UnderlineNode extends BaseNode {
  type: "underline";
  children: ParsedNode[];
}

/**
 * コードノード
 */
export interface CodeNode extends BaseNode {
  type: "code";
  code: string;
}

/**
 * 数式ノード
 */
export interface MathNode extends BaseNode {
  type: "math";
  formula: string;
}

/**
 * パースされたノード（全種類のユニオン型）
 */
export type ParsedNode =
  | TextNode
  | InternalLinkNode
  | ExternalLinkNode
  | ExternalProjectLinkNode
  | ImageNode
  | IconNode
  | HashtagNode
  | BoldNode
  | ItalicNode
  | StrikethroughNode
  | UnderlineNode
  | CodeNode
  | MathNode;

/**
 * パースされた行
 */
export interface ParsedLine {
  indent: number; // インデントレベル（スペース/タブ数）
  nodes: ParsedNode[];
  isCodeBlock: boolean; // code:filename の行かどうか
  codeBlockLang?: string; // コードブロックの言語
  isCodeBlockContent: boolean; // コードブロックの内容行かどうか
}

/**
 * コードブロック情報
 */
export interface CodeBlock {
  filename: string;
  lang: string;
  lines: string[];
  startLineIndex: number;
}
