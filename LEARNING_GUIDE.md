# Kafka学習ガイド - 7つのステップ

このガイドでは、Kafkaの基礎から実践まで、7つのステップで体系的に学習します。

**前提**: `GETTING_STARTED.md`を完了していること

---

## このガイドで学べること

### ✅ 実践的な使い方（このガイドでカバー）

1. **Producer/Consumer/Topicの使い方** - メッセージの送受信
2. **Partitionの使い方** - keyによる振り分けと順序保証
3. **Consumer Groupの使い方** - 負荷分散の仕組み
4. **Offsetの管理** - 読み取り位置の制御とコミット
5. **実践的な操作** - リアルタイム受信、エラーハンドリング

### 📚 内部の仕組み（オプション）

Kafkaの内部アーキテクチャや、なぜ高速なのかを知りたい場合は、**`KAFKA_INTERNALS.md`** を参照してください：
- Kafkaが生まれた背景と理由
- なぜKafkaは高速なのか？（シーケンシャル書き込み、Zero-Copy、ページキャッシュ）
- ログベース設計とレプリケーションの仕組み

---

## 📋 学習ステップ一覧

| ステップ | 学習内容 | 所要時間 | 実行順序 |
|---------|---------|---------|---------|
| **ステップ1** | Consumer Group学習 | 2-3時間 | producer → consumer |
| **ステップ2** | Partition学習 | 2-3時間 | producer → consumer |
| **ステップ3** | Offset学習 | 2-3時間 | consumer のみ |
| **ステップ4** | リアルタイム受信学習 | 1-2時間 | consumer → producer |
| **ステップ5** | Offsetリセット学習 | 3-4時間 | 4パターン |
| **ステップ6** | Offsetコミット学習 | 2-3時間 | setup → auto/manual |
| **ステップ7** | Offset確認学習 | 1-2時間 | demo → view |

---

## ステップ1: Consumer Group学習

### 🎯 学習目標

- 同じ`groupId`のConsumerは、メッセージを**分け合う**（負荷分散）
- 異なる`groupId`のConsumerは、メッセージを**独立して受信**

### 📊 データフロー

```
【シナリオ1: 単一Consumer】
┌────────────────┐
│  Producer      │ 10件のメッセージを送信
│  (送信者)       │
└────────┬───────┘
         │
         ↓
┌────────────────┐
│  learn-topic   │ 10件保管
│  (Kafkaトピック)│
└────────┬───────┘
         │
         ↓ 全10件受信
┌────────────────┐
│  Consumer      │ groupId: consumer-learn-group
│  (受信者)       │
└────────────────┘

【シナリオ2: 複数Consumer（同じgroupId）】
┌────────────────┐
│  Producer      │ 10件のメッセージを送信
└────────┬───────┘
         │
         ↓
┌────────────────┐
│  learn-topic   │ 10件保管
└────┬───────┬───┘
     │       │
     │       │ 負荷分散
     ↓       ↓
┌────────┐ ┌────────┐
│Consumer1│ │Consumer2│ 同じgroupId: consumer-learn-group
│ 5件受信 │ │ 5件受信 │
└────────┘ └────────┘
```

### 🚀 実行手順

#### 手順1: メッセージ送信

```bash
npm run learn:producer-group
```

**期待される出力:**
```
✓ メッセージ 0 を送信
✓ メッセージ 1 を送信
...
✓ メッセージ 9 を送信

全10件のメッセージを送信完了！
```

**データの状態:**
```
learn-topic: [msg0, msg1, msg2, msg3, msg4, msg5, msg6, msg7, msg8, msg9]
             ↑ 10件のメッセージが保管された
```

#### 手順2: Consumer起動（単一）

**ターミナル1:**
```bash
npm run learn:consumer-group
```

**期待される出力:**
```
========================================
Consumer Group: consumer-learn-group
========================================

[受信 1] Offset 0: メッセージ 0
[受信 2] Offset 1: メッセージ 1
...
[受信 10] Offset 9: メッセージ 9
```

**データフロー:**
```
Consumer1 ← [msg0, msg1, msg2, ..., msg9] (全10件受信)
```

#### 手順3: 複数Consumer起動（負荷分散確認）

**まず、新しいメッセージを送信:**
```bash
npm run learn:producer-group
```

**ターミナル1:**
```bash
npm run learn:consumer-group
```

**ターミナル2:**
```bash
npm run learn:consumer-group
```

**期待される動作:**
```
ターミナル1: [msg10, msg12, msg14, msg16, msg18] (約5件)
ターミナル2: [msg11, msg13, msg15, msg17, msg19] (約5件)
             ↑ 合計10件を分け合う
```

### ✅ 確認方法

#### Kafka UIで確認

1. http://localhost:8080 → Consumers
2. `consumer-learn-group`をクリック
3. 確認ポイント:
   - **Consumer数**: 2台
   - **Partition割り当て**: Consumer1とConsumer2に分配
   - **Current Offset**: 20（10件 + 10件）

### 💡 理解度チェック

**Q1**: 同じ`groupId`で3つのConsumerを起動したらどうなる？
<details>
<summary>答え</summary>
3つのConsumerがメッセージを分け合う（負荷分散）
</details>

**Q2**: 異なる`groupId`で起動したらどうなる？
<details>
<summary>答え</summary>
独立してメッセージを受信（全メッセージを受け取る）
</details>

---

## ステップ2: Partition学習

### 🎯 学習目標

- 同じ`key`のメッセージは、同じPartitionに送られる
- Partitionごとに順序が保証される

### 📊 データフロー

```
【Partitionへの振り分け】
┌────────────────┐
│  Producer      │ key: user-0, user-1, user-2, user-3, user-4
└────────┬───────┘  15件のメッセージ
         │
         │ keyでPartition決定
         ↓
┌────────────────────────────────────┐
│     partition-topic (3分割)         │
├──────────┬──────────┬──────────────┤
│Partition0│Partition1│Partition2    │
│user-1    │user-2    │user-0        │
│user-3    │          │user-4        │
│(6件)     │(3件)     │(6件)         │
└─────┬────┴─────┬────┴──────┬───────┘
      │          │           │
      └──────────┴───────────┘
                 │
                 ↓ 全Partitionから受信
        ┌────────────────┐
        │   Consumer     │
        └────────────────┘
```

### 🚀 実行手順

#### 手順1: メッセージ送信（Partition振り分け）

```bash
npm run learn:partition-producer
```

**期待される出力:**
```
✓ partition-topic を作成（パーティション数: 3）

✓ メッセージ 0 → Partition 2 (key: user-0)
✓ メッセージ 1 → Partition 0 (key: user-1)
✓ メッセージ 2 → Partition 1 (key: user-2)
✓ メッセージ 3 → Partition 0 (key: user-3)
✓ メッセージ 4 → Partition 2 (key: user-4)
✓ メッセージ 5 → Partition 2 (key: user-0) ← user-0は必ずPartition 2
...
```

**重要**: 同じkey（例: `user-0`）は必ず同じPartition（例: Partition 2）

**データの状態:**
```
Partition 0: [msg1(user-1), msg3(user-3), msg6(user-1), ...]
Partition 1: [msg2(user-2), msg7(user-2), ...]
Partition 2: [msg0(user-0), msg4(user-4), msg5(user-0), ...]
```

#### 手順2: Consumer起動

```bash
npm run learn:partition-consumer
```

**期待される出力:**
```
[受信] Partition 0:
  Key: user-1
  Value: メッセージ 1 (key: user-1)

--- Keyごとのパーティション ---
  user-1 → Partition 0
  user-0 → Partition 2
  user-2 → Partition 1
  ...
```

### ✅ 確認方法

#### Kafka UIで確認

1. http://localhost:8080 → Topics → partition-topic
2. 「Messages」タブを開く
3. Partitionでフィルタして確認

### 💡 理解度チェック

**Q1**: user-123の「商品追加」「決済」「注文完了」を順序保証するには？
<details>
<summary>答え</summary>
全てのメッセージに`key: 'user-123'`を指定する。同じPartition内では順序が保証される。
</details>

---

## ステップ3: Offset学習

### 🎯 学習目標

- Offsetは、Partition内のメッセージ位置（0から始まる）
- 読み取り開始位置を制御できる

### 📊 データフロー

```
【Offsetの概念】
learn-topic (Partition 0):
┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
│ 0  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │ 8  │ 9  │
└────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
 ↑                   ↑                              ↑
beginning           offset: 5                    latest

【パターン1: beginning】
Consumer → [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] (全件受信)

【パターン2: latest】
Consumer → [] (既存メッセージは読まず、新規メッセージのみ待機)

【パターン3: offset 5】
Consumer → [5, 6, 7, 8, 9] (Offset 5から受信)
```

### 🚀 実行手順

#### パターン1: 最初から読む

```bash
npm run learn:offset -- beginning
```

**期待される出力:**
```
Offset 0 から読み始めます

[1] Offset 0: メッセージ 0
[2] Offset 1: メッセージ 1
...
[10] Offset 9: メッセージ 9
```

#### パターン2: 最新のみ読む

```bash
npm run learn:offset -- latest
```

**期待される動作:**
- 既存メッセージは読まず、待機状態
- 別ターミナルで`npm run learn:producer-group`を実行すると、新規メッセージのみ受信

#### パターン3: 特定のOffsetから読む

```bash
npm run learn:offset -- 5
```

**期待される出力:**
```
[1] Offset 5: メッセージ 5
[2] Offset 6: メッセージ 6
...
```

### ✅ 確認方法

```bash
npm run learn:view-offset offset-learn-group learn-topic
```

**期待される出力:**
```
【現在のOffset】
  Current Offset: 10
  → 次回は Offset 10 から読み始める

【進捗状況】
  読み終えたメッセージ: 10件
  未読メッセージ: 0件
```

### 💡 理解度チェック

**Q1**: Current Offset: 5 は、どこまで読んだことを意味するか？
<details>
<summary>答え</summary>
Offset 0〜4まで読んだ。次は Offset 5 から読む。
</details>

---

## ステップ4: リアルタイム受信学習

### 🎯 学習目標

- Kafkaは低遅延（数ミリ秒〜数十ミリ秒）
- Producer→Consumerの非同期動作を理解

### 📊 データフロー

```
【時系列フロー】
時刻T: Producer送信 → Kafka保管 → Consumer受信（遅延: 12ms）
     │                  │              │
     ↓                  ↓              ↓
T+0ms: msg0作成     T+3ms: 保管     T+15ms: 受信
     │                                │
     └─────────── 遅延: 15ms ─────────┘

【リアルタイム受信】
┌────────────┐ 3秒ごと  ┌──────────┐ 即座に  ┌────────────┐
│  Producer  │─────────▶│ Kafka    │────────▶│  Consumer  │
│            │ 送信      │          │ 配信    │ (待機中)   │
└────────────┘          └──────────┘         └────────────┘
   T+0s: msg0送信
   T+3s: msg1送信                             T+0.012s: msg0受信
   T+6s: msg2送信                             T+3.015s: msg1受信
   ...                                        ...
```

### 🚀 実行手順

#### 手順1: Consumer起動（待機）

**ターミナル1:**
```bash
npm run learn:realtime-consumer
```

**期待される出力:**
```
リアルタイムConsumer起動
メッセージを待機中...
```

#### 手順2: Producer起動（送信開始）

**ターミナル2:**
```bash
npm run learn:realtime-producer
```

**期待される出力:**
```
[2026-04-17T06:30:00.123Z] ✓ メッセージ 0 を送信
[2026-04-17T06:30:03.456Z] ✓ メッセージ 1 を送信
...
```

#### 手順3: Consumer側で遅延確認

**ターミナル1の出力:**
```
📩 メッセージ受信 (1件目)
受信時刻: 2026-04-17T06:30:00.135Z
送信時刻: 2026-04-17T06:30:00.123Z
遅延: 12ms ← 送信から受信まで12ミリ秒
```

### 💡 理解度チェック

**Q1**: なぜ低遅延なのか？
<details>
<summary>答え</summary>
Kafkaはメッセージをメモリとディスクに効率的に保存し、Consumerはポーリングで常に待機しているため。
</details>

---

## ステップ5: Offsetリセット学習

### 🎯 学習目標

- Offsetリセットの4つの実装パターンを習得
- 本番環境での再処理方法を理解

### 📊 4つのパターン比較

```
【パターン1: fromBeginning】
1回目: Offset 0から読む
2回目: Offset 5から読む（続きから）
→ 初回のみ最初から

【パターン2: Consumer Group削除】
削除前: Consumer Group存在
削除後: Consumer Group なし
次回: Offset 0から読む（必ず最初から）
→ 最も確実

【パターン3: Admin APIでOffset指定】
API実行: Offset 0にセット
次回: Offset 0から読む
→ 任意のOffsetから読める

【パターン4: 動的groupId】
毎回: 新しいgroupId生成
結果: 毎回Offset 0から読む
→ 開発・デバッグ用
```

### 🚀 実行手順

#### パターン1: fromBeginning

```bash
# 1回目
npm run learn:offset-reset-flow -- 1
# 出力: Offset 0から5件読む

# 2回目（すぐ実行）
npm run learn:offset-reset-flow -- 1
# 出力: Offset 5から5件読む
```

#### パターン2: Consumer Group削除

```bash
npm run learn:offset-reset-flow -- 2
```

**期待される出力:**
```
Consumer Group "pattern2-group" は存在しません（問題なし）
次回は必ず最初から読みます
```

#### パターン3: Admin APIでOffset指定

```bash
npm run learn:offset-reset-flow -- 3
```

**期待される出力:**
```
--- 現在のOffset ---
Offset: -1 (まだ読んでいない)

--- Offsetを0にリセット ---
✓ Offset 0にセットしました

--- リセット後のOffset ---
Offset: 0
```

#### パターン4: 毎回最初から

```bash
npm run learn:offset-reset-flow -- 4
```

**期待される出力:**
```
groupId: always-reset-1776408586432 (毎回異なる)
[1] Offset 0: メッセージ 0
...
```

### ✅ 使い分け

| パターン | 使用場面 | メリット | デメリット |
|---------|---------|---------|----------|
| 1 | 本番運用 | シンプル | 2回目以降リセット不可 |
| 2 | 本番（再処理） | 確実 | 手動操作が必要 |
| 3 | 本番（部分再処理） | 任意のOffset指定可能 | 実装が複雑 |
| 4 | 開発・テスト | 常に最初から読める | Consumer Group増加 |

### 💡 理解度チェック

**Q1**: 本番環境でバグ修正後、全データを再処理したい。どのパターンを使う？
<details>
<summary>答え</summary>
パターン2（Consumer Group削除）
</details>

---

## ステップ6: Offsetコミット学習

### 🎯 学習目標

- 自動コミット vs 手動コミットの違い
- コミットタイミングの制御

### 📊 データフロー

```
【自動コミット】
Consumer:
  [0] 読む → [1] 読む → [2] 読む → ... → [4] 読む
                                 ↓
                         5秒後に自動コミット
                         Current Offset: 5

【手動コミット】
Consumer:
  [0] 読む → 処理成功 → resolveOffset(0) → コミット
  [1] 読む → 処理成功 → resolveOffset(1) → コミット
  [2] 読む → 処理失敗 → コミットしない（再処理可能）
```

### 🚀 実行手順

#### 手順1: セットアップ

```bash
npm run learn:offset-commit -- setup
```

**期待される出力:**
```
20件のメッセージを送信中...
✅ セットアップ完了
```

#### 手順2: 自動コミット

```bash
npm run learn:offset-commit -- auto
```

**期待される出力:**
```
[1] Offset 0: メッセージ 0
...
[5] Offset 4: メッセージ 4

5件読んだので停止します
Offsetは自動的にコミットされました
次回は Offset 5 から読みます
```

#### 手順3: Offset確認

```bash
npm run learn:view-offset demo-group demo-topic
```

**期待される出力:**
```
Current Offset: 5
未読メッセージ: 15件
進捗率: 25.0%
```

#### 手順4: 手動コミット

```bash
npm run learn:offset-commit -- manual
```

**期待される出力:**
```
[1] Offset 0: メッセージ 0
  → Offset 0 をコミットしました
[2] Offset 1: メッセージ 1
  → Offset 1 をコミットしました
...
```

### ✅ 比較表

| 項目 | 自動コミット | 手動コミット |
|-----|------------|------------|
| 設定 | `autoCommit: true`（デフォルト） | `autoCommit: false` |
| タイミング | 5秒ごと自動 | `resolveOffset()`呼び出し時 |
| メリット | シンプル | 確実、処理成功後のみコミット |
| デメリット | 処理失敗時も重複防止困難 | 実装が複雑 |
| 使用場面 | ログ収集 | 金融、決済 |

### 💡 理解度チェック

**Q1**: 金融系アプリケーションでは、どちらを使う？
<details>
<summary>答え</summary>
手動コミット（処理成功後のみコミット可能）
</details>

---

## ステップ7: Offset確認学習

### 🎯 学習目標

- Consumer GroupのOffset状態を確認する3つの方法
- Current Offset、End Offset、Lagの意味を理解

### 📊 Offset情報の見方

```
【Offsetの意味】
learn-topic (Partition 0):
┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
│ 0  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │ 8  │ 9  │ 10 │
└────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
 ↑                   ↑                              ↑
Low (0)        Current Offset (5)              End Offset (11)
                     ↑                              ↑
               次に読む位置                   次の書き込み位置

読み終えた: 5件 (0〜4)
未読: 6件 (5〜10)
Lag: 6
```

### 🚀 実行手順

#### 手順1: 5件読んでコミット

```bash
npm run learn:check-offset
```

**期待される出力:**
```
[1] Offset 0: メッセージ 0
...
[5] Offset 4: メッセージ 4

Offsetがコミットされました
次回は Offset 5 から読みます

【Kafka UIで確認】
1. http://localhost:8080 を開く
2. "Consumers" → "offset-check-group"
```

#### 手順2: スクリプトでOffset確認

```bash
npm run learn:view-offset offset-check-group learn-topic
```

**期待される出力:**
```
【現在のOffset】
  Current Offset: 5
  → 次回は Offset 5 から読み始める

【トピックのOffset情報】
  Low (最古): 0
  High (最新): 15
  → 合計メッセージ数: 15件

【進捗状況】
  読み終えたメッセージ: 5件
  未読メッセージ: 10件
  進捗率: 33.3%
```

#### 手順3: CLIでOffset確認

```bash
docker exec kafka-broker-modern kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group offset-check-group \
  --describe
```

**期待される出力:**
```
GROUP              TOPIC       PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
offset-check-group learn-topic 0          5               15              10
```

**各列の意味:**
- **CURRENT-OFFSET**: 次に読むOffset（5 = 0〜4まで読んだ）
- **LOG-END-OFFSET**: トピックの最新Offset（15 = 0〜14が存在）
- **LAG**: 未読メッセージ数（10 = まだ10件読んでいない）

### ✅ 3つの確認方法

| 方法 | コマンド | メリット | 用途 |
|-----|---------|---------|------|
| Kafka UI | http://localhost:8080 | 視覚的 | 開発時の確認 |
| スクリプト | `npm run learn:view-offset` | 進捗率も表示 | 定期的な監視 |
| CLI | `docker exec ...` | シンプル | 本番環境 |

### 💡 理解度チェック

**Q1**: Lag: 100 は何を意味するか？
<details>
<summary>答え</summary>
未読メッセージが100件ある（Consumerが遅れている）
</details>

---

## まとめ

✅ 7つの学習ステップを完了しました！

### 習得した内容

1. **Consumer Group**: 負荷分散の仕組み
2. **Partition**: データ振り分けと順序保証
3. **Offset**: 読み取り位置の制御
4. **リアルタイム**: 低遅延メッセージング
5. **Offsetリセット**: 4つの実装パターン
6. **Offsetコミット**: 自動 vs 手動
7. **Offset確認**: 3つの確認方法

### 次のステップ

本番アプリケーション開発に進みましょう！

詳細は`REFERENCE.md`を参照してください。
