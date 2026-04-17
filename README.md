# Kafka 学習プロジェクト

Apache Kafkaの基礎から実践まで学べる学習用プロジェクトです。

## 🚀 クイックスタート

### まずはこのドキュメントを読んでください

**初めての方**: [`GETTING_STARTED.md`](GETTING_STARTED.md)（30分）
  - 環境セットアップ
  - Kafkaの3つの基本概念（Producer、Kafka、Consumer）
  - 動作確認

**学習を始める**: [`LEARNING_GUIDE.md`](LEARNING_GUIDE.md)（2-3日）
  - 7つのステップで体系的に学習
  - 各ステップにフローチャートとデータフロー付き
  - 実行コマンド → 期待される出力 → 確認方法

---

## 📋 目次

- [概要](#概要)
- [ドキュメント構成](#ドキュメント構成)
- [ディレクトリ構成](#ディレクトリ構成)
- [学習スクリプト一覧](#学習スクリプト一覧)
- [トラブルシューティング](#トラブルシューティング)

---

## ドキュメント構成

このプロジェクトのドキュメントは、学習の流れに沿って3つに整理されています：

### 1. はじめに（30分）
- **[GETTING_STARTED.md](GETTING_STARTED.md)** - 環境セットアップと基本概念
  - Docker環境の起動
  - Kafkaの3つの基本概念（図解付き）
  - 動作確認（メッセージ送受信テスト）

### 2. 学習ガイド（2-3日）
- **[LEARNING_GUIDE.md](LEARNING_GUIDE.md)** - 7つのステップで体系的に学習
  - 各ステップにフローチャートとデータフロー図付き
  - 前提条件 → 実行方法 → 期待される結果 → 確認方法
  - 理解度チェック

### 3. リファレンス（必要に応じて参照）
- **[docs/](docs/)** - 詳細ドキュメント
  - `kafka-basics.md`: Kafka基礎知識
  - `how-to-check-offset.md`: Offset確認方法の詳細
  - `offset-management.md`: Offset管理の詳細
  - その他のリファレンスドキュメント

---

## 概要

このプロジェクトでは、以下を学習できます：

- ✅ Kafkaの基本概念（Producer, Consumer, Topic, Partition, Offset）
- ✅ Consumer Groupによる負荷分散
- ✅ Partitionによるメッセージの振り分け
- ✅ Offsetの管理と読み取り位置の制御
- ✅ リアルタイムメッセージング
- ✅ Offsetリセットと再取得の実装パターン

### 技術スタック

- **Apache Kafka**: 3.6.0 (Confluent Platform 7.6.0)
- **KafkaJS**: 2.2.4
- **Node.js**: 20+
- **TypeScript**: 5.0+
- **Docker & Docker Compose**: Kafka環境のセットアップ

---

## セットアップ

### 1. 前提条件

- Docker & Docker Compose がインストールされていること
- Node.js 20以上

### 2. Kafka環境の起動

```bash
# Kafka、Zookeeper、Kafka UIを起動
docker-compose up -d

# 起動確認
docker-compose ps
```

サービス一覧：
- **Zookeeper**: `localhost:2181` - Kafkaのメタデータ管理
- **Kafka Broker**: `localhost:19092` (ホストから接続) / `kafka:9092` (Docker内から接続)
- **Kafka UI**: `http://localhost:8080` - Web管理画面

### 3. 依存パッケージのインストール

```bash
npm install
```

---

## クイックスタート

### 1. トピック確認

Kafka UIでトピックを確認：
```
http://localhost:8080
```

**自動作成されるトピック（全11個）:**

テスト用トピック（6個）:
- `orders-topic` - 注文情報
- `payments-topic` - 決済情報
- `notifications-topic` - 通知
- `events-topic` - イベント
- `logs-topic` - ログ
- `health-check-topic` - ヘルスチェック

学習用トピック（5個）:
- `learn-topic` - Consumer Group、Offset学習用（1 partition）
- `partition-topic` - Partition学習用（3 partitions）
- `realtime-topic` - リアルタイム受信学習用（1 partition）
- `test-topic` - Offsetリセットテスト用（1 partition）
- `demo-topic` - Offsetコミット学習用（1 partition）

### 2. メッセージ送信テスト

```bash
# 全トピックにメッセージ送信（各3件）
npm run test:all
```

### 3. メッセージ受信確認

```bash
# 全トピックのメッセージを検証
npm run test:verify-all
```

---

## ディレクトリ構成

```
kafka-learning/
├── GETTING_STARTED.md          # 最初に読むドキュメント（環境セットアップ）
├── LEARNING_GUIDE.md           # 学習ガイド（7つのステップ）
├── README.md                   # このファイル
├── docker-compose.yml          # Kafka環境定義
├── package.json                # npmスクリプト・依存関係
├── tsconfig.json               # TypeScript設定
├── docs/                       # リファレンスドキュメント
│   ├── kafka-basics.md         # Kafka用語集
│   ├── how-to-check-offset.md  # Offset確認の詳細
│   └── offset-management.md    # Offset管理の詳細
├── src/
│   ├── learn/                  # 学習用スクリプト（10個）
│   │   ├── producer-for-group.ts         # Consumer Group用Producer
│   │   ├── consumer-group.ts             # Consumer Group学習
│   │   ├── partition-producer.ts         # Partition学習用Producer
│   │   ├── partition-consumer.ts         # Partition学習用Consumer
│   │   ├── offset-consumer.ts            # Offset学習
│   │   ├── realtime-producer.ts          # リアルタイム送信
│   │   ├── realtime-consumer.ts          # リアルタイム受信
│   │   ├── offset-reset-flow.ts          # Offsetリセット実装パターン
│   │   ├── auto-offset-reset-demo.ts     # auto.offset.reset解説
│   │   ├── offset-commit-demo.ts         # Offsetコミット学習
│   │   └── offset-reset-test.ts          # Offsetリセット動作確認
│   ├── test-producer.ts        # 本番トピック用Producer
│   ├── test-consumer.ts        # 本番トピック用Consumer
│   ├── test-all-topics.ts      # 全トピック送信テスト
│   ├── test-verify-all.ts      # 全トピック検証
│   ├── kafka-config.ts         # Kafka設定（本番/開発切り替え）
│   ├── app.module.ts           # NestJSメインモジュール
│   └── kafka/                  # Kafka関連モジュール
│       ├── kafka.module.ts
│       ├── kafka.service.ts
│       ├── kafka.controller.ts
│       ├── offset.controller.ts
│       └── offset-manager.service.ts
└── README.md                   # このファイル
```

---

## 学習スクリプト

### 📋 使用するトピック一覧

各学習スクリプトは以下の一般的な名前のトピックを使用します：

| トピック名 | 用途 | 使用するスクリプト |
|-----------|------|------------------|
| `learn-topic` | Consumer Group、Offset学習 | `learn:consumer-group`<br>`learn:producer-group`<br>`learn:offset` |
| `partition-topic` | Partition学習 | `learn:partition-producer`<br>`learn:partition-consumer` |
| `realtime-topic` | リアルタイム受信学習 | `learn:realtime-producer`<br>`learn:realtime-consumer` |
| `test-topic` | Offsetリセットテスト | `learn:offset-reset-test` |
| `demo-topic` | Offsetコミットデモ | `learn:offset-commit` |

---

### 1. Consumer Group学習

**概要**: 同じgroupIdのConsumerがメッセージを分け合う動作を学習

```bash
# Step 1: メッセージを送信（10件）
npm run learn:producer-group

# Step 2: Consumer起動（別ターミナルで複数起動可能）
npm run learn:consumer-group

# 同じgroupIdなら負荷分散、違うgroupIdなら全メッセージを受信
```

### 2. Partition学習

**概要**: 同じkeyを持つメッセージが同じPartitionに送られることを学習

```bash
# Step 1: 3つのPartitionを持つトピックを作成してメッセージ送信
npm run learn:partition-producer

# Step 2: Consumer起動
npm run learn:partition-consumer
```

### 3. Offset学習

**概要**: Offsetの読み取り位置を制御する方法を学習

```bash
# 最初から読む
npm run learn:offset -- beginning

# 最新のみ読む（これから送られるメッセージのみ）
npm run learn:offset -- latest

# Offset 5から読む
npm run learn:offset -- 5
```

### 4. リアルタイム受信学習

**概要**: Producer→Consumerのリアルタイム性を確認

```bash
# ターミナル1: Consumer起動（待機）
npm run learn:realtime-consumer

# ターミナル2: Producer起動（3秒ごとに送信）
npm run learn:realtime-producer
```

### 5. Offsetリセット学習

**概要**: Offsetリセットの4つの実装パターンを学習

```bash
# パターン1: fromBeginning（初回のみ最初から）
npm run learn:offset-reset-flow -- 1

# パターン2: Consumer Group削除（完全リセット）
npm run learn:offset-reset-flow -- 2

# パターン3: Admin APIでOffset指定
npm run learn:offset-reset-flow -- 3

# パターン4: 毎回最初から読む
npm run learn:offset-reset-flow -- 4
```

### 6. auto.offset.reset解説

**概要**: KafkaJSでのoffset reset動作の説明

```bash
# 説明を表示
npm run learn:auto-offset

# 実際に動かす
npm run learn:auto-offset -- run
```

### 7. Offsetコミット学習

**概要**: 自動コミット、手動コミット、Offsetリセットの仕組みを学習

```bash
# Step 1: セットアップ（20件のメッセージ準備）
npm run learn:offset-commit -- setup

# Step 2: 自動コミット（5件読む）
npm run learn:offset-commit -- auto

# Step 3: Offset確認
npm run learn:offset-commit -- check-offset

# Step 4: 手動コミット（5件読む）
npm run learn:offset-commit -- manual

# Step 5: Offsetリセット
npm run learn:offset-commit -- reset-offset

# Step 6: 途中で止めるデモ
npm run learn:offset-commit -- stop-middle
```

### 8. Offsetリセット動作確認

**概要**: Offsetリセット時の動作（fromBeginning: true/false）を実際に確認

```bash
# Step 1: セットアップ（10件送信）
npm run learn:offset-reset-test -- setup

# Step 2: 5件読む
npm run learn:offset-reset-test -- read5

# Step 3: Consumer Group削除（Offsetリセット）
npm run learn:offset-reset-test -- delete

# Step 4A: デフォルト設定で読む（新しいメッセージ待機）
npm run learn:offset-reset-test -- read-default

# Step 4B: fromBeginning: true で読む（全メッセージ読む）
npm run learn:offset-reset-test -- read-beginning
```

---

## テストスクリプト

### 個別トピックテスト

```bash
# orders-topicに5件送信
npm run test:producer

# orders-topicから受信
npm run test:consumer
```

### 全トピックテスト

```bash
# 全6トピックに各3件送信（計18件）
npm run test:all

# 全6トピックの受信検証
npm run test:verify-all
```

---

## リファレンスドキュメント

必要に応じて参照してください：

- **[docs/kafka-basics.md](docs/kafka-basics.md)** - Kafka用語集
  - Broker, Topic, Partition, Offset, Consumer Groupの詳細説明
  - HTTPとの違い
  - 実践的なユースケース

- **[docs/how-to-check-offset.md](docs/how-to-check-offset.md)** - Offset確認の詳細
  - Kafka UIでの確認手順（画面キャプチャ付き）
  - CLIコマンドの全オプション解説
  - 各列（Current Offset、End Offset、Lag）の詳細説明

- **[docs/offset-management.md](docs/offset-management.md)** - Offset管理の詳細
  - 自動コミット vs 手動コミットの仕組み
  - ベストプラクティス
  - 本番環境での推奨設定

---

## トラブルシューティング

### Kafkaに接続できない

```bash
# Kafkaが起動しているか確認
docker-compose ps

# ログを確認
docker-compose logs kafka

# 再起動
docker-compose restart kafka
```

### Consumerがメッセージを受信しない

**原因1**: Topicが存在しない
```bash
# CLIでトピック一覧確認
docker exec kafka-broker kafka-topics --bootstrap-server localhost:9092 --list
```

**原因2**: Offsetが最新になっている
```bash
# fromBeginning: true で最初から読む
# または Offset をリセット
```

**原因3**: Consumer Groupが既に存在し、最後まで読み終えている
```bash
# 新しいgroupIdを使うか、Offsetをリセット
```

### broker接続エラー: `getaddrinfo ENOTFOUND kafka`

**原因**: `localhost:9092`を使用している（Docker内部アドレス）

**解決策**: `localhost:19092`を使用する（ホストからの接続）

```typescript
// ❌ 間違い
brokers: ['localhost:9092']

// ✅ 正しい
brokers: ['localhost:19092']
```

### トピックが自動作成されない

```bash
# docker-compose.ymlのkafka-init-topicsコンテナログを確認
docker-compose logs kafka-init-topics

# トピックを手動作成
docker exec kafka-broker kafka-topics \
  --bootstrap-server localhost:9092 \
  --create \
  --topic test-topic \
  --partitions 1 \
  --replication-factor 1
```

### Consumer Group削除時のエラー（エラーコード69）

**エラー**: `KafkaJSDeleteGroupsError: errorCode: 69`

**原因**: Consumer Groupが存在しない、またはConsumerがアクティブ

**解決策1（存在しない場合）:**
- 学習スクリプトは自動的に処理します
- 「Consumer Group "xxx" は存在しません（問題なし）」と表示されます

**解決策2（Consumerがアクティブな場合）:**
```bash
# 1. 全てのConsumerを停止（Ctrl+C）
# 2. 数秒待ってから再度削除を実行

# または、CLIで確認
docker exec kafka-broker-modern kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group グループ名 \
  --describe
```

---

## 参考リンク

- [Apache Kafka 公式ドキュメント](https://kafka.apache.org/documentation/)
- [KafkaJS ドキュメント](https://kafka.js.org/)
- [Confluent Kafka Docker](https://hub.docker.com/r/confluentinc/cp-kafka)

---

## ライセンス

MIT

---

## まとめ

このプロジェクトで学べること：

1. ✅ **基礎**: Producer/Consumer/Topic/Partitionの基本概念
2. ✅ **負荷分散**: Consumer Groupによる並列処理
3. ✅ **データ振り分け**: Partitionとkeyの関係
4. ✅ **位置制御**: Offsetの管理と読み取り位置の指定
5. ✅ **リアルタイム**: 低遅延なメッセージング
6. ✅ **実装パターン**: Offsetリセットの4つの方法

まずは `npm run test:all` → `npm run test:verify-all` でKafka環境が正常に動作することを確認してから、`src/learn/`の各スクリプトで段階的に学習してください。
