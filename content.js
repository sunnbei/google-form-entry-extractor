// Google Formプレビューページからentry IDとフィールド情報を抽出する

function extractEntries() {
  const entries = [];

  // 方法1: data-params属性からフィールド情報を取得（最も信頼性が高い）
  document.querySelectorAll('[data-params]').forEach((el) => {
    try {
      // data-paramsは "%.@.[ID,LABEL,..." のような形式
      const raw = el.getAttribute('data-params');
      // entry IDを抽出
      const entryMatch = raw.match(/\[(\d{6,12}),/);
      // ラベルを抽出（2番目の引用符で囲まれた文字列）
      const labelMatch = raw.match(/,"([^"]+)"/);
      if (entryMatch) {
        entries.push({
          entryId: `entry.${entryMatch[1]}`,
          label: labelMatch ? labelMatch[1] : '(不明)',
          type: detectFieldType(el),
        });
      }
    } catch {
      // パース失敗は無視
    }
  });

  // 方法2: input/textarea/selectのname属性から直接取得（フォールバック）
  if (entries.length === 0) {
    document.querySelectorAll('input[name^="entry."], textarea[name^="entry."], select[name^="entry."]').forEach((el) => {
      const entryId = el.name;
      // 重複排除
      if (entries.some((e) => e.entryId === entryId)) return;

      // ラベルを探す（親要素を遡ってlabelを見つける）
      let label = '(不明)';
      const container = el.closest('[data-params]') || el.closest('.freebirdFormviewerComponentsQuestionBaseRoot');
      if (container) {
        const labelEl = container.querySelector('[data-initial-value]') || container.querySelector('span[role="heading"]') || container.querySelector('.freebirdFormviewerComponentsQuestionBaseTitle');
        if (labelEl) label = labelEl.textContent.trim();
      }

      entries.push({
        entryId,
        label,
        type: el.tagName.toLowerCase() === 'textarea' ? 'textarea' : el.type || 'text',
      });
    });
  }

  // 方法3: FB_PUBLIC_LOAD_DATA_ からパース（SPA形式のフォーム）
  if (entries.length === 0) {
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent;
      if (text.includes('FB_PUBLIC_LOAD_DATA_')) {
        try {
          const match = text.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(.+);/s);
          if (match) {
            const data = JSON.parse(match[1]);
            // data[1][1] にフィールド配列がある
            const fields = data?.[1]?.[1];
            if (Array.isArray(fields)) {
              fields.forEach((field) => {
                const label = field?.[1] || '(不明)';
                const id = field?.[4]?.[0]?.[0];
                const typeCode = field?.[3];
                if (id) {
                  entries.push({
                    entryId: `entry.${id}`,
                    label,
                    type: mapTypeCode(typeCode),
                  });
                }
              });
            }
          }
        } catch {
          // パース失敗
        }
        break;
      }
    }
  }

  return entries;
}

function detectFieldType(el) {
  const html = el.innerHTML;
  if (el.querySelector('textarea') || el.querySelector('[data-initial-value]')) return 'textarea';
  if (el.querySelector('input[type="date"]')) return 'date';
  if (el.querySelector('input[type="time"]')) return 'time';
  if (el.querySelector('[role="listbox"]') || el.querySelector('select')) return 'dropdown';
  if (el.querySelector('[role="radiogroup"]')) return 'radio';
  if (el.querySelector('[role="group"]') || el.querySelector('[role="checkbox"]')) return 'checkbox';
  if (el.querySelector('input[type="email"]')) return 'email';
  if (el.querySelector('input[type="url"]')) return 'url';
  if (el.querySelector('input[type="number"]')) return 'number';
  return 'text';
}

function mapTypeCode(code) {
  const map = {
    0: 'text',
    1: 'textarea',
    2: 'radio',
    3: 'dropdown',
    4: 'checkbox',
    5: 'scale',
    7: 'grid',
    9: 'date',
    10: 'time',
    11: 'file',
  };
  return map[code] || 'text';
}

// popupからのメッセージに応答
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract') {
    const entries = extractEntries();
    sendResponse({ entries });
  }
  return true;
});
