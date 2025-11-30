/**
 * CSS生成モジュール
 * CosenseライクなスタイルのCSSを生成
 */

/**
 * CSSスタイルを生成
 */
export function generateCSS(): string {
  return `/* Cosense Archiver - Cosense-like Styles */

:root {
  --bg-color: #fefefe;
  --text-color: #333;
  --link-color: #5e8a4b;
  --link-hover-color: #3d6b2f;
  --missing-link-color: #c9302c;
  --border-color: #e0e0e0;
  --code-bg: #f5f5f5;
  --header-bg: #5e8a4b;
  --header-text: #fff;
  --search-bg: #fff;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans CJK JP", sans-serif;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-color);
  background-color: var(--bg-color);
}

/* Header */
.site-header {
  background-color: var(--header-bg);
  padding: 8px 16px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-nav {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.project-name {
  color: var(--header-text);
  text-decoration: none;
  font-weight: bold;
  font-size: 16px;
}

.project-name:hover {
  opacity: 0.9;
}

/* Search */
.search-container {
  position: relative;
  flex: 1;
  max-width: 300px;
}

.search-input {
  width: 100%;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--search-bg);
}

.search-input:focus {
  outline: 2px solid rgba(255, 255, 255, 0.5);
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  margin-top: 4px;
  max-height: 400px;
  overflow-y: auto;
  display: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.search-results.active {
  display: block;
}

.search-result-item {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
}

.search-result-item:hover {
  background-color: #f5f5f5;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-title {
  font-weight: bold;
  color: var(--link-color);
}

.search-result-snippet {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

/* Main Content */
.page-content,
.index-content {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px;
}

/* Page */
.page-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
  color: var(--text-color);
}

.page-meta {
  font-size: 12px;
  color: #888;
  margin-bottom: 24px;
}

.page-meta .created,
.page-meta .updated {
  margin-right: 16px;
}

/* Lines */
.line {
  min-height: 1.8em;
  padding: 2px 0;
}

.indent-1 { padding-left: 1.5em; }
.indent-2 { padding-left: 3em; }
.indent-3 { padding-left: 4.5em; }
.indent-4 { padding-left: 6em; }
.indent-5 { padding-left: 7.5em; }
.indent-6 { padding-left: 9em; }
.indent-7 { padding-left: 10.5em; }
.indent-8 { padding-left: 12em; }

/* Bullet points for indented lines */
.bullet {
  color: #888;
  margin-right: 0.5em;
}

/* Links */
.internal-link,
.hashtag {
  color: var(--link-color);
  text-decoration: none;
  border-bottom: 1px solid transparent;
}

.internal-link:hover,
.hashtag:hover {
  color: var(--link-hover-color);
  border-bottom-color: var(--link-hover-color);
}

.missing-link {
  color: var(--missing-link-color);
}

.external-link {
  color: var(--link-color);
  text-decoration: none;
}

.external-link::after {
  content: "↗";
  font-size: 10px;
  margin-left: 2px;
  opacity: 0.7;
}

.external-project-link {
  color: var(--link-color);
  text-decoration: none;
}

.external-project-link::before {
  content: "/";
  opacity: 0.5;
}

/* Formatting */
.bold-1 { font-weight: bold; }
.bold-2 { font-weight: bold; font-size: 1.1em; }
.bold-3 { font-weight: bold; font-size: 1.2em; }

.inline-code {
  background-color: var(--code-bg);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 0.9em;
}

.code-block {
  background-color: var(--code-bg);
  padding: 12px 16px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 8px 0;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 13px;
  line-height: 1.5;
}

.code-block code {
  background: none;
  padding: 0;
}

/* Images */
.page-image {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 8px 0;
}

/* Icon - バッジスタイル */
.icon {
  display: inline-block;
  background-color: #e0e0e0;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.85em;
  color: #555;
  vertical-align: middle;
  margin: 0 2px;
}

/* Quote (引用ブロック) */
.quote {
  background-color: #f5f5f5;
  border-left: 3px solid #ccc;
  padding: 4px 12px;
  margin: 4px 0;
}

/* Math */
.math {
  font-family: "Times New Roman", serif;
  font-style: italic;
}

/* Related Pages */
.related-pages {
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
}

.related-section {
  margin-bottom: 24px;
}

.related-section h3 {
  font-size: 14px;
  font-weight: bold;
  color: #666;
  margin-bottom: 8px;
}

.related-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.related-link {
  display: inline-block;
  padding: 4px 12px;
  background-color: #f0f0f0;
  border-radius: 4px;
  color: var(--link-color);
  text-decoration: none;
  font-size: 13px;
}

.related-link:hover {
  background-color: #e0e0e0;
}

.related-link.two-hop {
  background-color: #f8f8f8;
  opacity: 0.8;
}

/* Index Page */
.index-title {
  font-size: 28px;
  margin-bottom: 8px;
}

.page-count {
  color: #888;
  margin-bottom: 24px;
}

.page-list {
  list-style: none;
}

.page-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-link {
  color: var(--link-color);
  text-decoration: none;
  font-weight: 500;
}

.page-link:hover {
  text-decoration: underline;
}

.page-date {
  color: #888;
  font-size: 12px;
}

/* Responsive */
@media (max-width: 600px) {
  .header-nav {
    flex-direction: column;
    align-items: stretch;
  }

  .search-container {
    max-width: none;
    margin-top: 8px;
  }

  .page-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
`;
}
