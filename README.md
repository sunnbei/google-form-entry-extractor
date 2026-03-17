# Google Form Entry Extractor

Google Formのプレビューページから `entry.XXXXXXX` 形式のフィールドIDを一括抽出するChrome拡張機能。

フォームへのプログラム的な送信（GAS等）を行う際に必要なentry IDの特定作業を自動化します。

## 機能

- Google Formページからentry IDとラベルを自動抽出
- 3段階のフォールバック抽出ロジック（`data-params` → `input[name]` → `FB_PUBLIC_LOAD_DATA_`）
- フィールドタイプの自動判別（text, textarea, radio, checkbox, dropdown, date, time 等）
- 出力フォーマット切り替え（JavaScript / JSON / TSV）
- ワンクリックでクリップボードにコピー

## インストール

1. このリポジトリをクローン
   ```
   git clone https://github.com/sunnbei/google-form-entry-extractor.git
   ```
2. Chromeで `chrome://extensions` を開く
3. 「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」からクローンしたディレクトリを選択

## 使い方

1. Google Formのプレビューページ（`/viewform`）を開く
2. 拡張機能アイコンをクリック
3. 「Entry IDを抽出」ボタンを押す
4. 結果をJS / JSON / TSV形式で確認・コピー

## 出力例

**JavaScript:**
```js
const GOOGLE_FORM_FIELDS = {
  yourName: 'entry.123456789',  // Your Name
  email: 'entry.987654321',  // Email
};
```

**JSON:**
```json
{
  "Your Name": "entry.123456789",
  "Email": "entry.987654321"
}
```

## ライセンス

MIT
