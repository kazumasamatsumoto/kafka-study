# Offset管理テストシナリオ

## 📋 テスト目的

Consumer Groupが途中まで読んだメッセージのOffsetを記憶しており、再起動後も**続きから読む**ことを確認する。

## 🎯 テストシナリオ

**検証内容**：Consumerを途中で停止し、再起動した時に続きから読むか？それとも最初から読み直すか？

### 期待される正常動作
- ✅ Consumer Groupは最後に読んだOffsetを記憶している
- ✅ 再起動後、**続きから読む**（既読メッセージは読まない）
- ✅ `auto.offset.reset='earliest'` が設定されていても、Offsetがコミット済みなら続きから読む

### 異常動作の例
- ❌ 最初から読み直す（重複して読む）
- ❌ Offsetがリセットされている
- ❌ メッセージを飛ばして読む

---

## 🚀 テスト手順

### ステップ1: 環境準備

```bash
# Docker環境を起動
docker-compose up -d

# トピックが存在するか確認
docker exec kafka-broker-modern kafka-topics \
  --bootstrap-server localhost:9092 \
  --list | grep learn-topic
```

**確認ポイント**：
- ✅ `learn-topic` が表示される

---

### ステップ2: テスト用メッセージを送信

```bash
# 20件のメッセージを送信
npm run learn:producer-group
```

**確認ポイント**：
- ✅ "メッセージ 0" ～ "メッセージ 19" が送信される
- ✅ 合計20件のメッセージが送信完了

**CLIでメッセージ数を確認**：
```bash
docker exec kafka-broker-modern kafka-topics \
  --bootstrap-server localhost:9092 \
  --describe \
  --topic learn-topic
```

出力例：
```
Topic: learn-topic    PartitionCount: 1    ReplicationFactor: 1
  Partition: 0    Leader: 1    Replicas: 1    Isr: 1
```

---

### ステップ3: Consumerで途中まで読む（10件で停止）

```bash
# Consumerを起動（10件読んだら自動で止まるように調整）
npm run learn:consumer-group
```

**実行中の表示**：
```
[consumer1] メッセージ受信:
  Offset: 0
  Value: メッセージ 0
...
[consumer1] メッセージ受信:
  Offset: 9
  Value: メッセージ 9
```

**手動で停止する場合**：
- Ctrl+C でConsumerを停止

**確認ポイント**：
- ✅ Offset 0 ～ 9 の10件が表示される
- ✅ Consumerが正常に停止する

---

### ステップ4: Current Offsetを確認（重要）

#### 方法1: CLIで確認（推奨）

```bash
docker exec kafka-broker-modern kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group same-group \
  --describe
```

**期待される出力**：
```
GROUP       TOPIC        PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG  CONSUMER-ID  HOST  CLIENT-ID
same-group  learn-topic  0          10              20              10   -            -     -
```

**確認ポイント**：
- ✅ **CURRENT-OFFSET: 10** → 次回はOffset 10から読み始める
- ✅ **LOG-END-OFFSET: 20** → トピックには20件のメッセージがある
- ✅ **LAG: 10** → 未読メッセージが10件残っている
- ✅ **CONSUMER-ID: -** → 現在アクティブなConsumerはいない

#### 方法2: 専用スクリプトで確認

```bash
npm run learn:view-offset same-group learn-topic
```

**期待される出力**：
```
========================================
Consumer Group Offset情報
========================================

Consumer Group: same-group
Topic: learn-topic

【現在のOffset】
─────────────────────────────────

Topic: learn-topic
  Partition 0:
    Current Offset: 10
    → 次回は Offset 10 から読み始める

【トピックのOffset情報】
─────────────────────────────────

Partition 0:
  Low (最古): 0
  High (最新): 20
  → 合計メッセージ数: 20件

【進捗状況】
─────────────────────────────────

読み終えたメッセージ: 10件
未読メッセージ: 10件
合計: 20件
進捗率: 50.0%
```

**確認ポイント**：
- ✅ Current Offset: 10（次回はここから読む）
- ✅ 進捗率: 50.0%（半分読んだ）

#### 方法3: Kafka UIで確認

1. ブラウザで http://localhost:8080 を開く
2. **Consumers** → **same-group** をクリック
3. 表示内容を確認

**期待される表示**：
```
State: EMPTY
Members: 0
Assigned Topics: 1
Total lag: 10
```

**確認ポイント**：
- ✅ **State: EMPTY** → Consumerが停止している
- ✅ **Total lag: 10** → 未読メッセージが10件

**⚠️ 注意**：
- UIでは「Consumer Lag（未読数）」は見えるが、「Current Offset」は見えない
- 詳細なOffset確認はCLIを使う方が確実

---

### ステップ5: Consumerを再起動

```bash
# 再びConsumerを起動
npm run learn:consumer-group
```

**期待される動作**：
```
[consumer1] メッセージ受信:
  Offset: 10
  Value: メッセージ 10

[consumer1] メッセージ受信:
  Offset: 11
  Value: メッセージ 11
...
[consumer1] メッセージ受信:
  Offset: 19
  Value: メッセージ 19
```

**確認ポイント（正常動作）**：
- ✅ **Offset 10から読み始める**（続きから読む）
- ✅ Offset 0～9は読まない（重複しない）
- ✅ 残りの10件（Offset 10～19）だけを読む

**異常動作の例**：
- ❌ Offset 0から読み始める → Offsetがリセットされている（異常）
- ❌ Offset 0～19の全20件を読む → 重複して読んでいる（異常）

---

### ステップ6: 読み終えた後のOffset確認

```bash
docker exec kafka-broker-modern kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group same-group \
  --describe
```

**期待される出力**：
```
GROUP       TOPIC        PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG  CONSUMER-ID  HOST  CLIENT-ID
same-group  learn-topic  0          20              20              0    [id]         /IP   learn-consumer-group
```

**確認ポイント**：
- ✅ **CURRENT-OFFSET: 20** → 全て読み終えた
- ✅ **LAG: 0** → 未読メッセージなし
- ✅ **CONSUMER-ID: [id]** → Consumerがアクティブ

---

## 📊 テスト結果の判定

### ✅ 正常（Pass）

| 項目 | 期待値 | 実際の値 |
|------|--------|----------|
| 初回読み込み | Offset 0～9 | Offset 0～9 ✅ |
| 停止後のCurrent Offset | 10 | 10 ✅ |
| 停止後のLAG | 10 | 10 ✅ |
| 再起動後の開始位置 | Offset 10 | Offset 10 ✅ |
| 再起動後の読み込み | Offset 10～19（10件） | Offset 10～19 ✅ |
| 最終的なCurrent Offset | 20 | 20 ✅ |
| 最終的なLAG | 0 | 0 ✅ |

**結論**：Consumer GroupはOffsetを正しく記憶し、続きから読むことができている。

---

### ❌ 異常（Fail）

#### パターン1: 最初から読み直す

| 項目 | 期待値 | 実際の値 |
|------|--------|----------|
| 初回読み込み | Offset 0～9 | Offset 0～9 ✅ |
| 停止後のCurrent Offset | 10 | 10 ✅ |
| 再起動後の開始位置 | Offset 10 | **Offset 0** ❌ |
| 再起動後の読み込み | Offset 10～19（10件） | **Offset 0～19（20件）** ❌ |

**原因の可能性**：
- Consumer GroupのOffsetがリセットされた
- `auto.offset.reset='earliest'` が誤って適用された
- Offsetのコミットに失敗している

#### パターン2: Offsetが進まない

| 項目 | 期待値 | 実際の値 |
|------|--------|----------|
| 初回読み込み | Offset 0～9 | Offset 0～9 ✅ |
| 停止後のCurrent Offset | 10 | **0** ❌ |
| 停止後のLAG | 10 | **20** ❌ |

**原因の可能性**：
- Offsetのコミットが無効になっている
- `enable.auto.commit=false` でOffsetがコミットされていない

---

## 🔍 トラブルシューティング

### 問題1: Consumer Groupが見つからない

```bash
# 存在するConsumer Groupを確認
docker exec kafka-broker-modern kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --list
```

### 問題2: Offsetがリセットされる

**確認点**：
- Consumerの設定で `enable.auto.commit: true` になっているか？
- Offsetのコミット間隔（`auto.commit.interval.ms`）が適切か？

### 問題3: UIに表示されない

**対処法**：
- ブラウザをリフレッシュ（Ctrl+R）
- CLIで確認する方が確実

---

## 🛠️ 使用するコマンド一覧

### Consumer Group操作

```bash
# Consumer Groupのリスト表示
docker exec kafka-broker-modern kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --list

# 特定のConsumer Groupの詳細表示
docker exec kafka-broker-modern kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group <group-id> \
  --describe

# 全てのConsumer Groupの詳細表示
docker exec kafka-broker-modern kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --all-groups \
  --describe
```

### Offset確認（スクリプト）

```bash
# デフォルト（offset-check-group / learn-topic）
npm run learn:view-offset

# Consumer GroupとTopicを指定
npm run learn:view-offset <group-id> <topic>
```

### Topic操作

```bash
# Topicのリスト表示
docker exec kafka-broker-modern kafka-topics \
  --bootstrap-server localhost:9092 \
  --list

# Topicの詳細表示
docker exec kafka-broker-modern kafka-topics \
  --bootstrap-server localhost:9092 \
  --describe \
  --topic <topic-name>
```

---

## 📚 関連資料

- [Offset管理の基礎](./offset-management.md)
- [Consumer Group入門](./consumer-group-guide.md)
- [auto.offset.reset設定ガイド](./auto-offset-reset.md)

---

## 💡 重要なポイント

1. **Current Offsetは「次に読む位置」を示す**
   - Offset 0～9を読んだら、Current Offset = 10になる

2. **LAG = LOG-END-OFFSET - CURRENT-OFFSET**
   - 未読メッセージ数を表す

3. **Consumer Groupが停止しても、Offsetは保持される**
   - Kafkaがサーバー側で記憶している

4. **UIは概要確認、CLIは詳細確認に使う**
   - Current Offsetの正確な値はCLIで確認する

---

## ✅ テスト成功の条件

- [ ] メッセージが正しく送信される（20件）
- [ ] 途中で停止した時のCurrent Offsetが正しい（10）
- [ ] LAGが正しく計算される（10）
- [ ] 再起動後、続きから読む（Offset 10から）
- [ ] 重複して読まない（Offset 0～9は読まない）
- [ ] 最終的に全て読み終える（Current Offset = 20、LAG = 0）
