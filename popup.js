let currentEntries = [];
let currentFormat = 'js';

const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const emptyEl = document.getElementById('empty');
const tableBody = document.getElementById('tableBody');
const codeBlock = document.getElementById('codeBlock');
const extractBtn = document.getElementById('extractBtn');
const copyBtn = document.getElementById('copyBtn');

// 抽出ボタン
extractBtn.addEventListener('click', async () => {
  statusEl.className = 'status status--info';
  statusEl.textContent = '抽出中...';
  resultsEl.style.display = 'none';
  emptyEl.style.display = 'none';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url || !tab.url.includes('docs.google.com/forms')) {
      statusEl.className = 'status status--error';
      statusEl.textContent = 'Google Formのページを開いてください';
      return;
    }

    // content scriptがまだ注入されていない場合に備えて注入
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    }).catch(() => {});

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extract' });

    if (response && response.entries && response.entries.length > 0) {
      currentEntries = response.entries;
      renderTable();
      renderCode();
      resultsEl.style.display = 'block';
      copyBtn.disabled = false;
      statusEl.className = 'status status--success';
      statusEl.textContent = `${currentEntries.length}件のentry IDを検出しました`;
    } else {
      emptyEl.style.display = 'block';
      statusEl.className = 'status status--error';
      statusEl.textContent = 'entry IDが見つかりませんでした';
    }
  } catch (err) {
    statusEl.className = 'status status--error';
    statusEl.textContent = `エラー: ${err.message}`;
  }
});

// テーブル描画
function renderTable() {
  tableBody.innerHTML = currentEntries.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(e.label)}</td>
      <td><span class="entry-id">${escapeHtml(e.entryId)}</span></td>
      <td><span class="type-badge">${escapeHtml(e.type)}</span></td>
    </tr>
  `).join('');
}

// コードブロック描画
function renderCode() {
  codeBlock.textContent = formatEntries(currentEntries, currentFormat);
}

// フォーマット変換
function formatEntries(entries, format) {
  if (format === 'js') {
    const fields = entries.map((e) => {
      const key = toCamelCase(e.label);
      return `  ${key}: '${e.entryId}',  // ${e.label}`;
    }).join('\n');
    return `const GOOGLE_FORM_FIELDS = {\n${fields}\n};`;
  }

  if (format === 'json') {
    const obj = {};
    entries.forEach((e) => {
      obj[e.label] = e.entryId;
    });
    return JSON.stringify(obj, null, 2);
  }

  // TSV
  const header = 'ラベル\tEntry ID\tタイプ';
  const rows = entries.map((e) => `${e.label}\t${e.entryId}\t${e.type}`);
  return [header, ...rows].join('\n');
}

// ラベルをcamelCaseに変換
function toCamelCase(label) {
  // 日本語の場合はローマ字変換せずそのまま返す（英語の場合のみcamelCase化）
  const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(label);
  if (isJapanese) {
    // 日本語ラベルの場合は field_N 形式
    return `field_${label.replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '')}`;
  }
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// フォーマットタブ切り替え
document.querySelectorAll('.format-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelector('.format-tab.active').classList.remove('active');
    tab.classList.add('active');
    currentFormat = tab.dataset.format;
    renderCode();
  });
});

// コードブロッククリックでコピー
codeBlock.addEventListener('click', () => copyToClipboard());

// コピーボタン
copyBtn.addEventListener('click', () => copyToClipboard());

async function copyToClipboard() {
  const text = formatEntries(currentEntries, currentFormat);
  await navigator.clipboard.writeText(text);
  const originalText = copyBtn.textContent;
  copyBtn.textContent = 'コピー済み!';
  setTimeout(() => { copyBtn.textContent = originalText; }, 1500);
}
