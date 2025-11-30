/**
 * 行パーサーのユニットテスト
 */
import { describe, it, expect } from "vitest";
import { parseLine, parseLines } from "../../src/parser/line-parser.js";
import type { ParsedNode } from "../../src/parser/line-types.js";

describe("parseLine - インデント", () => {
  it("インデントなしの行", () => {
    const result = parseLine("テスト");
    expect(result.indent).toBe(0);
  });

  it("スペースインデント", () => {
    const result = parseLine("  テスト");
    expect(result.indent).toBe(2);
  });

  it("タブインデント", () => {
    const result = parseLine("\tテスト");
    expect(result.indent).toBe(1);
  });

  it("全角スペースは内容として扱う", () => {
    const result = parseLine("　テスト");
    expect(result.indent).toBe(0);
  });
});

describe("parseLine - 内部リンク", () => {
  it("単純な内部リンク [ページ名]", () => {
    const result = parseLine("これは[テストページ]です");
    const linkNode = result.nodes.find(
      (n) => n.type === "internal-link"
    ) as ParsedNode;
    expect(linkNode).toBeDefined();
    if (linkNode.type === "internal-link") {
      expect(linkNode.title).toBe("テストページ");
    }
  });

  it("複数の内部リンク", () => {
    const result = parseLine("[ページ1]と[ページ2]");
    const linkNodes = result.nodes.filter((n) => n.type === "internal-link");
    expect(linkNodes).toHaveLength(2);
  });
});

describe("parseLine - 外部リンク", () => {
  it("URL + タイトル形式 [URL タイトル]", () => {
    const result = parseLine("[https://example.com サンプル]");
    const linkNode = result.nodes.find(
      (n) => n.type === "external-link"
    ) as ParsedNode;
    expect(linkNode).toBeDefined();
    if (linkNode.type === "external-link") {
      expect(linkNode.url).toBe("https://example.com");
      expect(linkNode.title).toBe("サンプル");
    }
  });

  it("タイトル + URL形式 [タイトル URL]", () => {
    const result = parseLine("[サンプル https://example.com]");
    const linkNode = result.nodes.find(
      (n) => n.type === "external-link"
    ) as ParsedNode;
    expect(linkNode).toBeDefined();
    if (linkNode.type === "external-link") {
      expect(linkNode.url).toBe("https://example.com");
      expect(linkNode.title).toBe("サンプル");
    }
  });

  it("URLのみ [URL]", () => {
    const result = parseLine("[https://example.com]");
    const linkNode = result.nodes.find(
      (n) => n.type === "external-link"
    ) as ParsedNode;
    expect(linkNode).toBeDefined();
    if (linkNode.type === "external-link") {
      expect(linkNode.url).toBe("https://example.com");
      expect(linkNode.title).toBe("https://example.com");
    }
  });
});

describe("parseLine - 外部プロジェクトリンク", () => {
  it("[/project/ページ名] 形式", () => {
    const result = parseLine("[/help-jp/ブラケティング]");
    const linkNode = result.nodes.find(
      (n) => n.type === "external-project-link"
    ) as ParsedNode;
    expect(linkNode).toBeDefined();
    if (linkNode.type === "external-project-link") {
      expect(linkNode.project).toBe("help-jp");
      expect(linkNode.page).toBe("ブラケティング");
    }
  });

  it("[/project/] 形式（ページなし）", () => {
    const result = parseLine("[/help-jp/]");
    const linkNode = result.nodes.find(
      (n) => n.type === "external-project-link"
    ) as ParsedNode;
    expect(linkNode).toBeDefined();
    if (linkNode.type === "external-project-link") {
      expect(linkNode.project).toBe("help-jp");
      expect(linkNode.page).toBe("");
    }
  });
});

describe("parseLine - 画像", () => {
  it("Gyazo画像 [https://gyazo.com/xxx]", () => {
    const result = parseLine("[https://gyazo.com/abc123]");
    const imageNode = result.nodes.find((n) => n.type === "image") as ParsedNode;
    expect(imageNode).toBeDefined();
    if (imageNode.type === "image") {
      expect(imageNode.url).toBe("https://gyazo.com/abc123");
    }
  });

  it("画像拡張子 [https://example.com/image.png]", () => {
    const result = parseLine("[https://example.com/image.png]");
    const imageNode = result.nodes.find((n) => n.type === "image") as ParsedNode;
    expect(imageNode).toBeDefined();
    if (imageNode.type === "image") {
      expect(imageNode.url).toBe("https://example.com/image.png");
    }
  });

  it("jpg画像", () => {
    const result = parseLine("[https://example.com/photo.jpg]");
    const imageNode = result.nodes.find((n) => n.type === "image") as ParsedNode;
    expect(imageNode).toBeDefined();
  });

  it("gif画像", () => {
    const result = parseLine("[https://example.com/anim.gif]");
    const imageNode = result.nodes.find((n) => n.type === "image") as ParsedNode;
    expect(imageNode).toBeDefined();
  });

  it("Scrapbox Files画像 [https://scrapbox.io/files/xxx.png]", () => {
    const result = parseLine("[https://scrapbox.io/files/674d619ff9bc2444b77ffbca.png]");
    const imageNode = result.nodes.find((n) => n.type === "image") as ParsedNode;
    expect(imageNode).toBeDefined();
    if (imageNode.type === "image") {
      expect(imageNode.url).toBe("https://scrapbox.io/files/674d619ff9bc2444b77ffbca.png");
    }
  });

  it("ローカル画像パス [../assets/images/xxx.png]", () => {
    const result = parseLine("[../assets/images/scrapbox-674d619ff9bc2444b77ffbca.png]");
    const imageNode = result.nodes.find((n) => n.type === "image") as ParsedNode;
    expect(imageNode).toBeDefined();
    if (imageNode.type === "image") {
      expect(imageNode.url).toBe("../assets/images/scrapbox-674d619ff9bc2444b77ffbca.png");
    }
  });

  it("ローカル画像パス（jpg）", () => {
    const result = parseLine("[../assets/images/abc123.jpg]");
    const imageNode = result.nodes.find((n) => n.type === "image") as ParsedNode;
    expect(imageNode).toBeDefined();
  });

  it("太字記法内の画像URL [* https://scrapbox.io/files/xxx.png]", () => {
    const result = parseLine("[* https://scrapbox.io/files/674d619ff9bc2444b77ffbca.png]");
    const imageNode = result.nodes.find((n) => n.type === "image") as ParsedNode;
    expect(imageNode).toBeDefined();
    if (imageNode.type === "image") {
      expect(imageNode.url).toBe("https://scrapbox.io/files/674d619ff9bc2444b77ffbca.png");
    }
  });

  it("太字記法内のGyazo URL [* https://gyazo.com/xxx]", () => {
    const result = parseLine("[* https://gyazo.com/abc123]");
    const imageNode = result.nodes.find((n) => n.type === "image") as ParsedNode;
    expect(imageNode).toBeDefined();
    if (imageNode.type === "image") {
      expect(imageNode.url).toBe("https://gyazo.com/abc123");
    }
  });

  it("太字記法内のローカル画像パス [* ../assets/images/xxx.png]", () => {
    const result = parseLine("[* ../assets/images/scrapbox-abc123.png]");
    const imageNode = result.nodes.find((n) => n.type === "image") as ParsedNode;
    expect(imageNode).toBeDefined();
    if (imageNode.type === "image") {
      expect(imageNode.url).toBe("../assets/images/scrapbox-abc123.png");
    }
  });
});

describe("parseLine - アイコン", () => {
  it("[user.icon] 形式", () => {
    const result = parseLine("[mtane0412.icon]");
    const iconNode = result.nodes.find((n) => n.type === "icon") as ParsedNode;
    expect(iconNode).toBeDefined();
    if (iconNode.type === "icon") {
      expect(iconNode.user).toBe("mtane0412");
    }
  });

  it("文中のアイコン", () => {
    const result = parseLine("こんにちは[user.icon]です");
    const iconNode = result.nodes.find((n) => n.type === "icon") as ParsedNode;
    expect(iconNode).toBeDefined();
  });
});

describe("parseLine - ハッシュタグ", () => {
  it("#タグ 形式", () => {
    const result = parseLine("これは #テスト です");
    const tagNode = result.nodes.find((n) => n.type === "hashtag") as ParsedNode;
    expect(tagNode).toBeDefined();
    if (tagNode.type === "hashtag") {
      expect(tagNode.tag).toBe("テスト");
    }
  });

  it("行頭のハッシュタグ", () => {
    const result = parseLine("#タグ");
    const tagNode = result.nodes.find((n) => n.type === "hashtag") as ParsedNode;
    expect(tagNode).toBeDefined();
    if (tagNode.type === "hashtag") {
      expect(tagNode.tag).toBe("タグ");
    }
  });

  it("連続するハッシュタグ", () => {
    const result = parseLine("#タグ1 #タグ2");
    const tagNodes = result.nodes.filter((n) => n.type === "hashtag");
    expect(tagNodes).toHaveLength(2);
  });
});

describe("parseLine - 装飾記法", () => {
  it("太字 [* text]", () => {
    const result = parseLine("[* 太字テスト]");
    const boldNode = result.nodes.find((n) => n.type === "bold") as ParsedNode;
    expect(boldNode).toBeDefined();
    if (boldNode.type === "bold") {
      expect(boldNode.level).toBe(1);
    }
  });

  it("強い太字 [*** text]", () => {
    const result = parseLine("[*** 強調]");
    const boldNode = result.nodes.find((n) => n.type === "bold") as ParsedNode;
    expect(boldNode).toBeDefined();
    if (boldNode.type === "bold") {
      expect(boldNode.level).toBe(3);
    }
  });

  it("二重括弧太字 [[text]]", () => {
    const result = parseLine("[[太字]]");
    const boldNode = result.nodes.find((n) => n.type === "bold") as ParsedNode;
    expect(boldNode).toBeDefined();
  });

  it("斜体 [/ text]", () => {
    const result = parseLine("[/ 斜体テスト]");
    const italicNode = result.nodes.find((n) => n.type === "italic") as ParsedNode;
    expect(italicNode).toBeDefined();
  });

  it("打消し線 [- text]", () => {
    const result = parseLine("[- 打消し]");
    const strikeNode = result.nodes.find(
      (n) => n.type === "strikethrough"
    ) as ParsedNode;
    expect(strikeNode).toBeDefined();
  });

  it("下線 [_ text]", () => {
    const result = parseLine("[_ 下線]");
    const underlineNode = result.nodes.find(
      (n) => n.type === "underline"
    ) as ParsedNode;
    expect(underlineNode).toBeDefined();
  });
});

describe("parseLine - インラインコード", () => {
  it("`code` 形式", () => {
    const result = parseLine("これは`code`です");
    const codeNode = result.nodes.find((n) => n.type === "code") as ParsedNode;
    expect(codeNode).toBeDefined();
    if (codeNode.type === "code") {
      expect(codeNode.code).toBe("code");
    }
  });
});

describe("parseLine - 数式", () => {
  it("[$ formula] 形式", () => {
    const result = parseLine("[$ E = mc^2]");
    const mathNode = result.nodes.find((n) => n.type === "math") as ParsedNode;
    expect(mathNode).toBeDefined();
    if (mathNode.type === "math") {
      expect(mathNode.formula).toBe("E = mc^2");
    }
  });
});

describe("parseLine - コードブロック", () => {
  it("code:filename.js 形式", () => {
    const result = parseLine("code:test.js");
    expect(result.isCodeBlock).toBe(true);
    expect(result.codeBlockLang).toBe("js");
  });

  it("code:filename 形式（拡張子なし）", () => {
    const result = parseLine("code:Dockerfile");
    expect(result.isCodeBlock).toBe(true);
    expect(result.codeBlockLang).toBe("");
  });
});

describe("parseLines - コードブロック複数行", () => {
  it("コードブロック内の行はisCodeBlockContentがtrue", () => {
    const lines = ["code:test.js", " const x = 1;", " console.log(x);", "通常行"];
    const results = parseLines(lines);

    expect(results[0].isCodeBlock).toBe(true);
    expect(results[1].isCodeBlockContent).toBe(true);
    expect(results[2].isCodeBlockContent).toBe(true);
    expect(results[3].isCodeBlockContent).toBe(false);
  });
});

describe("parseLine - 複合", () => {
  it("複数の記法が混在する行", () => {
    const result = parseLine("これは[リンク]と`コード`と #タグ です");
    expect(result.nodes.some((n) => n.type === "internal-link")).toBe(true);
    expect(result.nodes.some((n) => n.type === "code")).toBe(true);
    expect(result.nodes.some((n) => n.type === "hashtag")).toBe(true);
  });

  it("リンク直後のハッシュタグ（スペースなし）は認識される", () => {
    const result = parseLine("[リンク]#タグ");
    expect(result.nodes.some((n) => n.type === "internal-link")).toBe(true);
    expect(result.nodes.some((n) => n.type === "hashtag")).toBe(true);
  });
});

describe("parseLine - 引用ブロック", () => {
  it("> で始まる行は引用ブロックとして認識される", () => {
    const result = parseLine("> これは引用です");
    expect(result.isQuote).toBe(true);
    expect(result.nodes.some((n) => n.type === "text" && n.text === "これは引用です")).toBe(true);
  });

  it(">のあとにスペースがなくても引用ブロックとして認識される", () => {
    const result = parseLine(">スペースなしの引用");
    expect(result.isQuote).toBe(true);
    expect(result.nodes.some((n) => n.type === "text" && n.text === "スペースなしの引用")).toBe(true);
  });

  it("インデント + > も引用ブロックとして認識される", () => {
    const result = parseLine(" > インデントありの引用");
    expect(result.indent).toBe(1);
    expect(result.isQuote).toBe(true);
    expect(result.nodes.some((n) => n.type === "text" && n.text === "インデントありの引用")).toBe(true);
  });

  it("引用ブロック内でリンクがパースされる", () => {
    const result = parseLine(">引用内の[リンク]です");
    expect(result.isQuote).toBe(true);
    expect(result.nodes.some((n) => n.type === "internal-link")).toBe(true);
  });

  it(">のみの行は空の引用として認識される", () => {
    const result = parseLine(">");
    expect(result.isQuote).toBe(true);
    expect(result.nodes).toHaveLength(0);
  });

  it(">> のような複数の>は引用として認識されない（通常テキスト）", () => {
    const result = parseLine(">> ネストは通常テキスト");
    expect(result.isQuote).toBe(false);
  });
});
