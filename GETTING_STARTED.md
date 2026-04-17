# Kafka学習プロジェクト - はじめに

**所要時間: 30分**

このガイドでは、Kafka学習環境をセットアップし、最初の動作確認を行います。

---

## 📋 目次

1. [Kafkaとは？](#kafkaとは)
2. [環境セットアップ](#環境セットアップ)
3. [3つの基本概念](#3つの基本概念)
4. [動作確認](#動作確認)
5. [次のステップ](#次のステップ)

---

## Kafkaとは？

**Apache Kafka**は、大量のメッセージを高速に配信するメッセージングシステムです。

### 簡単な例え

**メールシステムに例えると:**
- **Producer（送信者）**: メールを書いて送る人
- **Kafka（郵便局）**: メールを保管・配送
- **Consumer（受信者）**: メールを受け取る人

**重要な違い:**
- HTTPは「1対1の電話」→ 相手が受け取るまで待つ
- Kafkaは「郵便」→ 送ったら終わり、受信者は好きなタイミングで受け取れる

---

## 環境セットアップ

### 1. 前提条件

以下がインストールされていることを確認してください：

- **Docker & Docker Compose**
- **Node.js 20以上**

確認コマンド:
```bash
docker --version
docker-compose --version
node --version
```

### 2. Kafka環境起動

```bash
# プロジェクトディレクトリに移動
cd /path/to/kafka-learning

# Kafka環境を起動（初回は数分かかります）
docker-compose up -d
```

**起動確認:**
```bash
docker-compose ps
```

以下の3つのコンテナが`Up`状態になっていればOK:
```
NAME                   STATUS
zookeeper              Up
kafka-broker-modern    Up
kafka-ui               Up
```

### 3. 依存パッケージのインストール

```bash
npm install
```

### 4. Kafka UIにアクセス

ブラウザで http://localhost:8080 を開いてください。

**確認ポイント:**
1. 左メニューから「Topics」をクリック
2. 11個のトピックが表示されているか確認

| トピック名 | 用途 |
|-----------|------|
| orders-topic | 注文情報 |
| payments-topic | 決済情報 |
| notifications-topic | 通知 |
| events-topic | イベント |
| logs-topic | ログ |
| health-check-topic | ヘルスチェック |
| learn-topic | Consumer Group学習用 |
| partition-topic | Partition学習用（3分割） |
| realtime-topic | リアルタイム受信学習用 |
| test-topic | Offsetリセットテスト用 |
| demo-topic | Offsetコミット学習用 |

---

## 3つの基本概念

Kafkaを理解するには、以下の3つを理解すればOKです。

### 1. Producer（送信者）

```
┌─────────┐
│Producer │ メッセージを送信するプログラム
└─────────┘
     │
     │ メッセージを送信
     ↓
```

**役割**: データを生成してKafkaに送信

**例**:
- 注文システムが「注文完了」メッセージを送信
- センサーが温度データを送信

### 2. Kafka（保管・配送）

```
     │
     ↓
┌─────────┐
│  Kafka  │ メッセージを保管
│ (Broker)│ Topic別に整理
└─────────┘
     │
     │ メッセージを配信
     ↓
```

**役割**: メッセージを保管し、Consumerに配信

**重要**:
- メッセージは**削除されない**（一定期間保管）
- 何度でも読み直せる

### 3. Consumer（受信者）

```
     │
     ↓
┌─────────┐
│Consumer │ メッセージを受信して処理
└─────────┘
```

**役割**: Kafkaからメッセージを取得して処理

**例**:
- メール送信システムが「注文完了」メッセージを受け取ってメール送信
- 分析システムが温度データを受け取って保存

### データフロー全体図

```
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Producer │─────▶│  Kafka   │─────▶│ Consumer │
│ (送信者)  │      │ (保管)   │      │ (受信者)  │
└──────────┘      └──────────┘      └──────────┘
    │                  │                  │
    │                  │                  │
送信プログラム      Topic別に保管      受信プログラム
(Node.js)          (orders-topic)     (Node.js)
```

---

## 動作確認

### ステップ1: メッセージ送信テスト

```bash
npm run test:all
```

**何が起こるか:**
- 6個のトピック（orders, payments, notifications, events, logs, health-check）に各3件のメッセージを送信
- 合計18件のメッセージを送信

**期待される出力:**
```
✓ orders-topic: 3件送信完了
✓ payments-topic: 3件送信完了
✓ notifications-topic: 3件送信完了
✓ events-topic: 3件送信完了
✓ logs-topic: 3件送信完了
✓ health-check-topic: 3件送信完了

✅ 全6トピックにメッセージを送信完了！
```

### ステップ2: メッセージ受信確認

```bash
npm run test:verify-all
```

**何が起こるか:**
- 6個のトピックから各最大10件のメッセージを受信
- 正常に送受信できているか検証

**期待される出力:**
```
✓ orders-topic: 3件受信
✓ payments-topic: 3件受信
✓ notifications-topic: 3件受信
✓ events-topic: 3件受信
✓ logs-topic: 3件受信
✓ health-check-topic: 3件受信

✅ 全6トピックの検証完了！
```

### ステップ3: Kafka UIで確認

1. http://localhost:8080 を開く
2. 左メニューから「Topics」をクリック
3. `orders-topic`をクリック
4. 「Messages」タブを開く

**確認ポイント:**
- 3件のメッセージが表示されているか
- 各メッセージの内容を確認

---

## 次のステップ

環境セットアップが完了しました！🎉

### 学習を始める

次は`LEARNING_GUIDE.md`を開いて、7つの学習ステップを進めてください。

```bash
# 次に読むドキュメント
cat LEARNING_GUIDE.md
```

### 学習の流れ

1. **ステップ1**: Consumer Group学習（2-3時間）
2. **ステップ2**: Partition学習（2-3時間）
3. **ステップ3**: Offset学習（2-3時間）
4. **ステップ4**: リアルタイム受信学習（1-2時間）
5. **ステップ5**: Offsetリセット学習（3-4時間）
6. **ステップ6**: Offsetコミット学習（2-3時間）
7. **ステップ7**: Offset確認学習（1-2時間）

**合計所要時間: 2-3日（集中的に）または 1-2週間（ゆっくり）**

---

## トラブルシューティング

### Kafkaに接続できない

```bash
# Kafkaが起動しているか確認
docker-compose ps

# ログを確認
docker-compose logs kafka-broker-modern

# 再起動
docker-compose restart kafka-broker-modern
```

### トピックが表示されない

```bash
# トピック一覧を確認
docker exec kafka-broker-modern kafka-topics --bootstrap-server localhost:9092 --list

# トピック自動作成ログを確認
docker-compose logs kafka-init-topics
```

### メッセージが受信できない

- Kafkaが起動しているか確認
- トピックが存在するか確認
- `localhost:19092`を使用しているか確認（`localhost:9092`ではない）

---

## まとめ

✅ Kafka環境のセットアップ完了
✅ 3つの基本概念（Producer、Kafka、Consumer）を理解
✅ メッセージの送受信を確認

次は`LEARNING_GUIDE.md`で実践的な学習を始めましょう！
