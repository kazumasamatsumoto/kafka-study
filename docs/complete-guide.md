# Kafka 完全学習ガイド

このガイドでは、Kafkaの基本から「Offsetリセット時にoldestから取得する」までを網羅的に学習できます。

---

## 📚 目次

1. [Kafka基本知識](#1-kafka基本知識)
2. [環境のセットアップ](#2-環境のセットアップ)
3. [基本操作](#3-基本操作)
4. [学習スクリプト](#4-学習スクリプト)
5. [Offsetリセットの仕組み](#5-offsetリセットの仕組み)
6. [学習のポイント](#6-学習のポイント)
7. [よくある質問](#7-よくある質問)

---

## 1. Kafka基本知識

### Kafkaの3要素

```
Producer（送信）→ Broker（保存）→ Consumer（受信）
   プログラム      Kafkaサーバー       プログラム
```

### 重要な用語

| 用語 | 意味 | 例え |
|------|------|------|
| **Broker** | Kafkaサーバー本体 | 図書館の建物 |
| **Topic** | メッセージを分類する名前 | メールフォルダ |
| **Message** | 実際のデータ | メール本文 |
| **Producer** | メッセージを送るプログラム | 送信者 |
| **Consumer** | メッセージを受け取るプログラム | 受信者 |
| **Offset** | メッセージの位置（0,1,2...） | メッセージの住所 |
| **Partition** | Topicの分割単位 | 複数の保存先 |
| **Consumer Group ID** | Consumerグループの識別名 | チーム名 |

### Kafkaの特徴

✅ **メッセージは消えない**（Consumerが読んでも削除されない）
✅ **何度でも読める**（同じメッセージを複数のConsumerが読める）
✅ **非同期通信**（HTTPと違い、送信と受信のタイミングが別）

---

## 2. 環境のセットアップ

### 起動

```bash
# Kafka環境を起動
docker compose up -d

# 状態確認
docker compose ps
```

**起動するコンテナ:**
- Zookeeper (ポート 2181)
- Kafka Broker (ポート 9092-9093)
- Kafka UI (ポート 8080)

### 確認

- Kafka UI: http://localhost:8080
- CLIでTopic一覧: `docker exec kafka-broker kafka-topics --bootstrap-server localhost:9092 --list`

---

## 3. 基本操作

### メッセージを送信

```bash
npm run producer
```

- `test-topic`に10個のメッセージを送信
- 1秒間隔で送信される

### メッセージを受信

```bash
npm run consumer
```

- `test-topic`から全メッセージを受信
- Ctrl+Cで停止

### Kafka UIで確認

1. http://localhost:8080 を開く
2. Topics → test-topic → Messages
3. 送信したメッセージが表示される

---

## 4. 学習スクリプト

### 4-1. Consumer Group（負荷分散）

**学ぶこと:** 同じgroupIdのConsumerがメッセージを分け合う仕組み

#### ステップ1: メッセージ送信
```bash
npm run learn:producer-group
```

#### ステップ2: Consumer 1起動（ターミナル1）
```bash
npm run learn:consumer-group -- consumer1
```
- groupId: `same-group`
- 10個全て受信

#### ステップ3: Consumer 2起動（ターミナル2）
```bash
npm run learn:consumer-group -- consumer2
```
- groupId: `same-group`（同じ）
- メッセージ受信なし（Consumer1が既に読んだ）

#### ステップ4: もう一度送信
```bash
# ターミナル3
npm run learn:producer-group
```

**結果:**
- Consumer 1と2が**メッセージを分け合う**
- 例: Consumer1が0,2,4,6,8 / Consumer2が1,3,5,7,9

#### ステップ5: Consumer 3起動（ターミナル3）
```bash
npm run learn:consumer-group -- consumer3
```
- groupId: `different-group`（別グループ）
- **全メッセージ（0-9）を受信**

**ポイント:**
- 同じgroupId → 負荷分散（仕事を分担）
- 違うgroupId → 独立処理（全員が全部読む）

---

### 4-2. Partition（並列処理）

**学ぶこと:** 同じkeyのメッセージは同じパーティションに送られる

#### ステップ1: Topicとメッセージ作成
```bash
npm run learn:partition-producer
```

**何が起きるか:**
- 3パーティションのTopic作成
- 15個のメッセージ送信
- 同じkey（user-0, user-1など）は同じパーティションへ

**出力例:**
```
✓ メッセージ 0 → Partition 0 (key: user-0)
✓ メッセージ 1 → Partition 1 (key: user-1)
✓ メッセージ 5 → Partition 0 (key: user-0)  ← user-0は常にPartition 0
```

#### ステップ2: 受信
```bash
npm run learn:partition-consumer
```

**出力内容:**
- パーティション別の統計
- 各keyがどのパーティションに保存されているか

**ポイント:**
- 同じkeyは同じパーティション → **順序保証**
- 複数パーティション → **並列処理可能**

---

### 4-3. Offset（読み取り位置）

**学ぶこと:** どこから読むかを制御する方法

#### パターンA: 最初から読む
```bash
npm run learn:offset -- beginning
```
- Offset 0から読む
- 10件で自動停止

#### パターンB: 最新のみ読む
```bash
npm run learn:offset -- latest
```
- 既存メッセージは読まない
- 新しいメッセージを待機

別ターミナルで送信:
```bash
npm run producer
```
→ リアルタイムで受信される

#### パターンC: 特定位置から読む
```bash
npm run learn:offset -- 5
```
- Offset 5から読む
- メッセージ5,6,7,8,9を受信

**ポイント:**
- `fromBeginning: true` → 初回は最初から
- `fromBeginning: false` → 新しいメッセージのみ
- `seek()` → 特定Offsetを指定

---

### 4-4. リアルタイム受信

**学ぶこと:** ProducerとConsumerを同時に動かす

#### ステップ1: Consumer起動（ターミナル1）
```bash
npm run learn:realtime-consumer
```
待機状態になる

#### ステップ2: Producer起動（ターミナル2）
```bash
npm run learn:realtime-producer
```

**何が起きるか:**
- 3秒ごとにメッセージ送信
- Consumerがほぼ即座に受信
- 遅延時間（ms）が表示される

**ポイント:**
- Kafkaは低遅延（ミリ秒単位）
- Consumerは常時起動してメッセージを待つ
- 非同期リアルタイム処理

---

## 5. Offsetリセットの仕組み

### 5-1. Offsetが無効になる状況

```
【正常なケース】
メッセージ: Offset 0-9
Consumerが Offset 5 まで読んだ
  ↓
保持期間切れで Offset 0-2 削除
  ↓
残り: Offset 3-9
ConsumerのOffset 5は有効
  → Offset 5 から続きを読む ✅

【問題のケース】
メッセージ: Offset 0-9
Consumerが Offset 3 まで読んだ
  ↓
保持期間切れで Offset 0-5 削除
  ↓
残り: Offset 6-9
ConsumerのOffset 3は無効 ❌
  → どうする？
```

### 5-2. auto.offset.reset とは

**Offsetが無効な時の動作を決める設定**

| 設定 | 動作 |
|------|------|
| `earliest` (oldest) | 残っている最古のメッセージ（Offset 6）から読む |
| `latest` | 最新のメッセージから読む（6-9を読まない） |

### 5-3. KafkaJSでの制限

❌ `auto.offset.reset` を直接設定できない
✅ `fromBeginning` で初回の動作を制御
⚠️ Offset無効時はKafka Broker側の設定に依存

### 5-4. Offsetリセットの4つの方法

#### 方法1: fromBeginning（推奨）

```bash
npm run learn:offset-reset-flow -- 1
```

```typescript
const consumer = kafka.consumer({ groupId: 'my-group' });
await consumer.subscribe({
  topic: 'my-topic',
  fromBeginning: true,  // 初回のみ最初から
});
```

**動作:**
- 初回: Offset 0から読む
- 2回目以降: 前回の続きから
- Offset無効時: Broker設定に依存

**いつ使う:** 通常の本番運用

---

#### 方法2: Consumer Group削除（最も確実）

```bash
npm run learn:offset-reset-flow -- 2
```

```typescript
const admin = kafka.admin();
await admin.connect();
await admin.deleteGroups(['my-group']);
await admin.disconnect();

// この後Consumerを起動すると、確実に最初から読む
```

**動作:**
- Consumer Groupごと削除
- 次回起動時は新規グループとして扱われる
- 確実に最初から読む

**いつ使う:** トラブル時の完全リセット

**注意:**
- Consumer Groupが存在しない場合、エラーコード69（COORDINATOR_NOT_AVAILABLE）が発生しますが、学習スクリプトは自動的に処理します
- Consumerがアクティブな場合は削除できません。全てのConsumerを停止してから実行してください

---

#### 方法3: Admin APIで特定Offset指定

```bash
npm run learn:offset-reset-flow -- 3
```

```typescript
const admin = kafka.admin();
await admin.connect();
await admin.setOffsets({
  groupId: 'my-group',
  topic: 'my-topic',
  partitions: [{ partition: 0, offset: '0' }],
});
```

**動作:**
- 任意のOffset位置を指定できる
- `'0'` = 最初、`'-1'` = 最新

**いつ使う:** 特定位置から読み直したい時

---

#### 方法4: 毎回リセット（開発用）

```bash
npm run learn:offset-reset-flow -- 4
```

```typescript
const consumer = kafka.consumer({
  groupId: `temp-group-${Date.now()}`,  // 毎回新しいID
});
```

**動作:**
- 起動のたびに新しいgroupId
- 常に最初から読む

**いつ使う:** 開発・テスト中

---

### 5-5. 実際の運用フロー

#### 本番環境での実装

```typescript
const consumer = kafka.consumer({
  groupId: 'production-service',
});

await consumer.subscribe({
  topic: 'orders',
  fromBeginning: true,  // 初回のみ最初から
});

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    // メッセージ処理
  },
});
```

#### トラブル時の対応

```bash
# 1. 状態確認
npm run offset-reset -- check

# 2. Consumer Group削除（完全リセット）
npm run learn:offset-reset-flow -- 2

# 3. Consumer再起動
npm run consumer
```

---

### 5-6. Offsetリセットの比較表

| 方法 | いつ使う | メリット | デメリット | 確実性 |
|------|---------|---------|-----------|--------|
| fromBeginning | 本番運用 | シンプル | 2回目以降は続きから | ⭐⭐⭐ |
| Group削除 | トラブル時 | 最も確実 | 手動操作が必要 | ⭐⭐⭐⭐⭐ |
| Admin API | 特定位置から | 柔軟 | 複雑 | ⭐⭐⭐⭐ |
| 毎回リセット | 開発中 | テストしやすい | 本番では使えない | ⭐⭐⭐⭐⭐ |

---

## 6. 学習のポイント

### 6-1. Consumer Groupの使い分け

```
同じgroupId = チームで仕事を分担（負荷分散）
  例: WebサーバーA, B, Cが同じグループで注文を処理
      → それぞれ違うメッセージを処理する

違うgroupId = 別チームで独立して処理
  例: 注文グループ、分析グループ、メール送信グループ
      → 全員が同じメッセージを処理する
```

### 6-2. Partitionの使い分け

```
keyあり = 同じkeyは同じパーティション
  例: user-123の全イベントは順番通り処理される
      → 順序保証が必要な場合に使う

keyなし = ランダムに振り分け
  例: ログメッセージ
      → 負荷分散のみが目的
```

### 6-3. Offsetの理解

```
fromBeginning: true
  - 初回: 最古のメッセージから
  - 2回目以降: 前回の続きから
  - 用途: 通常の運用

fromBeginning: false
  - 新しいメッセージのみ
  - 用途: リアルタイム処理

seek()
  - 特定のOffsetから
  - 用途: デバッグ、特定位置から再処理
```

### 6-4. Offsetリセットの判断基準

```
【いつリセットが必要？】

✅ 必要な場合:
  - 初めてTopicを読む
  - データ処理エラーで全件再処理したい
  - 開発中のテスト

❌ 不要な場合:
  - 通常運用（自動的に続きから読む）
  - 一時的な停止後の再起動
```

### 6-5. メッセージ削除とOffsetの関係

```
【重要な理解】

メッセージ: 0 1 2 3 4 5 6 7 8 9
削除後:           5 6 7 8 9

ConsumerのOffset: 3（無効）
↓
auto.offset.reset = earliest → Offset 5から読む ✅
auto.offset.reset = latest   → Offset 10から読む（5-9を読まない）❌

【KafkaJSでの対応】
fromBeginning: true を使う
+ トラブル時はConsumer Group削除
```

---

## 7. よくある質問

### Q1. メッセージは何度も読めるの？

**A:** はい、読めます。

```bash
# 1回目
npm run consumer  # 10件読む

# 2回目（同じgroupId）
npm run consumer  # 0件（既に読んだ）

# 3回目（違うgroupId）
# consumer.tsのgroupIdを変更
npm run consumer  # 10件読む（新しいグループ）
```

### Q2. メッセージはいつ削除される？

**A:** 保持期間（デフォルト7日）が過ぎたら削除されます。

```bash
# Topicの設定確認
docker exec kafka-broker kafka-configs \
  --bootstrap-server localhost:9092 \
  --describe --entity-type topics --entity-name test-topic
```

### Q3. Consumerが読んだメッセージは削除される？

**A:** いいえ、削除されません。

```
通常のキュー（RabbitMQなど）:
  読んだら削除 → 1回しか読めない

Kafka:
  読んでも残る → 何度でも読める
```

### Q4. fromBeginning: true なのに途中から読まれる

**A:** 2回目以降の実行です。

```
初回実行: Offset 0から読む
2回目実行: Offset 10から読む（前回の続き）

【完全にリセットしたい場合】
npm run learn:offset-reset-flow -- 2  # Consumer Group削除
```

### Q5. 複数のConsumerを起動したらどうなる？

**A:** groupIdによって動作が変わります。

```
同じgroupId:
  Consumer1 → メッセージ 0,2,4,6,8
  Consumer2 → メッセージ 1,3,5,7,9
  （分け合う）

違うgroupId:
  Consumer1 → メッセージ 0-9 全部
  Consumer2 → メッセージ 0-9 全部
  （それぞれ全部読む）
```

### Q6. Offsetが無効になったらどうなる？

**A:** Kafka Brokerの設定に依存します。

```
【デフォルト動作（latest）】
残っているメッセージ: Offset 6-9
→ Offset 10から読む（6-9を読まない）

【確実に残りを読みたい場合】
npm run learn:offset-reset-flow -- 2  # Group削除
npm run consumer  # fromBeginning: true で起動
```

### Q7. パーティションはいくつ作るべき？

**A:** 並列度と順序保証のバランスで決めます。

```
1パーティション:
  - 並列度: 低い（1つのConsumerしか処理できない）
  - 順序保証: 完全（全メッセージが順番通り）

3パーティション:
  - 並列度: 中（3つのConsumerで分散処理）
  - 順序保証: パーティション内のみ

10パーティション:
  - 並列度: 高（10個まで並列処理可能）
  - 順序保証: パーティション内のみ

【推奨】
最初は1-3パーティション
必要に応じて増やす（減らすのは難しい）
```

### Q8. エラーが出たらどうする？

**A:** よくあるエラーと対処法

```
【エラー1: Connection refused】
→ Kafkaが起動していない
  docker compose ps
  docker compose up -d

【エラー2: Topic not found】
→ Topicが存在しない
  npm run producer  # Topicを作成

【エラー3: Offset out of range】
→ Offsetが無効
  npm run learn:offset-reset-flow -- 2  # リセット

【エラー4: TimeoutError】
→ Kafkaに接続できない
  docker compose logs kafka
```

---

## 8. 学習チェックリスト

全ての学習を終えたら、以下を確認してください：

### 基本操作
- [ ] Kafkaを起動できた
- [ ] Producerでメッセージを送信できた
- [ ] Consumerでメッセージを受信できた
- [ ] Kafka UIでメッセージを確認できた

### Consumer Group
- [ ] 同じgroupIdで負荷分散を確認した
- [ ] 違うgroupIdで独立処理を確認した
- [ ] groupIdの使い分けを理解した

### Partition
- [ ] 複数パーティションのTopicを作成できた
- [ ] 同じkeyが同じパーティションに送られることを確認した
- [ ] パーティションの役割を理解した

### Offset
- [ ] fromBeginning: true/false の違いを理解した
- [ ] 特定Offsetから読む方法を理解した
- [ ] Offsetの保存の仕組みを理解した

### リアルタイム
- [ ] ProducerとConsumerを同時に動かせた
- [ ] リアルタイムでメッセージが流れることを確認した
- [ ] 遅延（レイテンシ）を確認した

### Offsetリセット
- [ ] fromBeginningで初回リセットできた
- [ ] Consumer Group削除でリセットできた
- [ ] Admin APIでリセットできた
- [ ] メッセージ削除時の動作を理解した

---

## 9. 次のステップ

基本を習得したら、以下の発展的なトピックに進んでください：

### レベル2: 中級
- [ ] エラーハンドリング（送信失敗、受信失敗）
- [ ] リトライ処理
- [ ] Dead Letter Queue（DLQ）
- [ ] トランザクション（Exactly Once Semantics）

### レベル3: 上級
- [ ] パフォーマンスチューニング
- [ ] モニタリング（Prometheus, Grafana）
- [ ] Kafka Streams（ストリーム処理）
- [ ] スキーマレジストリ（Avro, Protobuf）

### レベル4: 本番運用
- [ ] セキュリティ（認証・認可）
- [ ] レプリケーション（冗長性）
- [ ] バックアップ・リカバリ
- [ ] マルチクラスタ構成

---

## 10. 便利なコマンド一覧

### 環境管理
```bash
# 起動
docker compose up -d

# 停止
docker compose down

# ログ確認
docker compose logs kafka
docker compose logs -f kafka  # リアルタイム表示
```

### Topic操作
```bash
# Topic一覧
docker exec kafka-broker kafka-topics --bootstrap-server localhost:9092 --list

# Topic詳細
docker exec kafka-broker kafka-topics --bootstrap-server localhost:9092 --describe --topic test-topic

# Topic作成
docker exec kafka-broker kafka-topics --bootstrap-server localhost:9092 --create --topic new-topic --partitions 3 --replication-factor 1

# Topic削除
docker exec kafka-broker kafka-topics --bootstrap-server localhost:9092 --delete --topic test-topic
```

### メッセージ確認
```bash
# 最初から10件読む
docker exec kafka-broker kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic test-topic \
  --from-beginning \
  --max-messages 10

# 最新のメッセージを待つ
docker exec kafka-broker kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic test-topic
```

### Consumer Group管理
```bash
# Consumer Group一覧
docker exec kafka-broker kafka-consumer-groups --bootstrap-server localhost:9092 --list

# Consumer Group詳細
docker exec kafka-broker kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group test-group

# Consumer Group削除
docker exec kafka-broker kafka-consumer-groups --bootstrap-server localhost:9092 --delete --group test-group
```

### 学習スクリプト
```bash
# Consumer Group学習
npm run learn:producer-group
npm run learn:consumer-group -- consumer1

# Partition学習
npm run learn:partition-producer
npm run learn:partition-consumer

# Offset学習
npm run learn:offset -- beginning
npm run learn:offset -- latest
npm run learn:offset -- 5

# リアルタイム学習
npm run learn:realtime-consumer
npm run learn:realtime-producer

# Offsetリセット学習
npm run learn:offset-reset-flow -- 1
npm run learn:offset-reset-flow -- 2
npm run learn:offset-reset-flow -- 3
npm run learn:offset-reset-flow -- 4

# auto.offset.reset説明
npm run learn:auto-offset -- explain
npm run learn:auto-offset -- run
```

---

**作成日**: 2026-04-16
**最終更新**: 2026-04-16
