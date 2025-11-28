/**
 * クライアントサイドJavaScript生成モジュール
 * 検索機能のJSを生成
 */

/**
 * 検索機能のJavaScriptを生成
 */
export function generateSearchJS(): string {
  return `// Cosense Archiver - Search Functionality

(function() {
  let searchIndex = null;
  let searchInput = null;
  let searchResults = null;
  let debounceTimer = null;

  // 検索インデックスを読み込む
  async function loadSearchIndex() {
    try {
      // ページのパスに応じてインデックスのパスを調整
      const basePath = window.location.pathname.includes('/pages/') ? '..' : '.';
      const response = await fetch(basePath + '/search.json');
      searchIndex = await response.json();
    } catch (error) {
      console.error('Failed to load search index:', error);
    }
  }

  // 検索を実行
  function search(query) {
    if (!searchIndex || !query.trim()) {
      return [];
    }

    const keywords = query.trim().toLowerCase().split(/\\s+/);
    const results = [];

    for (const page of searchIndex.pages) {
      const lowerTitle = page.title.toLowerCase();
      const lowerContent = page.content.toLowerCase();

      // すべてのキーワードが含まれているか確認
      const allMatch = keywords.every(keyword =>
        lowerTitle.includes(keyword) || lowerContent.includes(keyword)
      );

      if (!allMatch) continue;

      // スコア計算
      let score = 0;
      const titleMatch = keywords.some(k => lowerTitle.includes(k));

      if (titleMatch) {
        score += 100;
        if (lowerTitle === query.toLowerCase()) {
          score += 50;
        }
      }

      // スニペット生成
      let snippet = '';
      const firstKeyword = keywords[0];
      const index = lowerContent.indexOf(firstKeyword);
      if (index !== -1) {
        const start = Math.max(0, index - 30);
        const end = Math.min(page.content.length, index + 70);
        snippet = page.content.slice(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < page.content.length) snippet = snippet + '...';
      } else {
        snippet = page.content.slice(0, 100) + '...';
      }

      results.push({
        title: page.title,
        snippet: snippet,
        matchType: titleMatch ? 'title' : 'content',
        score: score
      });
    }

    // スコアでソート
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, 10); // 最大10件
  }

  // 検索結果を表示
  function displayResults(results) {
    if (!searchResults) return;

    if (results.length === 0) {
      searchResults.innerHTML = '<div class="search-result-item">検索結果がありません</div>';
      searchResults.classList.add('active');
      return;
    }

    // ページパスを取得
    const basePath = window.location.pathname.includes('/pages/') ? '' : 'pages/';

    const html = results.map(result => {
      const encodedTitle = encodeURIComponent(result.title);
      return \`<div class="search-result-item" data-href="\${basePath}\${encodedTitle}.html">
        <div class="search-result-title">\${escapeHtml(result.title)}</div>
        <div class="search-result-snippet">\${escapeHtml(result.snippet)}</div>
      </div>\`;
    }).join('');

    searchResults.innerHTML = html;
    searchResults.classList.add('active');

    // クリックイベントを追加
    searchResults.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', function() {
        const href = this.getAttribute('data-href');
        if (href) {
          window.location.href = href;
        }
      });
    });
  }

  // HTMLエスケープ
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 初期化
  function init() {
    searchInput = document.getElementById('search-input');
    searchResults = document.getElementById('search-results');

    if (!searchInput || !searchResults) return;

    // 検索インデックスを読み込む
    loadSearchIndex();

    // 入力イベント
    searchInput.addEventListener('input', function() {
      const query = this.value;

      // デバウンス
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (query.trim()) {
          const results = search(query);
          displayResults(results);
        } else {
          searchResults.classList.remove('active');
        }
      }, 200);
    });

    // フォーカスアウトで結果を閉じる（遅延あり）
    searchInput.addEventListener('blur', function() {
      setTimeout(() => {
        searchResults.classList.remove('active');
      }, 200);
    });

    // フォーカスで結果を再表示
    searchInput.addEventListener('focus', function() {
      if (this.value.trim()) {
        const results = search(this.value);
        displayResults(results);
      }
    });

    // Escapeで閉じる
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        searchResults.classList.remove('active');
        this.blur();
      }
    });
  }

  // DOMContentLoaded で初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}
