# KafkaのOffset管理完全ガイド

## 📚 目次

1. [Offsetとは](#offsetとは)
2. [Offsetコミットの仕組み](#offsetコミットの仕組み)
3. [自動コミット vs 手動コミット](#自動コミット-vs-手動コミット)
4. [Offsetの確認方法](#offsetの確認方法)
5. [Offsetのリセット方法](#offsetのリセット方法)
6. [実践パターン](#実践パターン)

---

## Offsetとは

**Offset**は、各パーティション内でのメッセージの**位置**を示す連番です。

```
Topic: my-topic (Partition 0)
┌────┬────┬────┬────┬────┬────┬────┬────┐
│ 0  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │
└────┴────┴────┴────┴────┴────┴────┴────┘
 ↑    ↑    ↑    ↑    ↑    ↑    ↑    ↑
Offset番号（0から始まる）
```

### Consumer Groupが保存するOffset

Consumer Groupは、**どこまで読んだか**をKafkaブローカーに保存します。

```
Consumer Group: my-group
  Topic: my-topic
    Partition 0: Offset 5
    → 次回起動時は Offset 5 から読む
```

---

## Offsetコミットの仕組み

### コミット（Commit）とは

Consumerが「Offset 3まで読みました」という情報をKafkaに**保存**することを**コミット**と呼びます。

```
┌─────────────────────────────────────┐
│ Kafka Broker                         │
│                                      │
│ Topic: my-topic                      │
│ [0][1][2][3][4][5][6][7][8][9]      │
│                                      │
│ Consumer Group Offset 情報:         │
│ ┌─────────────────────────────┐    │
│ │ Group: my-group              │    │
│ │   Topic: my-topic            │    │
│ │     Partition 0: Offset 5 ←─┼────┼── コミット済み
│ └─────────────────────────────┘    │
└─────────────────────────────────────┘

次回起動時:
Consumer は Offset 5 から読み始める
```

### コミットのタイミング

**自動コミット（デフォルト）:**
```
メッセージ読み取り → 処理 → (自動で定期的にコミット)
                              ↑
                        5秒ごと（デフォルト）
```

**手動コミット:**
```
メッセージ読み取り → 処理 → 処理成功 → 手動でコミット
                              ↓
                         失敗時はコミットしない
```

---

## 自動コミット vs 手動コミット

### パターン1: 自動コミット（デフォルト）

```typescript
const consumer = kafka.consumer({
  groupId: 'my-group',
  // autoCommit: true (デフォルト)
});

await consumer.subscribe({ topic: 'my-topic', fromBeginning: true });

await consumer.run({
  eachMessage: async ({ message }) => {
    console.log(`Offset ${message.offset}: ${message.value}`);
    // ★ Offsetは自動的にコミットされる
  },
});
```

**メリット:**
- ✅ 簡単（何もしなくていい）
- ✅ 管理不要

**デメリット:**
- ❌ 処理失敗してもコミットされる可能性がある
- ❌ きめ細かい制御ができない

**適している場合:**
- メッセージの処理が軽い
- 多少のメッセージロスを許容できる
- シンプルに実装したい

---

### パターン2: 手動コミット

```typescript
const consumer = kafka.consumer({
  groupId: 'my-group',
});

await consumer.subscribe({ topic: 'my-topic', fromBeginning: true });

await consumer.run({
  eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
    for (const message of batch.messages) {
      try {
        // メッセージ処理
        await processMessage(message);

        // ★ 処理成功したらOffsetをコミット
        await resolveOffset(message.offset);
        await heartbeat();

      } catch (error) {
        // 処理失敗時はコミットしない
        console.error('処理失敗:', error);
        // このメッセージは次回再処理される
        break;
      }
    }
  },
});
```

**メリット:**
- ✅ 処理成功時のみコミット
- ✅ Exactly-once処理に近い動作
- ✅ きめ細かい制御

**デメリット:**
- ❌ 実装が複雑
- ❌ ハートビート管理が必要

**適している場合:**
- メッセージを確実に処理したい
- 重複処理を避けたい
- トランザクション処理が必要

---

## Offsetの確認方法

### 方法1: Admin APIで確認

```typescript
const admin = kafka.admin();
await admin.connect();

// Consumer GroupのOffset情報を取得
const offsets = await admin.fetchOffsets({
  groupId: 'my-group',
  topics: ['my-topic'],
});

console.log(offsets);
// [
//   {
//     topic: 'my-topic',
//     partitions: [
//       { partition: 0, offset: '5', metadata: null }
//     ]
//   }
// ]

await admin.disconnect();
```

### 方法2: CLIで確認

```bash
# Consumer Group一覧
docker exec kafka-broker-modern kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --list

# 特定のGroupのOffset確認
docker exec kafka-broker-modern kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group my-group \
  --describe
```

### 方法3: Kafka UIで確認

```
http://localhost:8080
→ Consumer Groups
→ my-group を選択
→ Offsetを確認
```

---

## Offsetのリセット方法

### 方法1: Admin APIでリセット

```typescript
const admin = kafka.admin();
await admin.connect();

// Offset 0 にリセット
await admin.setOffsets({
  groupId: 'my-group',
  topic: 'my-topic',
  partitions: [
    { partition: 0, offset: '0' }, // 最初から
  ],
});

await admin.disconnect();
```

### 方法2: 最古（earliest）にリセット

```typescript
// トピックの最古Offset情報を取得
const topicOffsets = await admin.fetchTopicOffsets('my-topic');
const lowOffset = topicOffsets[0].low;

// 最古Offsetにリセット
await admin.setOffsets({
  groupId: 'my-group',
  topic: 'my-topic',
  partitions: [
    { partition: 0, offset: lowOffset },
  ],
});
```

### 方法3: 最新（latest）にリセット

```typescript
// トピックの最新Offset情報を取得
const topicOffsets = await admin.fetchTopicOffsets('my-topic');
const highOffset = topicOffsets[0].high;

// 最新Offsetにリセット
await admin.setOffsets({
  groupId: 'my-group',
  topic: 'my-topic',
  partitions: [
    { partition: 0, offset: highOffset },
  ],
});
```

### 方法4: Consumer Groupを削除

```typescript
// Consumer Groupを削除
await admin.deleteGroups(['my-group']);

// 次回起動時:
// - fromBeginning: true → Offset 0から
// - fromBeginning: false → 最新から（待機）
```

### 方法5: Consumer実行中にseek

```typescript
const consumer = kafka.consumer({ groupId: 'my-group' });
await consumer.connect();
await consumer.subscribe({ topic: 'my-topic' });

// Consumer起動時にseek
consumer.on(consumer.events.GROUP_JOIN, async ({ payload }) => {
  // Offset 10 にジャンプ
  await consumer.seek({
    topic: 'my-topic',
    partition: 0,
    offset: '10',
  });
});

await consumer.run({
  eachMessage: async ({ message }) => {
    console.log(`Offset ${message.offset}`);
  },
});
```

---

## 実践パターン

### パターン1: 途中で止めて再開

```typescript
// 1回目: 5件読んで停止
const consumer1 = kafka.consumer({ groupId: 'my-group' });
await consumer1.subscribe({ topic: 'my-topic', fromBeginning: true });

let count = 0;
await consumer1.run({
  eachMessage: async ({ message }) => {
    console.log(`Offset ${message.offset}`);
    count++;

    if (count >= 5) {
      await consumer1.disconnect(); // Offsetは自動コミット済み
    }
  },
});

// 2回目: 続きから読む
const consumer2 = kafka.consumer({ groupId: 'my-group' });
await consumer2.subscribe({ topic: 'my-topic', fromBeginning: true });

await consumer2.run({
  eachMessage: async ({ message }) => {
    console.log(`Offset ${message.offset}`); // Offset 5から始まる
  },
});
```

**結果:**
```
1回目: Offset 0, 1, 2, 3, 4
2回目: Offset 5, 6, 7, 8, 9, ...
```

---

### パターン2: エラー時は再処理

```typescript
const consumer = kafka.consumer({ groupId: 'my-group' });
await consumer.subscribe({ topic: 'my-topic', fromBeginning: true });

await consumer.run({
  eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
    for (const message of batch.messages) {
      try {
        // 処理
        await processMessage(message);

        // 成功時のみコミット
        await resolveOffset(message.offset);
        await heartbeat();

      } catch (error) {
        console.error(`Offset ${message.offset} 処理失敗`);
        // コミットしない → 次回再処理
        break; // バッチ処理を中断
      }
    }
  },
});
```

**動作:**
```
Offset 0: 成功 → コミット
Offset 1: 成功 → コミット
Offset 2: 失敗 → コミットしない
（停止）

次回起動時:
Offset 2 から再開（再処理）
```

---

### パターン3: 最初から全メッセージ再処理

```typescript
// 1. 現在のOffsetを確認
const admin = kafka.admin();
await admin.connect();

const currentOffsets = await admin.fetchOffsets({
  groupId: 'my-group',
  topics: ['my-topic'],
});
console.log('現在のOffset:', currentOffsets);

// 2. Offset 0 にリセット
await admin.setOffsets({
  groupId: 'my-group',
  topic: 'my-topic',
  partitions: [{ partition: 0, offset: '0' }],
});
console.log('Offset 0 にリセット完了');

await admin.disconnect();

// 3. Consumerを起動
const consumer = kafka.consumer({ groupId: 'my-group' });
await consumer.subscribe({ topic: 'my-topic', fromBeginning: true });

await consumer.run({
  eachMessage: async ({ message }) => {
    console.log(`Offset ${message.offset}`); // 0から始まる
  },
});
```

---

### パターン4: バグ修正後の再処理

```typescript
// シナリオ: Offset 100まで処理したが、バグ発見
// Offset 50から再処理したい

const admin = kafka.admin();
await admin.connect();

// Offset 50 にリセット
await admin.setOffsets({
  groupId: 'my-group',
  topic: 'my-topic',
  partitions: [{ partition: 0, offset: '50' }],
});

await admin.disconnect();

// バグ修正後のConsumerを起動
const consumer = kafka.consumer({ groupId: 'my-group' });
await consumer.subscribe({ topic: 'my-topic' });

await consumer.run({
  eachMessage: async ({ message }) => {
    // Offset 50から再処理
    await processMessageFixed(message);
  },
});
```

---

## 📊 まとめ表

| 操作 | 方法 | コード |
|------|------|--------|
| Offset確認 | Admin API | `admin.fetchOffsets()` |
| Offset 0にリセット | Admin API | `admin.setOffsets({ offset: '0' })` |
| 最古にリセット | Admin API | `admin.setOffsets({ offset: lowOffset })` |
| 最新にリセット | Admin API | `admin.setOffsets({ offset: highOffset })` |
| Consumer Group削除 | Admin API | `admin.deleteGroups(['my-group'])` |
| 実行中にジャンプ | Consumer | `consumer.seek({ offset: '10' })` |
| 手動コミット | Consumer | `resolveOffset(message.offset)` |

---

## 🔧 実際に試す

### 学習スクリプトで使用するトピック

- **トピック名**: `demo-topic` （一般的な学習用トピック）
- **Consumer Group**: `demo-group`, `manual-commit-group`

### 実行手順

```bash
# 1. セットアップ（20件のメッセージ送信）
npm run learn:offset-commit -- setup

# 2. 自動コミット（5件読む）
npm run learn:offset-commit -- auto

# 3. Offset確認
npm run learn:offset-commit -- check-offset

# 4. 手動コミット（5件読む）
npm run learn:offset-commit -- manual

# 5. Offsetリセット（Offset 0に戻す）
npm run learn:offset-commit -- reset-offset

# 6. もう一度自動コミット（Offset 0から読む）
npm run learn:offset-commit -- auto

# 7. 途中で止めるデモ
npm run learn:offset-commit -- stop-middle
```

### Offsetリセット動作確認

fromBeginning: true/falseの違いを実際に確認：

```bash
# 1. セットアップ（10件送信）
npm run learn:offset-reset-test -- setup

# 2. 5件読んで停止
npm run learn:offset-reset-test -- read5

# 3. Consumer Group削除（Offsetリセット）
npm run learn:offset-reset-test -- delete

# 4A. fromBeginning: false で読む → 新しいメッセージ待機
npm run learn:offset-reset-test -- read-default

# 4B. fromBeginning: true で読む → 全メッセージ読む
npm run learn:offset-reset-test -- read-beginning
```

---

## 💡 ベストプラクティス

### 1. fromBeginning: true を常に使う

```typescript
// ✅ 推奨
await consumer.subscribe({
  topic: 'my-topic',
  fromBeginning: true,
});
```

**理由:**
- Consumer Group削除時もデータロスなし
- 初回起動時は最初から読む
- 2回目以降は続きから読む

### 2. 重要な処理は手動コミット

```typescript
// ✅ 金融取引など重要な処理
await consumer.run({
  eachBatch: async ({ batch, resolveOffset }) => {
    for (const message of batch.messages) {
      await processImportantMessage(message);
      await resolveOffset(message.offset); // 成功時のみコミット
    }
  },
});
```

### 3. Offsetは定期的にバックアップ

```typescript
// 定期的にOffsetを記録
setInterval(async () => {
  const offsets = await admin.fetchOffsets({
    groupId: 'my-group',
    topics: ['my-topic'],
  });

  // データベースやファイルに保存
  await saveToBackup(offsets);
}, 60000); // 1分ごと
```

### 4. エラー時は再処理

```typescript
// ✅ エラー時はコミットしない
try {
  await processMessage(message);
  await resolveOffset(message.offset);
} catch (error) {
  // コミットしない → 次回再処理
  console.error('再処理します:', error);
}
```

---

これでOffsetの管理について完全に理解できたはずです！
