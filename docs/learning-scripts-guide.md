# Kafka学習スクリプト 完全ガイド

このドキュメントでは、各学習スクリプトの使い方を詳しく解説します。

---

## 📋 目次

1. [Consumer Group学習](#1-consumer-group学習)
2. [Partition学習](#2-partition学習)
3. [Offset学習](#3-offset学習)
4. [リアルタイム受信学習](#4-リアルタイム受信学習)
5. [Offsetリセット学習](#5-offsetリセット学習)
6. [Offsetコミット学習](#6-offsetコミット学習)
7. [Offset確認学習](#7-offset確認学習)

---

## 1. Consumer Group学習

### 📖 何を学ぶか

- 同じ`groupId`を持つConsumerは、メッセージを**分け合う**（負荷分散）
- 異なる`groupId`を持つConsumerは、メッセージを**独立して受信**
- 1つのPartitionは、同じConsumer Groupの中で1つのConsumerにしか割り当てられない

### 🚀 使い方

#### Step 1: メッセージを送信

```bash
npm run learn:producer-group
```

**何が起こるか:**
- `learn-topic`に10件のメッセージを送信
- 各メッセージは0.5秒間隔で送信される

**出力例:**
```
✓ メッセージ 0 を送信
✓ メッセージ 1 を送信
...
全10件のメッセージを送信完了！
```

#### Step 2: Consumerを起動

```bash
npm run learn:consumer-group
```

**何が起こるか:**
- `groupId: 'consumer-learn-group'`で起動
- `learn-topic`から全メッセージを受信
- メッセージを1件ずつ表示

**出力例:**
```
========================================
Consumer Group: consumer-learn-group
========================================

[受信 1] Offset 0: メッセージ 0
[受信 2] Offset 1: メッセージ 1
...
```

#### Step 3: 複数のConsumerを起動（負荷分散の確認）

**ターミナル1:**
```bash
npm run learn:consumer-group
```

**ターミナル2:**
```bash
npm run learn:consumer-group
```

**何が起こるか:**
- 同じ`groupId`なので、2つのConsumerがメッセージを分け合う
- 片方が0, 2, 4, 6, 8を受信
- もう片方が1, 3, 5, 7, 9を受信（例）

**ターミナル3（別のグループ）:**
```bash
# コードを編集してgroupIdを変更
# groupId: 'another-group'
```

**何が起こるか:**
- 異なる`groupId`なので、全メッセージ（0〜9）を受信

### 🔍 Kafka UIで確認

1. http://localhost:8080 を開く
2. 左メニューから「Consumers」をクリック
3. `consumer-learn-group`を探す
4. クリックして詳細を確認

**確認できること:**
- Consumer数（何台起動しているか）
- 各ConsumerのPartition割り当て
- Lag（未読メッセージ数）

### 💡 重要なコード解説

**Producer側（producer-for-group.ts）:**
```typescript
await producer.send({
  topic: 'learn-topic',
  messages: [{ value: `メッセージ ${i}` }],
});
```
- シンプルにメッセージを送信
- `key`を指定していないので、Partitionはラウンドロビンで決定

**Consumer側（consumer-group.ts）:**
```typescript
const consumer = kafka.consumer({
  groupId: 'consumer-learn-group', // ←この値が同じなら負荷分散
});

await consumer.subscribe({
  topic: 'learn-topic',
  fromBeginning: true, // ←初回は最初から、2回目以降は続きから
});
```

---

## 2. Partition学習

### 📖 何を学ぶか

- 同じ`key`を持つメッセージは、同じPartitionに送られる
- これにより、順序を保証する必要があるメッセージをグループ化できる
- 複数のPartitionを使うことで、並列処理が可能

### 🚀 使い方

#### Step 1: メッセージを送信（Partitionに振り分け）

```bash
npm run learn:partition-producer
```

**何が起こるか:**
1. 既存の`partition-topic`を削除（学習用）
2. 3つのPartitionを持つ`partition-topic`を作成
3. 15件のメッセージを送信（5種類のkeyで振り分け）

**出力例:**
```
✓ partition-topic を作成（パーティション数: 3）

15個のメッセージを送信します...

✓ メッセージ 0 → Partition 2 (key: user-0)
✓ メッセージ 1 → Partition 0 (key: user-1)
✓ メッセージ 2 → Partition 1 (key: user-2)
✓ メッセージ 3 → Partition 0 (key: user-3)
✓ メッセージ 4 → Partition 2 (key: user-4)
✓ メッセージ 5 → Partition 2 (key: user-0) ← user-0は必ずPartition 2
✓ メッセージ 6 → Partition 0 (key: user-1) ← user-1は必ずPartition 0
...
```

**重要:** 同じkey（例: `user-0`）は必ず同じPartition（例: Partition 2）に送られる

#### Step 2: Consumerで受信

```bash
npm run learn:partition-consumer
```

**何が起こるか:**
- 全Partitionからメッセージを受信
- どのPartitionから読んでいるかを表示
- Keyごとの統計を表示

**出力例:**
```
[受信] Partition 0:
  Offset: 0
  Key: user-1
  Value: メッセージ 1 (key: user-1)

--- 現在の統計 ---
  Partition 0: 1件
  Partition 1: 0件
  Partition 2: 0件

--- Keyごとのパーティション ---
  user-1 → Partition 0 (1件)

[受信] Partition 2:
  Offset: 0
  Key: user-0
  Value: メッセージ 0 (key: user-0)

--- 現在の統計 ---
  Partition 0: 1件
  Partition 1: 0件
  Partition 2: 1件

--- Keyごとのパーティション ---
  user-1 → Partition 0 (1件)
  user-0 → Partition 2 (1件)
...
```

### 🔍 Kafka UIで確認

1. http://localhost:8080 を開く
2. 左メニューから「Topics」をクリック
3. `partition-topic`をクリック
4. 「Messages」タブを開く

**確認できること:**
- 各Partitionのメッセージ数
- 各メッセージのKey、Value、Offset

### 💡 重要なコード解説

**Producer側（partition-producer.ts）:**
```typescript
// Topic作成（3つのPartition）
await admin.createTopics({
  topics: [
    {
      topic: 'partition-topic',
      numPartitions: 3, // ←Partition数を指定
      replicationFactor: 1,
    },
  ],
});

// メッセージ送信
await producer.send({
  topic: 'partition-topic',
  messages: [
    {
      key: `user-${i % 5}`, // ←keyを指定（0〜4の5種類）
      value: `メッセージ ${i} (key: user-${i % 5})`,
    },
  ],
});
```

**Consumer側（partition-consumer.ts）:**
```typescript
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    // partition変数でどのPartitionから読んでいるかわかる
    console.log(`[受信] Partition ${partition}:`);
    console.log(`  Key: ${message.key?.toString()}`);
  },
});
```

### 🎯 実践例

**ユースケース: ユーザーごとの順序保証**

```typescript
// ユーザーID user-123 の操作は、必ず同じPartitionに送る
await producer.send({
  topic: 'user-events',
  messages: [
    { key: 'user-123', value: '商品をカートに追加' },
    { key: 'user-123', value: '決済を実行' },
    { key: 'user-123', value: '注文完了' },
  ],
});
```

同じPartition内では順序が保証されるため、「カートに追加」→「決済」→「注文完了」の順序が守られる。

---

## 3. Offset学習

### 📖 何を学ぶか

- Offsetは、Partition内のメッセージの位置を表す（0から始まる）
- 読み取り開始位置を制御できる（最初から / 最新のみ / 特定のOffsetから）
- Consumer Groupごとに、どこまで読んだかが記録される

### 🚀 使い方

#### パターン1: 最初から読む（beginning）

```bash
npm run learn:offset -- beginning
```

**何が起こるか:**
- Offset 0から全メッセージを読む

**出力例:**
```
========================================
Offset Consumer (beginning モード)
========================================

Offset 0 から読み始めます

[1] Offset 0: メッセージ 0
[2] Offset 1: メッセージ 1
...
[10] Offset 9: メッセージ 9
```

#### パターン2: 最新のみ読む（latest）

```bash
npm run learn:offset -- latest
```

**何が起こるか:**
- 既存のメッセージは読まず、これから送られるメッセージのみ待機

**出力例:**
```
========================================
Offset Consumer (latest モード)
========================================

最新のメッセージのみ受信します（待機中...）
```

この状態で、別ターミナルから`npm run learn:producer-group`を実行すると、新しいメッセージのみ受信する。

#### パターン3: 特定のOffsetから読む

```bash
npm run learn:offset -- 5
```

**何が起こるか:**
- Offset 5から読み始める

**出力例:**
```
========================================
Offset Consumer (offset 5 から)
========================================

[1] Offset 5: メッセージ 5
[2] Offset 6: メッセージ 6
...
```

### 🔍 Kafka UIで確認

1. http://localhost:8080 を開く
2. 左メニューから「Topics」→「learn-topic」
3. 「Messages」タブでOffsetを確認

**確認できること:**
- 各メッセージのOffset番号
- Partitionごとの最大Offset

### 💡 重要なコード解説

**offset-consumer.ts:**
```typescript
const mode = process.argv[2] || 'latest';

if (mode === 'beginning') {
  // 最初から読む
  await consumer.subscribe({ topic: 'learn-topic', fromBeginning: true });
} else if (mode === 'latest') {
  // 最新のみ読む
  await consumer.subscribe({ topic: 'learn-topic', fromBeginning: false });
} else {
  // 特定のOffsetから読む（Admin APIを使用）
  const targetOffset = parseInt(mode);
  await consumer.subscribe({ topic: 'learn-topic', fromBeginning: false });

  // consumer.run内でseekを使用
  consumer.seek({ topic: 'learn-topic', partition: 0, offset: targetOffset.toString() });
}
```

---

## 4. リアルタイム受信学習

### 📖 何を学ぶか

- Kafkaは低遅延でメッセージを配信できる（通常数ミリ秒〜数十ミリ秒）
- ProducerとConsumerは非同期で動作
- Consumerは常にメッセージを待機し、送信されたらすぐに受信

### 🚀 使い方

#### Step 1: Consumerを起動（待機状態）

```bash
npm run learn:realtime-consumer
```

**何が起こるか:**
- `fromBeginning: false`で起動（最新のメッセージのみ受信）
- メッセージを待機

**出力例:**
```
========================================
リアルタイムConsumer起動
メッセージを待機中...
Ctrl+Cで停止
========================================
```

#### Step 2: Producerを起動（別ターミナル）

```bash
npm run learn:realtime-producer
```

**何が起こるか:**
- 3秒ごとにメッセージを送信し続ける
- タイムスタンプ付きのメッセージを送信

**出力例:**
```
========================================
リアルタイムProducer起動
3秒ごとにメッセージを送信します
Ctrl+Cで停止
========================================

[2026-04-17T06:30:00.123Z] ✓ メッセージ 0 を送信
[2026-04-17T06:30:03.456Z] ✓ メッセージ 1 を送信
[2026-04-17T06:30:06.789Z] ✓ メッセージ 2 を送信
...
```

#### Step 3: Consumerで受信確認

**Consumerターミナルの出力例:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📩 メッセージ受信 (1件目)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
受信時刻: 2026-04-17T06:30:00.135Z
Offset: 0
Partition: 0
送信時刻: 2026-04-17T06:30:00.123Z
遅延: 12ms ← 送信から受信までの遅延
内容: {
  "id": 0,
  "timestamp": "2026-04-17T06:30:00.123Z",
  "data": "リアルタイムメッセージ 0"
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 💡 重要なコード解説

**Producer側（realtime-producer.ts）:**
```typescript
// 3秒ごとにメッセージを送信
const interval = setInterval(async () => {
  const timestamp = new Date().toISOString();
  const message = {
    id: count,
    timestamp, // ←送信時刻を記録
    data: `リアルタイムメッセージ ${count}`,
  };

  await producer.send({
    topic: 'realtime-topic',
    messages: [{ key: `msg-${count}`, value: JSON.stringify(message) }],
  });

  console.log(`[${timestamp}] ✓ メッセージ ${count} を送信`);
  count++;
}, 3000);
```

**Consumer側（realtime-consumer.ts）:**
```typescript
await consumer.subscribe({
  topic: 'realtime-topic',
  fromBeginning: false, // ←最新のメッセージのみ受信（リアルタイム）
});

await consumer.run({
  eachMessage: async ({ message }) => {
    const receiveTime = new Date().toISOString();
    const parsedValue = JSON.parse(message.value?.toString() || '{}');

    // 遅延を計算
    const sendTime = new Date(parsedValue.timestamp);
    const receiveTimeObj = new Date(receiveTime);
    const latency = receiveTimeObj.getTime() - sendTime.getTime();

    console.log(`遅延: ${latency}ms`);
  },
});
```

---

## 5. Offsetリセット学習

### 📖 何を学ぶか

- Offsetリセットの4つの実装パターン
- それぞれのメリット・デメリット
- 実際の開発でどのパターンを使うべきか

### 🚀 使い方

#### パターン1: fromBeginning（初回のみ最初から）

```bash
npm run learn:offset-reset-flow -- 1
```

**何が起こるか:**
- 初回実行: Offset 0から5件読む
- 2回目実行: Offset 5から5件読む（続きから）

**動作の仕組み:**
```typescript
await consumer.subscribe({
  topic: 'learn-topic',
  fromBeginning: true, // ←初回のみ最初から、2回目以降は続きから
});
```

**使い分け:**
- ✅ 通常の本番アプリケーションで使用
- ✅ 初回だけ全データを処理したい場合
- ❌ 毎回最初から読み直したい場合

#### パターン2: Consumer Group削除（完全リセット）

```bash
npm run learn:offset-reset-flow -- 2
```

**何が起こるか:**
- Consumer Group `pattern2-group`を削除
- 次回起動時は必ず最初から読む

**出力例:**
```
========================================
パターン2: Consumer Group削除
========================================

✓ Consumer Group "pattern2-group" を削除しました

次にこのgroupIdでConsumerを起動すると、最初から読みます。
これが最も確実にリセットする方法です。
```

**使い分け:**
- ✅ 本番環境でデータを再処理したい場合
- ✅ バグ修正後に全データを再処理
- ✅ 開発環境でリセットしたい場合

**CLIで削除する方法:**
```bash
docker exec kafka-broker-modern kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group pattern2-group \
  --delete
```

#### パターン3: Admin APIで特定Offsetにリセット

```bash
npm run learn:offset-reset-flow -- 3
```

**何が起こるか:**
- 現在のOffsetを確認
- Offset 0にセット
- セット後のOffsetを確認

**出力例:**
```
========================================
パターン3: Admin APIでOffset指定
========================================

--- 現在のOffset ---
[
  {
    "topic": "learn-topic",
    "partitions": [
      { "partition": 0, "offset": "5" }
    ]
  }
]

--- Offsetを0にリセット ---
✓ Offset 0にセットしました

--- リセット後のOffset ---
[
  {
    "topic": "learn-topic",
    "partitions": [
      { "partition": 0, "offset": "0" }
    ]
  }
]
```

**重要なコード:**
```typescript
// Offsetをセット
await admin.setOffsets({
  groupId: 'pattern3-group',
  topic: 'learn-topic',
  partitions: [
    {
      partition: 0,
      offset: '0', // ←任意のOffsetを指定可能
    },
  ],
});
```

**使い分け:**
- ✅ 特定のOffsetから再処理したい場合
- ✅ エラーが発生したOffsetから再実行
- ✅ 細かい制御が必要な場合

#### パターン4: 毎回最初から読む（開発用）

```bash
npm run learn:offset-reset-flow -- 4
```

**何が起こるか:**
- 起動のたびに新しい`groupId`を生成
- 毎回Offset 0から読む

**出力例:**
```
========================================
パターン4: 毎回最初から読む
========================================

方法1: 毎回新しいgroupIdを使う
→ groupId: always-reset-1713336600123

このConsumerは毎回最初から読みます
（groupIdが毎回異なるため）

[1] Offset 0: メッセージ 0
[2] Offset 1: メッセージ 1
...
```

**重要なコード:**
```typescript
// 毎回新しいgroupIdを生成
const groupId = `always-reset-${Date.now()}`;

const consumer = kafka.consumer({ groupId });
```

**使い分け:**
- ✅ 開発・デバッグ時
- ✅ テストスクリプト
- ❌ 本番環境（Consumer Groupが無限に増える）

### 📊 パターン比較表

| パターン | 使用場面 | リセット方法 | メリット | デメリット |
|---------|---------|------------|---------|----------|
| 1. fromBeginning | 本番 | 初回のみ自動 | シンプル | 2回目以降はリセット不可 |
| 2. Group削除 | 本番（再処理） | 手動削除 | 確実にリセット | 手動操作が必要 |
| 3. setOffsets | 本番（部分再処理） | Admin API | 任意のOffsetを指定可能 | 実装が複雑 |
| 4. 動的groupId | 開発・テスト | 毎回自動 | 常に最初から読める | Consumer Groupが増え続ける |

---

## 6. Offsetコミット学習

### 📖 何を学ぶか

- 自動コミット vs 手動コミット
- Offsetコミットのタイミング
- コミット前に止めるとどうなるか

### 🚀 使い方

#### Step 1: セットアップ（20件のメッセージ準備）

```bash
npm run learn:offset-commit -- setup
```

**何が起こるか:**
- Consumer Group削除（クリーンな状態に）
- `demo-topic`に20件のメッセージを送信

**出力例:**
```
========================================
セットアップ: メッセージ準備
========================================

Consumer Group "auto-commit-group" を削除しました

20件のメッセージを送信中...
✓ 全20件送信完了

準備完了！次のコマンドを実行してください:
npm run learn:offset-commit -- auto
```

#### Step 2: 自動コミット（5件読む）

```bash
npm run learn:offset-commit -- auto
```

**何が起こるか:**
- 自動コミット有効（デフォルト設定）
- 5件読んで停止
- 自動的にOffsetがコミットされる

**出力例:**
```
========================================
自動コミット（Auto Commit）
========================================

5件読んでから停止します...

[1] Offset 0: メッセージ 0
[2] Offset 1: メッセージ 1
[3] Offset 2: メッセージ 2
[4] Offset 3: メッセージ 3
[5] Offset 4: メッセージ 4

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5件読んだので停止
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

自動コミット設定:
✓ Offsetは自動的にコミットされます
✓ デフォルトでは5秒ごとにコミット

次回起動時は Offset 5 から読み始めます。
```

**重要なコード:**
```typescript
const consumer = kafka.consumer({
  groupId: 'auto-commit-group',
  // autoCommit: true, // ←デフォルトで有効
  // autoCommitInterval: 5000, // ←5秒ごとにコミット
});
```

#### Step 3: Offset確認

```bash
npm run learn:offset-commit -- check-offset
```

または

```bash
npm run learn:view-offset auto-commit-group demo-topic
```

**出力例:**
```
========================================
Consumer Group Offset情報
========================================

Consumer Group: auto-commit-group
Topic: demo-topic

【現在のOffset】
─────────────────────────────────

Topic: demo-topic
  Partition 0:
    Current Offset: 5
    → 次回は Offset 5 から読み始める

【進捗状況】
─────────────────────────────────

読み終えたメッセージ: 5件
未読メッセージ: 15件
合計: 20件
進捗率: 25.0%
```

#### Step 4: 手動コミット（5件読む）

```bash
npm run learn:offset-commit -- manual
```

**何が起こるか:**
- 自動コミット無効
- 各メッセージ処理後に明示的にコミット
- 5件読んで停止

**出力例:**
```
========================================
手動コミット（Manual Commit）
========================================

5件読んでから停止します...

[1] Offset 0: メッセージ 0
  → Offset 0 をコミットしました
[2] Offset 1: メッセージ 1
  → Offset 1 をコミットしました
[3] Offset 2: メッセージ 2
  → Offset 2 をコミットしました
...

手動コミットの利点:
✓ メッセージ処理完了後に確実にコミット
✓ 処理失敗時はコミットしないことで再処理可能
```

**重要なコード:**
```typescript
const consumer = kafka.consumer({
  groupId: 'manual-commit-group',
  autoCommit: false, // ←自動コミット無効
});

await consumer.run({
  eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
    for (const message of batch.messages) {
      // メッセージ処理
      console.log(`処理: ${message.value?.toString()}`);

      // 処理成功後に手動コミット
      await resolveOffset(message.offset);
      console.log(`  → Offset ${message.offset} をコミットしました`);

      await heartbeat(); // タイムアウト防止
    }
  },
});
```

#### Step 5: Offsetリセット

```bash
npm run learn:offset-commit -- reset-offset
```

**何が起こるか:**
- Consumer GroupのOffsetを0にリセット
- 次回は最初から読む

#### Step 6: 途中で止めるデモ

```bash
npm run learn:offset-commit -- stop-middle
```

**何が起こるか:**
- 3件読んだところで強制停止（Ctrl+C不要）
- 自動コミットのタイミング次第でOffsetがコミットされないことがある

**出力例:**
```
========================================
途中で止めるデモ
========================================

3件読んで強制停止します...

[1] Offset 0: メッセージ 0
[2] Offset 1: メッセージ 1
[3] Offset 2: メッセージ 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ここで強制停止します
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

自動コミットの注意点:
⚠️  最後のコミットから5秒経っていない場合、
    Offset 2 まで読んでもコミットされないことがあります。

再度起動すると:
- 運が良ければ: Offset 3 から読む
- 運が悪ければ: Offset 0 から読む（重複処理）

手動コミットなら確実にコミットできます。
```

### 📊 自動 vs 手動コミット比較

| 項目 | 自動コミット | 手動コミット |
|-----|------------|------------|
| 設定 | `autoCommit: true`（デフォルト） | `autoCommit: false` |
| コミットタイミング | 5秒ごと自動 | `resolveOffset()`呼び出し時 |
| メリット | シンプル、実装が簡単 | 確実、処理成功後のみコミット可能 |
| デメリット | 処理失敗時も重複防止が難しい | 実装が複雑 |
| 使用場面 | 高速処理、重複OK | 金融、決済、重複NG |

---

## 7. Offset確認学習

### 📖 何を学ぶか

- Consumer GroupのOffset状態を確認する3つの方法
- Current Offset、End Offset、Lagの意味
- 読み終えたメッセージ数、未読メッセージ数の確認

### 🚀 使い方

#### Step 1: 5件読んでOffsetをコミット

```bash
npm run learn:check-offset
```

**何が起こるか:**
- Consumer Group `offset-check-group`で起動
- `learn-topic`から5件読む
- Offsetを自動コミット
- Kafka UIでの確認方法を表示

**出力例:**
```
========================================
Offset確認デモ
========================================

Consumer Group: offset-check-group
Topic: learn-topic

5件読んで停止します...

[1] Offset 0: メッセージ 0
[2] Offset 1: メッセージ 1
[3] Offset 2: メッセージ 2
[4] Offset 3: メッセージ 3
[5] Offset 4: メッセージ 4

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5件読んだので停止します
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Offsetがコミットされました。
Consumer Group "offset-check-group" は次回 Offset 5 から読みます。

【Kafka UIで確認】
1. http://localhost:8080 を開く
2. 左メニューから "Consumers" をクリック
3. "offset-check-group" を探す
4. グループ名をクリック
5. "Offset" 列を確認
```

#### Step 2: スクリプトでOffset確認

```bash
npm run learn:view-offset
```

または、Consumer GroupとTopicを指定:

```bash
npm run learn:view-offset offset-check-group learn-topic
```

**出力例:**
```
========================================
Consumer Group Offset情報
========================================

Consumer Group: offset-check-group
Topic: learn-topic

【現在のOffset】
─────────────────────────────────

Topic: learn-topic
  Partition 0:
    Current Offset: 5
    → 次回は Offset 5 から読み始める

【トピックのOffset情報】
─────────────────────────────────

Partition 0:
  Low (最古): 0
  High (最新): 15
  → 合計メッセージ数: 15件

【進捗状況】
─────────────────────────────────

読み終えたメッセージ: 5件
未読メッセージ: 10件
合計: 15件
進捗率: 33.3%
```

**重要なコード:**
```typescript
// Consumer GroupのOffset取得
const offsets = await admin.fetchOffsets({
  groupId: 'offset-check-group',
  topics: ['learn-topic'],
});

// トピックの最新Offset取得
const topicOffsets = await admin.fetchTopicOffsets('learn-topic');

// 進捗計算
const currentOffset = parseInt(offsets[0].partitions[0].offset);
const highOffset = parseInt(topicOffsets[0].high);
const lowOffset = parseInt(topicOffsets[0].low);
const unreadMessages = highOffset - currentOffset;
const readMessages = currentOffset - lowOffset;
```

#### Step 3: CLIでOffset確認

```bash
docker exec kafka-broker-modern kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group offset-check-group \
  --describe
```

**出力例:**
```
GROUP              TOPIC       PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
offset-check-group learn-topic 0          5               15              10
```

**各列の意味:**
- `CURRENT-OFFSET`: 次に読むOffset（5 = 0〜4まで読んだ）
- `LOG-END-OFFSET`: トピックの最新Offset（15 = 0〜14が存在）
- `LAG`: 未読メッセージ数（10 = まだ10件読んでいない）

### 🔍 Kafka UIで確認

詳細は `docs/how-to-check-offset.md` を参照してください。

**確認手順:**
1. http://localhost:8080 を開く
2. 左メニューから「Consumers」をクリック
3. `offset-check-group`を探す
4. グループ名をクリック
5. 以下の情報を確認:
   - **Current Offset**: 次に読む位置
   - **End Offset**: トピックの最新位置
   - **Lag**: 未読メッセージ数

---

## 📚 まとめ

各学習スクリプトを順番に実行することで、Kafkaの基本から応用まで体系的に学べます。

### 推奨学習順序

1. **Consumer Group学習** → Kafkaの基本動作を理解
2. **Partition学習** → データの振り分けと並列処理を理解
3. **Offset学習** → 読み取り位置の制御を理解
4. **リアルタイム受信学習** → Kafkaの低遅延性を体験
5. **Offsetリセット学習** → 実践的な再処理パターンを習得
6. **Offsetコミット学習** → 本番運用で重要なコミット制御を理解
7. **Offset確認学習** → 監視・デバッグ方法を習得

### トラブルシューティング

詳細は `README.md` の「トラブルシューティング」セクションを参照してください。

**よくある問題:**
- Consumerがメッセージを受信しない → Offsetが最新になっている
- 接続エラー → `localhost:19092`を使用しているか確認
- トピックが見つからない → `docker-compose up -d`でトピック自動作成を確認
