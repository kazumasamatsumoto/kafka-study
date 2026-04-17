# Kafka 基本知識

## 1. Kafkaの基本構造

```
Producer（送信）→ Broker（保存）→ Consumer（受信）
   プログラム      Kafkaサーバー       プログラム
```

Kafkaは**送信・保存・受信**の3つで成り立っています。

## 2. 主要な用語

| 用語 | 意味 | 例え |
|------|------|------|
| **Broker** | Kafkaサーバー本体 | 図書館の建物 |
| **Topic** | メッセージを分類する名前 | メールフォルダ、本棚の名前 |
| **Message** | 実際のデータ | メール本文、本 |
| **Producer** | メッセージを送るプログラム | 送信者 |
| **Consumer** | メッセージを受け取るプログラム | 受信者 |
| **Offset** | メッセージの番号（0,1,2...） | メッセージの住所 |
| **Partition** | Topicの分割単位 | 複数の配送ルート（基本は1つ） |
| **Consumer Group ID** | Consumerグループの識別名 | チーム名 |

## 3. Kafkaの特徴

### ✅ メッセージは消えない
- Consumerが読んでも削除されない
- 何度でも読み直せる
- HTTPのリクエスト/レスポンスとは違う（非同期通信）

### ✅ 複数のConsumerが読める
- 同じメッセージを別のプログラムが読める
- 異なるシステムで同じデータを処理できる

## 4. HTTPとの違い

### HTTPの場合（同期通信）
```
クライアント → POST /api/order → サーバー
            ← レスポンス（すぐ返す）
```
**同期的**：リクエストして待つ

### Kafkaの場合（非同期通信）
```
Producer → メッセージ送信 → Kafka（保存）
                              ↓
Consumer ← 好きな時に読む ← Kafka
```
**非同期的**：送った後、いつ読まれるかわからない

## 5. Consumer Groupの仕組み

Kafkaは**言語ではなく、Consumer Group IDで識別**します。

### 同じgroupIdの場合（負荷分散）
```
Consumer A (groupId: "test-group") → メッセージ 0,2,4,6,8
Consumer B (groupId: "test-group") → メッセージ 1,3,5,7,9
※言語は関係ない。groupIdが同じならメッセージを分け合う
```

### 違うgroupIdの場合（独立処理）
```
Consumer A (groupId: "test-group")  → メッセージ 0-9 全部
Consumer B (groupId: "other-group") → メッセージ 0-9 全部
※groupIdが違うので両方が全部読む
```

## 6. 実際の使用例

### 例1: 注文システム
```
Producer: Webサイト（注文を送信）
  ↓
Topic: order-events
  ↓
Consumer: 在庫管理システム（在庫を減らす）
Consumer: メール送信システム（確認メールを送る）
Consumer: 分析システム（売上データを記録）
```

### 例2: ログ収集
```
Producer: アプリケーションサーバー（ログを送信）
  ↓
Topic: logs
  ↓
Consumer: ログ保存プログラム（DBに保存）
Consumer: アラート監視プログラム（エラーを検知）
```

## 7. 環境構成

### Docker Compose構成
```
┌─────────────────────┐
│ Zookeeper           │ ポート: 2181
│ (設定管理)           │
└─────────────────────┘
          ↓
┌─────────────────────┐
│ Kafka Broker        │ ポート: 9092-9093
│ (メッセージ保存)     │
└─────────────────────┘
          ↓
┌─────────────────────┐
│ Kafka UI            │ ポート: 8080
│ (管理画面)           │ http://localhost:8080
└─────────────────────┘
```

### 起動方法
```bash
# Kafka環境の起動
docker compose up -d

# 状態確認
docker compose ps
```

## 8. 基本的な操作

### Producer（メッセージ送信）
```bash
npm run producer
```

コードの要点：
```typescript
const kafka = new Kafka({
  clientId: 'my-producer',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();

await producer.connect();
await producer.send({
  topic: 'test-topic',
  messages: [{ key: 'key-0', value: 'メッセージ内容' }],
});
```

### Consumer（メッセージ受信）
```bash
npm run consumer
```

コードの要点：
```typescript
const consumer = kafka.consumer({
  groupId: 'test-group',  // 重要！
});

await consumer.connect();
await consumer.subscribe({
  topic: 'test-topic',
  fromBeginning: true,  // 最初から読む
});

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    console.log(message.value.toString());
  },
});
```

### CLIでの確認
```bash
# Topicの一覧
docker exec kafka-broker kafka-topics --bootstrap-server localhost:9092 --list

# メッセージの確認
docker exec kafka-broker kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic test-topic \
  --from-beginning \
  --max-messages 10
```

## 9. Kafka UIでの確認

http://localhost:8080 でアクセス

確認できる項目：
- **Brokers**: Kafkaサーバーの状態
- **Topics**: 作成されたTopic一覧とメッセージ内容
- **Consumers**: 実行中のConsumer Group

## 10. メッセージの構造

各メッセージには以下の情報が含まれます：

| 項目 | 説明 |
|------|------|
| **Offset** | メッセージの番号（0から始まる連番） |
| **Partition** | どのパーティションに保存されているか |
| **Timestamp** | メッセージが送信された時刻 |
| **Key** | メッセージの識別子（任意） |
| **Value** | 実際のメッセージ内容 |

## 11. 学習の流れ

1. ✅ **基本**: Producer → Topic → Consumer
2. 次のステップ:
   - リアルタイム受信
   - 複数Consumer Groupの動作確認
   - Partitionの使い方
   - エラーハンドリング
   - パフォーマンスチューニング

---

**作成日**: 2026-04-16
