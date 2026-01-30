# tomoshi 🔥 - デザイン仕様書 v1.0

## アプリ概要

| 項目 | 内容 |
|------|------|
| **アプリ名** | tomoshi（灯し）🔥 |
| **サブタイトル** | きょうの3つ |
| **目的** | 思考を整理し、毎日の行動を明確にするシンプルなタスク・習慣管理アプリ |
| **形式** | PWA（スマホ最適化） |
| **ターゲット** | Notionのような複雑なツールが苦手な人、タスク管理を「楽しく」続けたい人 |
| **コンセプト** | ゆるい・ふんわり・がんばりすぎない |
| **名前の由来** | 「灯し」= 小さな火を灯すように、毎日の小さな一歩を照らす。松明（たいまつ）のように自分の道を照らしながら進む |

### シンボル

- **メインアイコン**: 🔥（炎）または 🪔（オイルランプ）
- **世界観**: キャラクターが松明を持って旅路を歩く

### 解決したい課題

- 毎日の目標、やること、やったことを整理したい
- ノートをきれいにまとめられるようになりたい
- 考えを視覚化したい
- 漠然と「やらなきゃ」と思っているが、具体的な行動に落とせない
- 複雑なツール（Notion等）は使いこなせない

---

## 機能仕様

### 1. きょうの3つ（メインタスク）

| 項目 | 仕様 |
|------|------|
| 上限 | **3つ** |
| 操作 | タップで完了、長押しで編集/削除/明日へ/もやもやへ |
| 明日へ送る | 未完了タスクをメニューから明日に移動可能 |
| もやもやへ戻す | 未完了タスクをメニューからもやもやボックスに戻す（操作ミスのリカバリー用） |
| 未完了（翌日） | アプリ起動時に持ち越し or 削除を選択 |
| 空スロット | 点線カードで「＋ タスクを追加」表示 |

**設計意図**: 3つに制限することで「選ぶ」行為が発生し、思考が整理される。達成感も得やすい。

### 2. まいにち（習慣）

| 項目 | 仕様 |
|------|------|
| 習慣の数 | **最大3つ** |
| 1習慣の回数 | **最大5回**（時刻チップ方式） |
| 通知 | 時刻を設定したら自動でON（個別OFF可） |
| リセット | 毎日0時に全チェックがリセット |

#### 時刻チップ方式

習慣ごとに複数の時刻（チェックポイント）を設定可能。

**表示例**:
```
💊 くすり
[08:00 ☑] [12:00 □] [20:00 □]

🚶 さんぽ
[07:00 ☑] [18:00 □]

💧 水を飲む
[09:00 ☑] [12:00 □] [15:00 □] [18:00 □] [21:00 □]
```

**作成UI**:
```
┌─────────────────────────────────┐
│  あたらしい習慣                  │
├─────────────────────────────────┤
│  なまえ                         │
│  ┌─────────────────────────┐   │
│  │ くすり                   │   │
│  └─────────────────────────┘   │
│                                 │
│  いつ？                         │
│  [08:00 ×] [12:00 ×] [20:00 ×] │
│  [＋ 時間を追加]                │
│                                 │
│        [ できた！ ]             │
└─────────────────────────────────┘
```

- 「＋」を押すと時刻ピッカーが出る
- チップの「×」で削除
- チップをタップで時刻変更
- 時刻を入れた＝通知ON（デフォルト）

**編集場所**: 設定画面 → 習慣管理ページ（`/settings/habits`）で作成・編集・削除を行う。きょう画面ではチェック操作のみ。

### 3. もやもやボックス

| 項目 | 仕様 |
|------|------|
| 上限 | **なし** |
| 用途 | 「いつかやる」「考え中」の一時置き場 |
| 操作 | タップで「きょうの3つ」に昇格可能 |
| 表示 | 折りたたみ可（デフォルトは展開） |

**設計意図**: マインドマップより遥かにシンプル。分類不要で「放り込む」だけ。

#### 賞味期限機能

放置されたもやもやは徐々にフェードアウトし、整理を促す。

| 経過日数 | 表示状態 |
|----------|----------|
| 0-7日 | 通常表示（opacity: 100%） |
| 8-14日 | 少し薄く（opacity: 70%） |
| 15-21日 | さらに薄く（opacity: 40%） |
| 22日以降 | 消える直前（opacity: 20%）、タップで延長可能 |
| 30日 | 自動削除（または非表示） |

- **延長操作**: タップで14日延長（何度でも可能）
- **設計意図**: 「見なかったことにする」を自然に促す。放置しても罪悪感なく消えていく。

### 4. 今月の目標

| 項目 | 仕様 |
|------|------|
| 数 | **1つだけ** |
| 入力 | 月初に促す（スキップ可） |
| 振り返り | 月末に達成チェック |
| 編集 | 設定画面 |
| 表示 | きょう画面のヘッダー下に1行（目立たない形で） |

**設計意図**: 詳細化すると複雑になるため、1行1個のみに制限。きょう画面に表示することで日々のタスク選択時に意識できる。

### 5. 旅路ビュー（振り返り）

| 項目 | 仕様 |
|------|------|
| 表示 | 30日分のドット＋キャラクター |
| ドット | ●=何か達成、○=未達成 |
| タップ | その日の詳細を表示（完了タスク一覧） |
| アニメーション | キャラクターが道を歩く |

#### 世界観：「松明を持って道を歩くキャラクター」

```
        🔥
        🚶‍♀️
 ─●─●─●─●─●─○─○─○─○─○─🌳─○─○─⛰️─...
  1  2  3  4  5  6  7  8  9  10    15    20
        ↑
      今日ここ！
```

- キャラクターは松明（tomoshi）を持って旅をする
- 毎日タスクを達成すると、キャラが1歩進む
- タスクを達成すると松明の炎が明るく燃える演出
- 連続達成で炎が大きくなる（モチベーション可視化）
- 一定日数でマイルストーン地点に到着（「森に到着！」「山を越えた！」など）
- キャラは複数から選べる（着せ替え要素）

### 6. ゲーミフィケーション

#### 基本要素

| 要素 | 仕様 |
|------|------|
| 連続記録 | 「◯日連続！」表示 |
| 完了エフェクト | 小さな紙吹雪＋カード縮小（0.4秒） |
| 3つ全達成 | 「きょうの3つ達成！🎉」＋星バッジ |

#### 炎のレベルシステム

連続達成日数に応じて松明の炎が変化する。

| レベル | 日数 | 炎の状態 | 表示 |
|--------|------|----------|------|
| 1 | 1-3日 | 小さな火 | 🕯️ |
| 2 | 4-7日 | 安定した炎 | 🔥 |
| 3 | 8-14日 | 明るい松明 | 🔥✨ |
| 4 | 15-30日 | 輝く聖火 | 🔥🌟 |
| 5 | 31日以上 | 伝説の炎 | 特別エフェクト |

#### 「炎を守る」機能（自動・透明）

連続記録が途切れそうな時、裏側で自動的に守る仕組み。
**ユーザーは意識しなくてよい**。アイテム画面や管理UIは作らない。

| 項目 | 仕様 |
|------|------|
| 効果 | 1日休んでも連続記録が途切れない |
| 発動条件 | 7日連続達成ごとに「1日の猶予」が自動付与 |
| 使用 | **完全自動**。ユーザー操作不要 |
| 表示 | 使われた時だけ小さく「🛡️ 炎が守られた」と表示 |

**設計意図**:
- 「罰しない」設計。休息も許容し、プレッシャーを軽減
- アイテム管理などの複雑なUIを追加しない
- ユーザーが「あれ、途切れなかった？ラッキー」くらいの体験

**残り回数の表示**:
- 「あしあと」画面の連続記録の近くに小さく「🛡️ ×2」のように表示
- ホーム画面には表示しない（邪魔にならないように）

#### ストリーク途切れ時の体験

連続記録が途切れた場合、**ネガティブな表現をしない**。

| 状況 | 表示メッセージ例 |
|------|------------------|
| 途切れた時 | 「また新しい旅が始まるね 🌱」 |
| 再開時 | 「おかえり！一緒にまた歩こう」 |
| 長期離脱後 | 「待ってたよ！」 |

**設計方針**: 罪悪感を与えず、いつでも戻ってこれる安心感を提供する。

---

## 画面構成

### ナビゲーション

3タブ構成

```
┌─────────────────────────────────┐
│                                 │
│         [メイン画面]            │
│                                 │
├─────────────────────────────────┤
│  🏠 きょう  │  📅 あしあと  │  ⚙️  │
└─────────────────────────────────┘
        ↑           ↑          ↑
      ホーム      履歴      設定
```

※ 各セクション内に追加ボタンを配置（タスク：空スロット、もやもや：リスト内ボタン）

### 各画面の役割

| 画面 | 内容 |
|------|------|
| **きょう** | 旅路プレビュー＋まいにち＋きょうの3つ＋もやもや |
| **あしあと** | カレンダー式振り返り、過去の達成一覧、旅路の全体マップ、連続記録＋守り残数 |
| **設定** | 今月の目標、習慣編集、通知設定、キャラ選択、テーマ切り替え |

### きょう画面レイアウト

```
┌─────────────────────────────────┐
│  きょう              1/29 (水) │
│  🎯 〇〇を習慣にする            │
├─────────────────────────────────┤
│     🚶‍♀️                         │
│  ─●─●─●─●─●─○─○─○─...         │
│    5日目！あと2つで「森」到着   │
├─────────────────────────────────┤
│ 【まいにち】                    │
│ ┌─────────────────────────────┐│
│ │💊 くすり                     ││
│ │[08:00 ☑] [12:00 □] [20:00 □]││
│ └─────────────────────────────┘│
├─────────────────────────────────┤
│ 【きょうの3つ】                 │
│ ┌─────────────────────────────┐│
│ │ □ 買い物に行く              ││
│ └─────────────────────────────┘│
│ ┌─────────────────────────────┐│
│ │ ☑ メール返信                ││
│ └─────────────────────────────┘│
│ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐│
│ │     ＋ タスクを追加         ││
│ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘│
├─────────────────────────────────┤
│ 【もやもや】              [▼]  │
│  ・来週の予定考える            │
│  ・部屋の片付け                │
├─────────────────────────────────┤
│  🏠 きょう │ 📅 あしあと │ ⚙️   │
└─────────────────────────────────┘
```

---

## デザインシステム

### カラーパレット

#### ベースカラー

| 名前 | HEX | CSS変数 | 用途 |
|------|-----|---------|------|
| 背景 | `#FDFBF7` | `--bg-primary` | 全体背景（ほぼ白、温かみ） |
| カード | `#FFFFFF` | `--bg-card` | カード面 |
| テキスト（主） | `#3D3D3D` | `--text-primary` | 主要テキスト（真っ黒より柔らかく） |
| テキスト（補） | `#9E9E9E` | `--text-secondary` | 補助テキスト |

#### パステルアクセント

| 名前 | HEX | CSS変数 | 用途 |
|------|-----|---------|------|
| コーラル | `#FFDAD6` | `--coral` | きょうの3つ、CTAボタン |
| ミント | `#D4F5E4` | `--mint` | 達成・完了 |
| ラベンダー | `#E8DEFF` | `--lavender` | もやもや・メモ |
| レモン | `#FFF3D1` | `--lemon` | リマインド・注意 |
| スカイ | `#D6EFFF` | `--sky` | まいにち・情報 |

#### CSS定義

```css
:root {
  /* ベース */
  --bg-primary: #FDFBF7;
  --bg-card: #FFFFFF;
  --text-primary: #3D3D3D;
  --text-secondary: #9E9E9E;

  /* パステルアクセント */
  --coral: #FFDAD6;
  --mint: #D4F5E4;
  --lavender: #E8DEFF;
  --lemon: #FFF3D1;
  --sky: #D6EFFF;
}
```

#### 夜の旅路モード（ダークテーマ）

夜間や好みに応じて切り替え可能なダークテーマ。
キャラクターの周りだけ松明で照らされているような演出。

| 名前 | HEX | CSS変数 | 用途 |
|------|-----|---------|------|
| 背景（夜） | `#1A1A2E` | `--bg-primary-dark` | 深い夜空色 |
| カード（夜） | `#252540` | `--bg-card-dark` | 暗めのカード |
| テキスト（夜・主） | `#F0F0F0` | `--text-primary-dark` | 明るいテキスト |
| テキスト（夜・補） | `#A0A0A0` | `--text-secondary-dark` | 補助テキスト |
| 炎の光 | `#FFD700` | `--flame-glow` | 松明の周りの光 |

**切り替え方法**:
- 設定画面から手動切り替え
- システム設定に連動

**演出**:
- キャラクターの周囲に炎のグロー効果
- カードは松明に照らされているように、中央が少し明るいグラデーション

```css
/* ダークテーマ */
[data-theme="dark"] {
  --bg-primary: #1A1A2E;
  --bg-card: #252540;
  --text-primary: #F0F0F0;
  --text-secondary: #A0A0A0;

  /* アクセントは少し暗めに調整 */
  --coral: #E8A5A0;
  --mint: #8BCFB0;
  --lavender: #B8A5E0;
  --lemon: #E0C87A;
  --sky: #8AC0E0;
}
```

### フォント

| 用途 | フォント | 理由 |
|------|----------|------|
| 見出し・タイトル | **Kiwi Maru** | はらい・はねがなめらか、「ゆるさ」が出る |
| 本文・UI | **Zen Maru Gothic** | 丸みがあって読みやすい、統一感 |
| 数値・バッジ | **Kiwi Maru** | 見出しと統一 |

#### CSS定義

```css
/* Google Fonts読み込み */
@import url('https://fonts.googleapis.com/css2?family=Kiwi+Maru:wght@400;500&family=Zen+Maru+Gothic:wght@400;500&display=swap');

:root {
  --font-heading: 'Kiwi Maru', serif;
  --font-body: 'Zen Maru Gothic', sans-serif;
}

h1, h2, h3, .heading {
  font-family: var(--font-heading);
}

body, p, .body-text {
  font-family: var(--font-body);
}
```

### アイコン方針

**ミックス方式**を採用:

| 用途 | 方式 | 例 |
|------|------|-----|
| ナビ・機能アイコン | 線画（丸角・フラット） | タブバー、設定項目 |
| 達成演出・ステータス | 絵文字 | ⭐️🎉✅💪🔥 |
| 習慣アイコン | 絵文字 | 💊🚶💧🏃📖 |
| マイルストーン | 絵文字 or 画像 | 🌳⛰️🏠🏰 |

### UIコンポーネント

#### カード

```css
.card {
  background: var(--bg-card);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 16px;
}

/* カラーバリエーション */
.card--coral { background: var(--coral); }
.card--mint { background: var(--mint); }
.card--lavender { background: var(--lavender); }
.card--sky { background: var(--sky); }
```

#### ボタン

```css
.button {
  border-radius: 9999px; /* ピル型 */
  padding: 12px 24px;
  font-family: var(--font-heading);
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.button--primary {
  background: var(--coral);
  color: var(--text-primary);
}
```

#### チップ（時刻チップ）

```css
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-family: var(--font-body);
}

.chip--time {
  background: var(--sky);
}

.chip--completed {
  background: var(--mint);
}
```

### マイクロインタラクション

| タイミング | アニメーション | 詳細 |
|------------|----------------|------|
| タスク完了 | 小さな紙吹雪＋カード縮小 | 0.4秒、CSS animation |
| 3つ全達成 | 「きょうの3つ達成！🎉」表示 | 画面中央にオーバーレイ |
| 習慣チェック | ✓がポンと跳ねる | transform: scale |
| 画面遷移 | ふわっとフェード | opacity + transform |
| +ボタン | ふわふわ浮遊感 | 影が上下に微動 |
| キャラ移動 | 1歩ずつ歩く | CSS animation、達成時 |

---

## 画像アセット

### 画像が必要な箇所と対応方針

| 箇所 | 代用方法（CSS等） | 画像生成が必要か |
|------|-------------------|------------------|
| 歩くキャラクター | CSS絵文字（🚶‍♀️）で仮対応 | ✅ 必要 |
| 道/旅路の背景 | CSSグラデーション＋ドット | ⚠️ あると良い |
| 完了エフェクト | CSS紙吹雪アニメーション | ❌ 不要 |
| マイルストーン地点 | 絵文字（🌳🏠⛰️）で仮対応 | ⚠️ あると良い |
| 称号バッジ | CSS＋絵文字で対応 | ❌ 不要 |
| 習慣アイコン | 絵文字（💊🚶💧）で対応 | ❌ 不要 |
| アプリアイコン | - | ✅ 必要 |
| 空状態イラスト | テキスト＋絵文字で仮対応 | ⚠️ あると良い |

### 画像生成AIプロンプト集

#### 1. 歩くキャラクター（メイン）- 松明を持つ旅人

**基本キャラクター - 横向き歩行（松明持ち）**
```
A cute, simple character walking to the right, chibi style,
holding a small torch with gentle flame,
flat design, minimal details, soft pastel colors,
small round body, happy determined expression,
transparent background, suitable for app UI,
kawaii Japanese illustration style,
2D vector art, no outline or thin soft outline,
the torch flame should glow warmly (orange/coral color)
```

**バリエーション - 喜び（炎が大きく燃える）**
```
Same character jumping with joy, sparkles around,
celebrating achievement, arms raised,
the torch flame is bigger and brighter,
same style as base character
```

**バリエーション - 寝ている/休憩（炎が小さい）**
```
Same character sleeping or resting,
the torch is placed beside them with a tiny gentle flame,
used for "no tasks today" state,
peaceful expression, small "zzz" effect
```

**バリエーション - 連続達成（炎がとても大きい）**
```
Same character walking proudly,
the torch flame is large and vibrant,
sparkles or small fire particles around,
represents a long streak of achievements
```

#### 2. 旅路の風景（マイルストーン地点）

**草原スタート地点**
```
Simple flat illustration of a gentle green hill,
soft pastel green, minimal clouds,
kawaii style, suitable as app background element,
very simple, low detail, transparent or white background
```

**森のマイルストーン**
```
Cute simple forest illustration, 3-4 round trees,
soft green and brown pastels, flat design,
kawaii Japanese style, minimal detail,
small enough for app milestone marker
```

**山のマイルストーン**
```
Simple cute mountain illustration,
soft purple/blue pastels, snow on top,
flat minimal design, kawaii style
```

**ゴール - 城/家**
```
Tiny cute castle or cottage illustration,
pastel colors, soft pink/cream,
flat design, kawaii style,
achievement/goal destination feeling
```

#### 3. アプリアイコン

```
App icon for "tomoshi" (meaning "to light" in Japanese),
cute stylized torch or flame icon,
soft coral/orange pastel gradient background (#FFDAD6 to #FFE4B5),
minimal flat design, rounded square format,
kawaii Japanese app style,
warm and inviting feeling,
the flame should look friendly and gentle, not aggressive
```

**代替案 - キャラ入り**
```
App icon featuring a small cute chibi character
holding a torch/flame,
soft warm pastel background,
minimal flat design, rounded square format,
kawaii Japanese illustration style,
the character looks happy and determined
```

#### 4. 空状態イラスト

**タスクなし状態**
```
Cute illustration for empty state,
character relaxing in a hammock or sitting peacefully,
text space below for "タスクがありません",
soft pastel colors, kawaii style,
feeling of "it's okay to rest"
```

**もやもや空状態**
```
Cute thought bubble or cloud illustration,
soft lavender pastel color,
empty/waiting feeling but positive,
kawaii style, minimal
```

---

## 参考資料

### デザイン参考

- [Caho TODO](https://travelwork.jp/2022/06/kawaii_task/) - 淡い色使い、イラストレーターコラボ
- [mizutamaTODO](https://app-attend.com/cute-task-app/) - ゆるいイラスト、片手操作しやすいボタン配置
- [Finch](https://gamificationplus.uk/which-gamified-habit-building-app-do-i-think-is-best-in-2025/) - ペットが育つメタファー、行動心理学を「楽しく」伝える
- [Habits Garden](https://habitsgarden.com/) - タスク完了で花が育つ、視覚的な達成感
- [Habicat](https://apps.apple.com/us/app/habicat-gamified-habit/id6444766871) - ピクセルアート、隠し実績のイースターエッグ
- [Dribbble Pastel UI](https://dribbble.com/tags/pastel_ui) - ニューモーフィズム×パステル

### フォント参考

- [Google Fonts 丸ゴシック7選](https://www.softmachine.jp/blog/2024/07/marugo-googlefonts/)
- [かわいい・ポップな日本語フォント20選](https://www.softmachine.jp/blog/2024/01/unique-googlefonts/)
- [デザイナーが選ぶかわいいGoogleフォント](https://bitbeans.com/blog/kawaii_googlefonts/)

---

## 追加機能

仕様策定後に実装された機能。

### 1. PWA（Progressive Web App）

| 項目 | 仕様 |
|------|------|
| オフライン対応 | Service Workerによるキャッシュ、オフライン時も基本操作可能 |
| インストール | ホーム画面に追加可能（ネイティブアプリのように起動） |
| オフラインバナー | ネットワーク切断時に通知バナーを表示 |

### 2. Passkey認証

パスワードレスのセキュアな認証方式。

| 項目 | 仕様 |
|------|------|
| 方式 | WebAuthn / Passkey |
| 利点 | パスワード不要、生体認証対応、フィッシング耐性 |

### 3. プッシュ通知

習慣の時刻に合わせてリマインダーを送信。

| 項目 | 仕様 |
|------|------|
| 方式 | Web Push Notifications |
| トリガー | 習慣に設定した時刻 |
| 設定 | 設定画面から有効/無効を切り替え |

### 4. マイルストーン到達トースト

旅路のマイルストーンに到達した時に祝福メッセージを表示。

| 日数 | マイルストーン | メッセージ例 |
|------|---------------|-------------|
| 7日 | 草原 | 「草原に到着！」 |
| 14日 | 森 | 「森に到着！」 |
| 21日 | 川 | 「川に到着！」 |
| 30日 | 山 | 「山に到着！」 |

### 5. お帰りメッセージ

長期離脱後に復帰した時、ポジティブなメッセージでお出迎え。

**設計意図**: 「罰しない」思想の徹底。いつでも戻ってこれる安心感を提供する。

### 6. 明日のタスク追加・確認機能

タスク追加時に「あした」を選択して直接追加でき、明日のタスクをモーダルで確認・編集・削除できる機能。

| 項目 | 仕様 |
|------|------|
| 日付選択 | タスク追加時に「きょう」「あした」を選択可能 |
| 上限 | 明日も3つまで |
| 確認方法 | AddModalからリンクでTomorrowTasksModalを開く |
| 操作 | モーダル内で編集・削除・「きょうへ移動」が可能 |
| トースト | 「明日へ」移動時にトースト通知（「あしたのタスクを見る」リンク付き） |

**設計方針**:
- **きょう画面はきょうのまま**（セクション追加しない）
- **あしあと画面は過去専用**（世界観を維持）
- **モーダルでオンデマンド表示**（必要な時だけアクセス）

**AddModal の日付選択UI**:
```
┌─────────────────────────────────┐
│ きょうの3つに追加               │
├─────────────────────────────────┤
│ [きょうの3つ] [もやもや]        │  ← 既存タブ
├─────────────────────────────────┤
│ いつ？  [◉ きょう] [○ あした]   │  ← タスクモード時のみ
│                                 │
│ ┌─────────────────────────────┐│
│ │ やりたいことを入力...        ││
│ └─────────────────────────────┘│
│                                 │
│ 📅 あしたのタスクを見る (2件)   │  ← リンク
└─────────────────────────────────┘
```

---

## 変更履歴

| バージョン | 日付 | 内容 |
|------------|------|------|
| v1.0 | 2025-01-29 | 初版作成 |
| v1.1 | 2025-01-29 | アプリ名を「tomoshi」に変更、松明モチーフ追加、キャラクター設定更新 |
| v1.2 | 2025-01-29 | 炎のレベルシステム、「炎を守る」アイテム、ストリーク途切れ時の体験設計、もやもや賞味期限機能、夜の旅路モード追加 |
| v1.3 | 2025-01-30 | フローティングボタン廃止、テーマ自動切り替え削除、習慣編集場所を明記、追加機能セクション追加（PWA、Passkey認証、プッシュ通知、マイルストーントースト、お帰りメッセージ） |
| v1.4 | 2025-01-31 | 明日のタスク追加・確認機能追加 |
