# Kafka学習プロジェクト - 完全ガイド

このドキュメントでは、プロジェクト全体のファイル構成、各ファイルの役割、そして学習シナリオを包括的に解説します。

---

## 📋 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [ファイル構成](#ファイル構成)
3. [各ファイルの役割](#各ファイルの役割)
4. [学習シナリオ（初心者向け完全ガイド）](#学習シナリオ初心者向け完全ガイド)
5. [ファイル間の関係図](#ファイル間の関係図)
6. [よくある質問](#よくある質問)

---

## プロジェクト概要

### 🎯 目的

このプロジェクトは、Apache Kafkaの基礎から実践まで、**体系的に学習できる環境**を提供します。

### 🛠️ 技術スタック

- **Apache Kafka**: 3.6.0 (Confluent Platform 7.6.0)
- **KafkaJS**: 2.2.4（Node.js用Kafkaクライアント）
- **Node.js**: 20+
- **TypeScript**: 5.0+
- **NestJS**: 10.0（本番用フレームワーク、オプション）
- **Docker & Docker Compose**: Kafka環境

### 📊 プロジェクトの特徴

1. **11個のトピック**: 6個の本番風トピック + 5個の学習専用トピック
2. **13個の学習スクリプト**: 各機能を個別に学べる
3. **5個の詳細ドキュメント**: 理論と実践の両方をカバー
4. **3つの確認方法**: Kafka UI、CLIコマンド、独自スクリプト

---

## ファイル構成

```
kafka-learning/
│
├── 📄 設定ファイル
│   ├── docker-compose.yml          # Kafka環境の定義（最重要）
│   ├── package.json                # npmスクリプト定義
│   ├── tsconfig.json               # TypeScript設定
│   └── nest-cli.json               # NestJS設定
│
├── 📁 docs/                        # ドキュメント（5ファイル）
│   ├── kafka-basics.md             # Kafka基礎知識
│   ├── complete-guide.md           # 完全学習ガイド
│   ├── offset-management.md        # Offset管理詳細
│   ├── how-to-check-offset.md      # Offset確認方法
│   ├── learning-scripts-guide.md   # 各スクリプトの使い方
│   └── project-overview.md         # このファイル
│
├── 📁 src/                         # ソースコード
│   │
│   ├── 📁 learn/                   # 学習用スクリプト（13ファイル）
│   │   ├── producer-for-group.ts           # [1] Consumer Group用Producer
│   │   ├── consumer-group.ts               # [1] Consumer Group学習
│   │   ├── partition-producer.ts           # [2] Partition学習用Producer
│   │   ├── partition-consumer.ts           # [2] Partition学習用Consumer
│   │   ├── offset-consumer.ts              # [3] Offset位置制御
│   │   ├── realtime-producer.ts            # [4] リアルタイム送信
│   │   ├── realtime-consumer.ts            # [4] リアルタイム受信
│   │   ├── offset-reset-flow.ts            # [5] Offsetリセット4パターン
│   │   ├── auto-offset-reset-demo.ts       # [5] auto.offset.reset解説
│   │   ├── offset-commit-demo.ts           # [6] 自動/手動コミット
│   │   ├── offset-reset-test.ts            # [6] リセット動作確認
│   │   ├── check-offset-demo.ts            # [7] Offset確認デモ
│   │   └── view-offset.ts                  # [7] Offset詳細表示ツール
│   │
│   ├── 📁 test用スクリプト（4ファイル）
│   │   ├── test-all-topics.ts              # 全6トピックに送信
│   │   ├── test-verify-all.ts              # 全6トピック検証
│   │   ├── test-producer.ts                # orders-topic送信
│   │   └── test-consumer.ts                # orders-topic受信
│   │
│   ├── 📁 本番用モジュール（NestJS、オプション）
│   │   ├── kafka-config.ts                 # Kafka設定
│   │   ├── app.module.ts                   # メインモジュール
│   │   └── kafka/
│   │       ├── kafka.module.ts             # KafkaモジュールNestJS用）
│   │       ├── kafka.service.ts            # Kafkaサービス
│   │       ├── kafka.controller.ts         # Kafkaコントローラ
│   │       ├── offset.controller.ts        # Offset操作API
│   │       └── offset-manager.service.ts   # Offset管理サービス
│   │
│   └── README.md                   # プロジェクトREADME
│
└── 🐳 Docker関連
    └── docker-compose.yml          # Kafka + Zookeeper + Kafka UI
```

### 📊 ファイル数の内訳

| カテゴリ | ファイル数 | 役割 |
|---------|-----------|------|
| 学習スクリプト | 13 | Kafkaの各機能を学ぶ |
| テストスクリプト | 4 | 本番風トピックのテスト |
| ドキュメント | 6 | 理論・実践の解説 |
| 本番用モジュール | 6 | NestJSでの本番実装例 |
| 設定ファイル | 4 | 環境設定 |
| **合計** | **33** | |

---

## 各ファイルの役割

### 🐳 Docker環境（最重要）

#### `docker-compose.yml`

**役割**: Kafka環境全体を定義・起動

**内容**:
- **zookeeper**: Kafkaのメタデータ管理（ポート: 2181）
- **kafka-broker-modern**: Kafkaブローカー本体
  - 内部: `kafka:9092`（Docker内の他コンテナから接続）
  - 外部: `localhost:19092`（ホストマシンから接続）
- **kafka-ui**: Web管理画面（ポート: 8080）
- **kafka-init-topics**: 起動時に11個のトピックを自動作成

**自動作成されるトピック（11個）**:

| トピック名 | Partition数 | 用途 |
|-----------|------------|------|
| `orders-topic` | 1 | 注文情報（本番風） |
| `payments-topic` | 1 | 決済情報（本番風） |
| `notifications-topic` | 1 | 通知（本番風） |
| `events-topic` | 1 | イベント（本番風） |
| `logs-topic` | 1 | ログ（本番風） |
| `health-check-topic` | 1 | ヘルスチェック（本番風） |
| `learn-topic` | 1 | Consumer Group/Offset学習 |
| `partition-topic` | 3 | Partition学習（3分割） |
| `realtime-topic` | 1 | リアルタイム受信学習 |
| `test-topic` | 1 | Offsetリセットテスト |
| `demo-topic` | 1 | Offsetコミット学習 |

**コマンド**:
```bash
# 起動
docker-compose up -d

# 停止
docker-compose down

# ログ確認
docker-compose logs kafka-broker-modern

# 再起動
docker-compose restart kafka-broker-modern
```

---

### 📚 ドキュメント（6ファイル）

#### `docs/kafka-basics.md`

**役割**: Kafkaの基礎知識を解説

**内容**:
- Kafka用語解説（Broker, Topic, Partition, Offset, Consumer Group）
- HTTPとの違い
- Consumer Groupの仕組み
- 実践的なユースケース

**読むタイミング**: 学習の最初、Kafkaを初めて使う時

---

#### `docs/complete-guide.md`

**役割**: 基礎から応用まで完全ガイド

**内容**:
- 環境セットアップ手順
- 各学習スクリプトの実行方法
- Offsetリセットの全パターン
- Q&A集
- トラブルシューティング

**読むタイミング**: kafka-basics.mdを読んだ後、実際に手を動かす前

---

#### `docs/offset-management.md`

**役割**: Offset管理の詳細解説

**内容**:
- Offsetの仕組み
- 自動コミット vs 手動コミット
- コミットタイミングの制御
- ベストプラクティス

**読むタイミング**: Consumer Groupを理解した後、本番運用を考える時

---

#### `docs/how-to-check-offset.md`

**役割**: Consumer GroupのOffset確認方法を詳細解説

**内容**:
- Kafka UIでの確認方法（ステップバイステップ）
- スクリプトでの確認方法
- CLIコマンドでの確認方法
- 各列（Current Offset、End Offset、Lag）の意味
- Offset値の意味（-1, 0, 5など）

**読むタイミング**: Offsetの概念を理解した後、実際に確認したい時

---

#### `docs/learning-scripts-guide.md`

**役割**: 各学習スクリプトの使い方を詳細解説

**内容**:
- 各スクリプトで何を学ぶか
- 使い方（コマンド、出力例）
- Kafka UIでの確認方法
- 重要なコード解説
- 実践例

**読むタイミング**: 各学習スクリプトを実行する時（リファレンス）

---

#### `docs/project-overview.md`（このファイル）

**役割**: プロジェクト全体の俯瞰

**内容**:
- ファイル構成
- 各ファイルの役割
- 学習シナリオ
- ファイル間の関係

**読むタイミング**: プロジェクト全体を理解したい時、何から始めればいいか迷った時

---

### 🎓 学習用スクリプト（13ファイル）

#### [1] Consumer Group学習（2ファイル）

**`src/learn/producer-for-group.ts`**
- **役割**: Consumer Group学習用にメッセージを送信
- **動作**: `learn-topic`に10件のメッセージを送信
- **コマンド**: `npm run learn:producer-group`

**`src/learn/consumer-group.ts`**
- **役割**: Consumer Groupの負荷分散を学習
- **動作**: 同じgroupIdなら負荷分散、異なるgroupIdなら独立受信
- **コマンド**: `npm run learn:consumer-group`

**学べること**:
- 同じ`groupId`のConsumerは、メッセージを分け合う
- 異なる`groupId`のConsumerは、全メッセージを受信
- 複数ターミナルで同時起動して負荷分散を確認

---

#### [2] Partition学習（2ファイル）

**`src/learn/partition-producer.ts`**
- **役割**: Partitionへのメッセージ振り分けを学習
- **動作**: 3つのPartitionを持つトピックを作成し、keyで振り分け
- **コマンド**: `npm run learn:partition-producer`

**`src/learn/partition-consumer.ts`**
- **役割**: 各Partitionからのメッセージ受信を学習
- **動作**: 全Partitionから受信し、統計を表示
- **コマンド**: `npm run learn:partition-consumer`

**学べること**:
- 同じkeyのメッセージは、同じPartitionに送られる
- Partitionごとにメッセージが分散される
- 順序保証の仕組み（同じPartition内では順序が保証される）

---

#### [3] Offset学習（1ファイル）

**`src/learn/offset-consumer.ts`**
- **役割**: Offset位置の制御を学習
- **動作**: 最初から / 最新のみ / 特定のOffsetから読む
- **コマンド**:
  - `npm run learn:offset -- beginning`（最初から）
  - `npm run learn:offset -- latest`（最新のみ）
  - `npm run learn:offset -- 5`（Offset 5から）

**学べること**:
- Offsetは、Partition内のメッセージ位置（0から始まる）
- 読み取り開始位置を自由に制御できる
- `fromBeginning`とseekの違い

---

#### [4] リアルタイム受信学習（2ファイル）

**`src/learn/realtime-producer.ts`**
- **役割**: リアルタイムメッセージ送信
- **動作**: 3秒ごとにタイムスタンプ付きメッセージを送信
- **コマンド**: `npm run learn:realtime-producer`

**`src/learn/realtime-consumer.ts`**
- **役割**: リアルタイムメッセージ受信
- **動作**: 送信されたメッセージをすぐに受信、遅延を表示
- **コマンド**: `npm run learn:realtime-consumer`

**学べること**:
- Kafkaは低遅延（数ミリ秒〜数十ミリ秒）
- ProducerとConsumerは非同期で動作
- `fromBeginning: false`でリアルタイム受信

---

#### [5] Offsetリセット学習（3ファイル）

**`src/learn/offset-reset-flow.ts`**
- **役割**: Offsetリセットの4つの実装パターンを学習
- **動作**: 引数によってパターンを切り替え
- **コマンド**: `npm run learn:offset-reset-flow -- [1|2|3|4]`
  - `1`: fromBeginning（初回のみ最初から）
  - `2`: Consumer Group削除（完全リセット）
  - `3`: Admin APIでOffset指定
  - `4`: 毎回最初から読む（動的groupId）

**`src/learn/auto-offset-reset-demo.ts`**
- **役割**: `auto.offset.reset`設定の動作を解説
- **動作**: KafkaJSでのoffset reset動作を説明
- **コマンド**: `npm run learn:auto-offset`

**`src/learn/offset-reset-test.ts`**
- **役割**: Offsetリセット時の動作を実際に確認
- **動作**: setup → read5 → delete → read-default / read-beginning
- **コマンド**: `npm run learn:offset-reset-test -- [setup|read5|delete|read-default|read-beginning]`

**学べること**:
- Offsetリセットの4つのパターンとその使い分け
- `fromBeginning: true`と`false`の違い
- Consumer Group削除の方法とタイミング
- 本番環境での再処理方法

---

#### [6] Offsetコミット学習（2ファイル）

**`src/learn/offset-commit-demo.ts`**
- **役割**: 自動コミット vs 手動コミットを学習
- **動作**: 引数によって動作を切り替え
- **コマンド**: `npm run learn:offset-commit -- [setup|auto|manual|check-offset|reset-offset|stop-middle]`

**学べること**:
- 自動コミット（デフォルト、5秒ごと）
- 手動コミット（処理成功後のみコミット）
- コミット前に止めるとどうなるか
- 本番環境での推奨設定

---

#### [7] Offset確認学習（2ファイル）

**`src/learn/check-offset-demo.ts`**
- **役割**: 5件読んでOffsetをコミット、確認方法を表示
- **動作**: `offset-check-group`で5件読み、Kafka UI確認手順を表示
- **コマンド**: `npm run learn:check-offset`

**`src/learn/view-offset.ts`**
- **役割**: Consumer GroupのOffset詳細を表示するツール
- **動作**: 現在のOffset、トピックのOffset、進捗率を計算・表示
- **コマンド**: `npm run learn:view-offset [groupId] [topic]`

**学べること**:
- Consumer GroupのOffset確認方法（3種類）
- Current Offset、End Offset、Lagの意味
- 読み終えたメッセージ数、未読メッセージ数の確認

---

### 🧪 テストスクリプト（4ファイル）

#### `src/test-all-topics.ts`

**役割**: 全6トピックに各3件のメッセージを送信（計18件）

**動作**:
- `orders-topic` に注文情報3件
- `payments-topic` に決済情報3件
- `notifications-topic` に通知3件
- `events-topic` にイベント3件
- `logs-topic` にログ3件
- `health-check-topic` にヘルスチェック3件

**コマンド**: `npm run test:all`

**使用場面**: 環境セットアップ後の動作確認

---

#### `src/test-verify-all.ts`

**役割**: 全6トピックからメッセージを受信・検証

**動作**: 各トピックから最大10件受信し、正常に送受信できているか確認

**コマンド**: `npm run test:verify-all`

**使用場面**: `test:all`の後、メッセージが正常に送信されたか確認

---

#### `src/test-producer.ts`

**役割**: `orders-topic`に5件のメッセージを送信

**コマンド**: `npm run test:producer`

**使用場面**: 個別トピックのテスト

---

#### `src/test-consumer.ts`

**役割**: `orders-topic`からメッセージを受信

**コマンド**: `npm run test:consumer`

**使用場面**: 個別トピックの受信テスト

---

### 🏭 本番用モジュール（NestJS、6ファイル）

**注意**: これらのファイルは、NestJSフレームワークで本番アプリケーションを作る場合に使用します。学習には直接関係しません。

#### `src/kafka-config.ts`

**役割**: Kafka接続設定（開発/本番の切り替え）

#### `src/app.module.ts`

**役割**: NestJSメインモジュール

#### `src/kafka/kafka.module.ts`

**役割**: KafkaモジュールのNestJS統合

#### `src/kafka/kafka.service.ts`

**役割**: Kafkaサービス（Producer/Consumerのラッパー）

#### `src/kafka/kafka.controller.ts`

**役割**: Kafka操作のHTTP API

#### `src/kafka/offset.controller.ts`

**役割**: Offset操作のHTTP API

#### `src/kafka/offset-manager.service.ts`

**役割**: Offset管理サービス

---

### ⚙️ 設定ファイル（4ファイル）

#### `package.json`

**役割**: npmスクリプト定義、依存パッケージ管理

**重要なスクリプト**:
```json
{
  "scripts": {
    // Consumer Group学習
    "learn:producer-group": "ts-node src/learn/producer-for-group.ts",
    "learn:consumer-group": "ts-node src/learn/consumer-group.ts",

    // Partition学習
    "learn:partition-producer": "ts-node src/learn/partition-producer.ts",
    "learn:partition-consumer": "ts-node src/learn/partition-consumer.ts",

    // Offset学習
    "learn:offset": "ts-node src/learn/offset-consumer.ts",

    // リアルタイム学習
    "learn:realtime-producer": "ts-node src/learn/realtime-producer.ts",
    "learn:realtime-consumer": "ts-node src/learn/realtime-consumer.ts",

    // Offsetリセット学習
    "learn:offset-reset-flow": "ts-node src/learn/offset-reset-flow.ts",
    "learn:auto-offset": "ts-node src/learn/auto-offset-reset-demo.ts",
    "learn:offset-reset-test": "ts-node src/learn/offset-reset-test.ts",

    // Offsetコミット学習
    "learn:offset-commit": "ts-node src/learn/offset-commit-demo.ts",

    // Offset確認学習
    "learn:check-offset": "ts-node src/learn/check-offset-demo.ts",
    "learn:view-offset": "ts-node src/learn/view-offset.ts",

    // テスト
    "test:all": "ts-node src/test-all-topics.ts",
    "test:verify-all": "ts-node src/test-verify-all.ts",
    "test:producer": "ts-node src/test-producer.ts",
    "test:consumer": "ts-node src/test-consumer.ts"
  }
}
```

---

#### `tsconfig.json`

**役割**: TypeScript コンパイラ設定

---

#### `nest-cli.json`

**役割**: NestJS CLI設定（本番用、オプション）

---

#### `README.md`

**役割**: プロジェクトREADME（概要、セットアップ、使い方）

---

## 学習シナリオ（初心者向け完全ガイド）

### 🎯 学習目標

Kafkaの基礎から実践まで、体系的に理解し、本番環境で使えるレベルを目指します。

---

### 📅 学習ステップ（7ステップ、推奨期間: 1-2週間）

---

## **ステップ0: 環境セットアップ（30分）**

### 目的
Kafka環境を起動し、正常に動作することを確認

### 実行内容

#### 1. Docker環境起動
```bash
docker-compose up -d
```

**確認**: 3つのコンテナが起動
```bash
docker-compose ps
```

出力例:
```
NAME                   STATUS
zookeeper              Up
kafka-broker-modern    Up
kafka-ui               Up
```

#### 2. Kafka UIにアクセス

ブラウザで http://localhost:8080 を開く

**確認ポイント**:
- 左メニューから「Topics」をクリック
- 11個のトピックが自動作成されているか確認

| トピック名 | Partitions |
|-----------|-----------|
| orders-topic | 1 |
| payments-topic | 1 |
| notifications-topic | 1 |
| events-topic | 1 |
| logs-topic | 1 |
| health-check-topic | 1 |
| learn-topic | 1 |
| partition-topic | 3 |
| realtime-topic | 1 |
| test-topic | 1 |
| demo-topic | 1 |

#### 3. 依存パッケージのインストール
```bash
npm install
```

#### 4. 動作確認テスト
```bash
# 全トピックに各3件送信（計18件）
npm run test:all

# 全トピックから受信・検証
npm run test:verify-all
```

**成功の確認**:
```
✓ 全6トピックにメッセージを送信完了！
✓ 全6トピックの検証完了！
```

---

## **ステップ1: Kafka基礎知識（1-2時間）**

### 目的
Kafkaの基本概念を理解する

### 実行内容

#### 1. ドキュメントを読む

**`docs/kafka-basics.md`を読む（30分）**

重要な概念:
- **Broker**: Kafkaサーバー（メッセージを保存）
- **Topic**: メッセージの分類（例: orders-topic）
- **Partition**: Topicの分割（並列処理のため）
- **Offset**: Partition内のメッセージ位置（0から始まる）
- **Consumer Group**: Consumerのグループ（負荷分散）

#### 2. Kafka UIで確認（30分）

**Topics確認**:
1. http://localhost:8080 → Topics
2. `learn-topic`をクリック
3. 「Messages」タブを開く

**確認ポイント**:
- Offset番号
- Partition番号
- メッセージ内容

**Consumers確認**:
1. 左メニューから「Consumers」をクリック
2. Consumer Groupを確認（まだ空）

#### 3. 理解度チェック

以下の質問に答えられるか確認:

1. Q: TopicとPartitionの違いは？
   - A: Topicはメッセージの分類、Partitionはその中の分割

2. Q: Offsetとは何か？
   - A: Partition内のメッセージ位置（0, 1, 2...）

3. Q: Consumer Groupとは何か？
   - A: 同じgroupIdを持つConsumerのグループ。負荷分散に使う

---

## **ステップ2: Consumer Group学習（2-3時間）**

### 目的
Consumer Groupによる負荷分散と独立受信を理解

### 実行内容

#### 1. ドキュメントを読む

**`docs/learning-scripts-guide.md`の「1. Consumer Group学習」を読む（20分）**

#### 2. メッセージ送信

```bash
npm run learn:producer-group
```

**確認**: 10件のメッセージが送信される

#### 3. Consumer起動（単一）

**ターミナル1:**
```bash
npm run learn:consumer-group
```

**確認**: 全10件のメッセージを受信

#### 4. Consumer起動（複数、負荷分散）

**ターミナル1:**
```bash
npm run learn:consumer-group
```

**ターミナル2:**
```bash
npm run learn:consumer-group
```

**再度メッセージ送信（ターミナル3）:**
```bash
npm run learn:producer-group
```

**確認**:
- ターミナル1: 約5件受信
- ターミナル2: 約5件受信
- 合計: 10件（負荷分散されている）

#### 5. Kafka UIで確認

1. http://localhost:8080 → Consumers
2. `consumer-learn-group`を探す
3. クリックして詳細確認

**確認ポイント**:
- Consumer数: 2台
- 各ConsumerのPartition割り当て
- Current Offset: 10（全メッセージ読み終えた）

#### 6. 理解度チェック

**実験**:
- ターミナル1、2を停止
- ターミナル3で新しいgroupId（`another-group`）に変更して起動
- 何件受信するか？

**答え**: 10件全て受信（異なるgroupIdなので独立）

---

## **ステップ3: Partition学習（2-3時間）**

### 目的
Partitionによるメッセージ振り分けと順序保証を理解

### 実行内容

#### 1. ドキュメントを読む

**`docs/learning-scripts-guide.md`の「2. Partition学習」を読む（20分）**

#### 2. メッセージ送信（Partitionに振り分け）

```bash
npm run learn:partition-producer
```

**出力の確認**:
```
✓ メッセージ 0 → Partition 2 (key: user-0)
✓ メッセージ 1 → Partition 0 (key: user-1)
✓ メッセージ 2 → Partition 1 (key: user-2)
✓ メッセージ 3 → Partition 0 (key: user-3)
✓ メッセージ 4 → Partition 2 (key: user-4)
✓ メッセージ 5 → Partition 2 (key: user-0) ← user-0は必ずPartition 2
```

**重要**: 同じkey（例: `user-0`）は必ず同じPartition（例: Partition 2）

#### 3. Consumer起動

```bash
npm run learn:partition-consumer
```

**確認**:
- Partitionごとのメッセージ数
- Keyごとのパーティション割り当て

#### 4. Kafka UIで確認

1. http://localhost:8080 → Topics → partition-topic
2. 「Messages」タブを開く
3. Partitionごとにフィルタして確認

**確認ポイント**:
- Partition 0: user-1、user-3のメッセージ
- Partition 1: user-2のメッセージ
- Partition 2: user-0、user-4のメッセージ

#### 5. 理解度チェック

**質問**:
1. Q: なぜ同じkeyは同じPartitionに送られるのか？
   - A: 順序保証のため。同じPartition内では、メッセージの順序が保証される。

2. Q: user-123の「商品追加」「決済」「注文完了」を順序保証するには？
   - A: 全てのメッセージに`key: 'user-123'`を指定する。

---

## **ステップ4: Offset学習（2-3時間）**

### 目的
Offsetの仕組みと読み取り位置の制御を理解

### 実行内容

#### 1. ドキュメントを読む

**`docs/learning-scripts-guide.md`の「3. Offset学習」を読む（20分）**

#### 2. 最初から読む（beginning）

```bash
npm run learn:offset -- beginning
```

**確認**: Offset 0から全メッセージを読む

#### 3. 最新のみ読む（latest）

```bash
npm run learn:offset -- latest
```

**確認**: 既存メッセージは読まず、待機状態

**別ターミナルでメッセージ送信**:
```bash
npm run learn:producer-group
```

**確認**: 新しいメッセージのみ受信

#### 4. 特定のOffsetから読む

```bash
npm run learn:offset -- 5
```

**確認**: Offset 5から読み始める

#### 5. Offset確認

```bash
npm run learn:view-offset offset-learn-group learn-topic
```

**出力例**:
```
【現在のOffset】
Topic: learn-topic
  Partition 0:
    Current Offset: 10
    → 次回は Offset 10 から読み始める

【トピックのOffset情報】
Partition 0:
  Low (最古): 0
  High (最新): 15
  → 合計メッセージ数: 15件

【進捗状況】
読み終えたメッセージ: 10件
未読メッセージ: 5件
進捗率: 66.7%
```

#### 6. 理解度チェック

**質問**:
1. Q: Current Offset: 5 は、どこまで読んだことを意味するか？
   - A: Offset 0〜4まで読んだ。次は Offset 5 から読む。

2. Q: Lag: 10 は何を意味するか？
   - A: 未読メッセージが10件ある。

---

## **ステップ5: リアルタイム受信学習（1-2時間）**

### 目的
Kafkaの低遅延性を体験

### 実行内容

#### 1. ドキュメントを読む

**`docs/learning-scripts-guide.md`の「4. リアルタイム受信学習」を読む（15分）**

#### 2. Consumer起動（待機）

**ターミナル1:**
```bash
npm run learn:realtime-consumer
```

**確認**: メッセージを待機中...

#### 3. Producer起動（送信開始）

**ターミナル2:**
```bash
npm run learn:realtime-producer
```

**確認**: 3秒ごとにメッセージ送信

#### 4. Consumer側で遅延確認

**ターミナル1の出力例**:
```
📩 メッセージ受信 (1件目)
受信時刻: 2026-04-17T06:30:00.135Z
送信時刻: 2026-04-17T06:30:00.123Z
遅延: 12ms ← 12ミリ秒で届いた
```

**確認**: 遅延が数ミリ秒〜数十ミリ秒

#### 5. 理解度チェック

**質問**:
1. Q: なぜ低遅延なのか？
   - A: Kafkaはメッセージをメモリとディスクに効率的に保存し、Consumerはポーリングで常に待機しているため。

---

## **ステップ6: Offsetリセット学習（3-4時間）**

### 目的
本番環境で重要なOffsetリセットの4つのパターンを習得

### 実行内容

#### 1. ドキュメントを読む

**`docs/learning-scripts-guide.md`の「5. Offsetリセット学習」を読む（30分）**
**`docs/offset-management.md`を読む（30分）**

#### 2. パターン1: fromBeginning（初回のみ）

```bash
# 1回目
npm run learn:offset-reset-flow -- 1
```
**確認**: Offset 0から5件読む

```bash
# 2回目（すぐ実行）
npm run learn:offset-reset-flow -- 1
```
**確認**: Offset 5から5件読む（続きから）

**理解**: `fromBeginning: true`は初回のみ最初から

#### 3. パターン2: Consumer Group削除

```bash
npm run learn:offset-reset-flow -- 2
```
**確認**: Consumer Group `pattern2-group`が削除される

```bash
# 次回起動時は必ず最初から読む
```

#### 4. パターン3: Admin APIでOffset指定

```bash
npm run learn:offset-reset-flow -- 3
```

**確認**: Offset 0にセットされる

#### 5. パターン4: 毎回最初から（動的groupId）

```bash
npm run learn:offset-reset-flow -- 4
```

**確認**: 毎回新しいgroupIdで起動するため、毎回最初から読む

#### 6. 実践テスト

```bash
# Step 1: セットアップ（10件送信）
npm run learn:offset-reset-test -- setup

# Step 2: 5件読む
npm run learn:offset-reset-test -- read5

# Step 3: Consumer Group削除
npm run learn:offset-reset-test -- delete

# Step 4A: デフォルト設定で読む（新しいメッセージ待機）
npm run learn:offset-reset-test -- read-default

# Step 4B: fromBeginning: true で読む（全メッセージ読む）
npm run learn:offset-reset-test -- read-beginning
```

#### 7. 理解度チェック

**質問**:
1. Q: 本番環境でバグ修正後、全データを再処理したい。どのパターンを使うか？
   - A: パターン2（Consumer Group削除）

2. Q: 開発中、毎回最初から読み直したい。どのパターンを使うか？
   - A: パターン4（動的groupId）

---

## **ステップ7: Offsetコミット学習（2-3時間）**

### 目的
自動コミット vs 手動コミットの違いと使い分けを理解

### 実行内容

#### 1. ドキュメントを読む

**`docs/learning-scripts-guide.md`の「6. Offsetコミット学習」を読む（20分）**

#### 2. セットアップ

```bash
npm run learn:offset-commit -- setup
```

**確認**: 20件のメッセージが`demo-topic`に送信される

#### 3. 自動コミット

```bash
npm run learn:offset-commit -- auto
```

**確認**: 5件読んで自動的にコミットされる

**Offset確認**:
```bash
npm run learn:view-offset auto-commit-group demo-topic
```

**出力例**:
```
Current Offset: 5
→ 次回は Offset 5 から読み始める
```

#### 4. 手動コミット

```bash
npm run learn:offset-commit -- manual
```

**確認**: 各メッセージ処理後に明示的にコミット

#### 5. 途中で止めるデモ

```bash
npm run learn:offset-commit -- stop-middle
```

**確認**: 3件読んで強制停止

**Offset確認**:
```bash
npm run learn:view-offset auto-commit-group demo-topic
```

**問題**: 自動コミットのタイミング次第で、Offsetがコミットされていないことがある

#### 6. 理解度チェック

**質問**:
1. Q: 金融系アプリケーションで、決済処理後のみコミットしたい。どちらを使うか？
   - A: 手動コミット（処理成功後のみコミット可能）

2. Q: ログ収集で、重複しても問題ない。どちらを使うか？
   - A: 自動コミット（シンプル、実装が簡単）

---

## **ステップ8: 総合確認（1-2時間）**

### 目的
全ての学習内容を復習し、理解度を確認

### 実行内容

#### 1. 全ドキュメントを再読

- `docs/kafka-basics.md`
- `docs/complete-guide.md`
- `docs/offset-management.md`
- `docs/how-to-check-offset.md`
- `docs/learning-scripts-guide.md`

#### 2. 総合テスト

以下の質問に答えられるか確認:

**基礎知識**:
1. Q: Kafkaの3つの主要コンポーネントは？
   - A: Producer、Broker、Consumer

2. Q: Topicとは何か？
   - A: メッセージの分類（例: orders-topic、logs-topic）

**Consumer Group**:
3. Q: 同じgroupIdのConsumerは、どう動作するか？
   - A: メッセージを分け合う（負荷分散）

4. Q: 異なるgroupIdのConsumerは、どう動作するか？
   - A: 独立してメッセージを受信

**Partition**:
5. Q: 同じkeyのメッセージは、どのPartitionに送られるか？
   - A: 必ず同じPartition

6. Q: なぜ同じPartitionに送るのか？
   - A: 順序保証のため

**Offset**:
7. Q: Offset: 5 は、何を意味するか？
   - A: 次に読むメッセージの位置（0〜4まで読んだ）

8. Q: Lag: 10 は、何を意味するか？
   - A: 未読メッセージが10件

**Offsetリセット**:
9. Q: 本番環境で全データを再処理したい。どうするか？
   - A: Consumer Groupを削除

10. Q: 開発中、毎回最初から読み直したい。どうするか？
    - A: 動的groupId（毎回新しいgroupId）

**Offsetコミット**:
11. Q: 自動コミットのタイミングは？
    - A: 5秒ごと（デフォルト）

12. Q: 金融系アプリケーションでは、どちらを使うか？
    - A: 手動コミット

#### 3. Kafka UIで全確認

1. http://localhost:8080
2. Topics: 11個のトピックを確認
3. Consumers: 各学習で作成したConsumer Groupを確認
4. Brokers: Kafkaブローカーの状態を確認

---

## ファイル間の関係図

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker環境                               │
│  docker-compose.yml                                          │
│   ├── zookeeper (メタデータ管理)                             │
│   ├── kafka-broker-modern (Kafkaサーバー)                    │
│   ├── kafka-ui (Web管理画面)                                 │
│   └── kafka-init-topics (11トピック自動作成)                 │
└─────────────────────────────────────────────────────────────┘
                         ↓ 接続
┌─────────────────────────────────────────────────────────────┐
│                   学習スクリプト                              │
├─────────────────────────────────────────────────────────────┤
│ [1] Consumer Group学習                                       │
│   producer-for-group.ts → learn-topic                       │
│   consumer-group.ts ← learn-topic                           │
├─────────────────────────────────────────────────────────────┤
│ [2] Partition学習                                            │
│   partition-producer.ts → partition-topic (3 partitions)    │
│   partition-consumer.ts ← partition-topic                   │
├─────────────────────────────────────────────────────────────┤
│ [3] Offset学習                                               │
│   offset-consumer.ts ← learn-topic (beginning/latest/N)     │
├─────────────────────────────────────────────────────────────┤
│ [4] リアルタイム学習                                          │
│   realtime-producer.ts → realtime-topic (3秒ごと)           │
│   realtime-consumer.ts ← realtime-topic (低遅延)            │
├─────────────────────────────────────────────────────────────┤
│ [5] Offsetリセット学習                                        │
│   offset-reset-flow.ts (4パターン)                          │
│   auto-offset-reset-demo.ts (解説)                          │
│   offset-reset-test.ts (動作確認)                           │
├─────────────────────────────────────────────────────────────┤
│ [6] Offsetコミット学習                                        │
│   offset-commit-demo.ts (auto/manual)                       │
├─────────────────────────────────────────────────────────────┤
│ [7] Offset確認学習                                           │
│   check-offset-demo.ts (5件読んで確認)                      │
│   view-offset.ts (詳細表示ツール)                           │
└─────────────────────────────────────────────────────────────┘
                         ↓ 参照
┌─────────────────────────────────────────────────────────────┐
│                   ドキュメント                                │
│   kafka-basics.md          (基礎知識)                        │
│   complete-guide.md        (完全ガイド)                      │
│   offset-management.md     (Offset管理詳細)                 │
│   how-to-check-offset.md   (Offset確認方法)                 │
│   learning-scripts-guide.md (各スクリプト解説)              │
│   project-overview.md      (このファイル)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## よくある質問

### Q1: 最初に何をすればいいですか？

**A**: 以下の順番で進めてください：

1. `docker-compose up -d`でKafka起動
2. `npm run test:all`で動作確認
3. `docs/kafka-basics.md`を読む
4. ステップ1から順番に学習

---

### Q2: 学習スクリプトはどの順番で実行すればいいですか？

**A**: 推奨順序：

1. Consumer Group学習
2. Partition学習
3. Offset学習
4. リアルタイム受信学習
5. Offsetリセット学習
6. Offsetコミット学習
7. Offset確認学習

---

### Q3: Kafka UIはいつ使いますか？

**A**: 以下の場面で使用：

- トピック一覧の確認
- メッセージ内容の確認
- Consumer Groupの確認
- Offsetの確認（視覚的に）

---

### Q4: 本番用モジュール（NestJS）は学習に必要ですか？

**A**: いいえ、学習には不要です。本番アプリケーション開発時に参照してください。

---

### Q5: エラーが出たらどうすればいいですか？

**A**: `README.md`の「トラブルシューティング」セクションを参照してください。

よくあるエラー:
- **接続エラー**: `localhost:19092`を使用しているか確認
- **トピックが見つからない**: `docker-compose up -d`で自動作成されているか確認
- **Consumerがメッセージを受信しない**: Offsetが最新になっていないか確認

---

### Q6: 学習にどれくらい時間がかかりますか？

**A**: 目安：

- **集中的に**: 2-3日（1日3-4時間）
- **ゆっくり**: 1-2週間（1日1-2時間）

---

### Q7: 本番環境で使う際の注意点は？

**A**:

1. **自動コミット**: 金融系など重複NGなら手動コミットを使用
2. **Consumer Group削除**: 本番環境では慎重に（全データ再処理になる）
3. **Partition数**: 並列処理数を考慮して設定
4. **Offsetリセット**: パターン2（Consumer Group削除）が確実

---

### Q8: プロジェクトをカスタマイズしたい

**A**:

- トピック追加: `docker-compose.yml`の`kafka-init-topics`に追加
- 学習スクリプト追加: `src/learn/`に新規作成、`package.json`にスクリプト追加
- ドキュメント追加: `docs/`に新規作成

---

## まとめ

### ✅ このプロジェクトで学べること

1. **基礎**: Producer/Consumer/Topic/Partitionの基本概念
2. **負荷分散**: Consumer Groupによる並列処理
3. **データ振り分け**: Partitionとkeyの関係
4. **位置制御**: Offsetの管理と読み取り位置の指定
5. **リアルタイム**: 低遅延なメッセージング
6. **実装パターン**: Offsetリセットの4つの方法
7. **本番運用**: 自動/手動コミットの使い分け
8. **監視**: Offset確認の3つの方法

### 🎯 次のステップ

学習が完了したら:

1. **実際のアプリケーション開発**: `src/kafka/`の本番用モジュールを参照
2. **パフォーマンステスト**: 大量メッセージの送受信テスト
3. **AWS MSK連携**: AWSのマネージドKafkaサービスとの連携
4. **他の言語**: Java、Python、Goなどの他のKafkaクライアント

---

## 参考資料

- [Apache Kafka 公式ドキュメント](https://kafka.apache.org/documentation/)
- [KafkaJS ドキュメント](https://kafka.js.org/)
- [Confluent Kafka Docker](https://hub.docker.com/r/confluentinc/cp-kafka)

---

**最終更新**: 2026-04-17

**作成者**: Kafka学習プロジェクトチーム

**ライセンス**: MIT
