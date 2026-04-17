# Kafkaで途中まで購読したOffsetを確認する方法

## 📚 目次

1. [Offsetとは何か](#offsetとは何か)
2. [なぜOffsetを確認するのか](#なぜoffsetを確認するのか)
3. [方法1: Kafka UIで確認（初心者推奨）](#方法1-kafka-uiで確認初心者推奨)
4. [方法2: 専用スクリプトで確認](#方法2-専用スクリプトで確認)
5. [方法3: Docker CLIで確認](#方法3-docker-cliで確認)
6. [実践ワークフロー](#実践ワークフロー)
7. [Offset値の意味](#offset値の意味)
8. [トラブルシューティング](#トラブルシューティング)

---

## Offsetとは何か

**Offset**は、Kafkaトピックの各パーティション内でのメッセージの**位置**を示す番号です。

### 具体例で理解する

```
Topic: learn-topic (Partition 0)
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│  0  │  1  │  2  │  3  │  4  │  5  │  6  │  7  │  8  │  9  │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
  ↑                         ↑                               ↑
Offset 0               Offset 4                        Offset 9
(最初)              (5番目のメッセージ)                (10番目)
```

### Consumer Groupが保存するOffset

Consumer Groupは、**「どこまで読んだか」**をKafkaブローカーに保存します。

```
┌─────────────────────────────────────────────────────┐
│ Consumer Group: my-group                             │
│                                                      │
│ Topic: learn-topic                                   │
│   Partition 0: Current Offset = 5                   │
│   ↓                                                  │
│   「次回は Offset 5 から読み始める」                  │
│   （Offset 0〜4 は読み終わった）                      │
└─────────────────────────────────────────────────────┘
```

**重要ポイント:**
- Current Offset = 5 → **次に読むのは Offset 5**
- Offset 0〜4（5件）は既に読み終わっている

---

## なぜOffsetを確認するのか

### 1. **処理の進捗を把握したい**

```
シナリオ: 1000件のメッセージを処理中
現在のOffset: 300
→ 30%完了していることが分かる
```

### 2. **途中で止めて再開したい**

```
シナリオ: Consumerを途中で停止
Offset確認 → Offset 150 で止まっている
→ 次回起動時は Offset 150 から再開
```

### 3. **メッセージの取りこぼしを確認したい**

```
シナリオ: メッセージが届いていない？
Offset確認:
  Current Offset: 100
  End Offset: 100
→ 全メッセージ処理済み（取りこぼしなし）

または:
  Current Offset: 50
  End Offset: 100
  Lag: 50
→ 50件未読（遅れている）
```

### 4. **エラー時の復旧位置を確認したい**

```
シナリオ: Offset 75 で処理エラー発生
Offset確認 → Offset 75 で止まっている
→ Offset 75 から再処理できる
```

---

## 方法1: Kafka UIで確認（初心者推奨）

### 📌 準備: メッセージを送信してConsumerで5件読む

```bash
# 1. メッセージ送信（15件）
npm run learn:producer-group

# 2. 5件だけ読んで停止
npm run learn:check-offset
```

実行結果:
```
[1] Offset 0: メッセージ 0
[2] Offset 1: メッセージ 1
[3] Offset 2: メッセージ 2
[4] Offset 3: メッセージ 3
[5] Offset 4: メッセージ 4

5件読んだので停止します
Consumer Group "offset-check-group" は次回 Offset 5 から読みます。
```

**何が起こったか:**
- Offset 0〜4（5件）を読んだ
- Consumer Groupが「Offset 5」を保存した
- 次回は Offset 5 から再開する

---

### 🖥️ ステップ1: Kafka UIを開く

1. ブラウザで以下のURLを開く:
   ```
   http://localhost:8080
   ```

2. Kafka UIのトップページが表示される

---

### 🖥️ ステップ2: Consumersページに移動

1. **左側のメニュー**を見る
2. **"Consumers"** という項目を探す
3. **"Consumers"** をクリック

---

### 🖥️ ステップ3: Consumer Groupを探す

Consumersページには、全てのConsumer Groupが一覧表示されます。

**表示例:**
```
┌─────────────────────────────────────────────────────┐
│ Consumer Groups                                      │
├─────────────────────────────────────────────────────┤
│ Name                    | State     | Members        │
├─────────────────────────┼───────────┼───────────────┤
│ offset-check-group      | Empty     | 0              │
│ demo-group              | Empty     | 0              │
│ test-orders-group       | Empty     | 0              │
└─────────────────────────────────────────────────────┘
```

**列の意味:**
- **Name**: Consumer Groupの名前
- **State**: 状態（Empty = メンバーなし、Stable = 稼働中）
- **Members**: アクティブなConsumer数

**探すConsumer Group:**
- `offset-check-group` ← これを探す

---

### 🖥️ ステップ4: Consumer Groupをクリック

1. `offset-check-group` の行をクリック
2. 詳細ページが表示される

---

### 🖥️ ステップ5: Offset情報を確認

Consumer Groupの詳細ページには、以下の情報が表示されます:

```
┌─────────────────────────────────────────────────────────────┐
│ Consumer Group: offset-check-group                           │
├─────────────────────────────────────────────────────────────┤
│ State: Empty                                                 │
│ Members: 0                                                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Topic Partitions                                                          │
├───────────┬───────────┬──────────┬──────────┬─────────┬──────────────────┤
│ Topic     │ Partition │ Current  │ End      │ Lag     │ Consumer         │
│           │           │ Offset   │ Offset   │         │ Instance         │
├───────────┼───────────┼──────────┼──────────┼─────────┼──────────────────┤
│ learn-    │ 0         │ 5        │ 15       │ 10      │ -                │
│ topic     │           │          │          │         │                  │
└───────────┴───────────┴──────────┴──────────┴─────────┴──────────────────┘
```

---

### 📊 各列の詳しい意味

#### **Topic**
- Consumer Groupが購読しているトピック名
- 例: `learn-topic`

#### **Partition**
- パーティション番号
- 例: `0` （パーティション0）

#### **Current Offset**
- **重要**: Consumer Groupが次に読む位置
- 例: `5`
- **意味**:
  - Offset 0〜4 は既に読んだ
  - 次回は Offset 5 から読む
  - **5件処理済み**

#### **End Offset**
- トピックの最新Offset（次に書き込まれる位置）
- 例: `15`
- **意味**:
  - トピックには Offset 0〜14（15件）のメッセージがある
  - 次に送信されるメッセージは Offset 15 になる

#### **Lag**
- **未読メッセージ数**
- 計算式: `Lag = End Offset - Current Offset`
- 例: `10`
- **意味**:
  - 10件の未読メッセージがある
  - まだ読んでいないメッセージが10件残っている

#### **Consumer Instance**
- 現在接続中のConsumerのID
- 例: `-` （接続なし）
- **意味**:
  - 現在このパーティションを読んでいるConsumerはいない

---

### 🎯 実際の例で理解する

**状況:**
- トピックに15件のメッセージ（Offset 0〜14）
- Consumerが5件読んで停止

**Kafka UIの表示:**
```
Current Offset: 5
End Offset: 15
Lag: 10
```

**これは何を意味するか:**
```
learn-topic: [0][1][2][3][4][5][6][7][8][9][10][11][12][13][14]
             ↑           ↑                                   ↑
           読んだ    次に読む位置                          最新
         (Offset 0-4)  (Current=5)                    (End=15)

         └─────────┘  └─────────────────────────────┘
           読了済み              未読 (Lag=10)
           5件                   10件
```

**次に起動すると:**
- Offset 5 から読み始める
- Offset 5〜14（10件）を読む

---

## 方法2: 専用スクリプトで確認

### コマンド

```bash
npm run learn:view-offset
```

### 何をするコマンドか

- Admin APIを使ってConsumer GroupのOffset情報を取得
- トピックの最新Offset情報も取得
- 読了/未読メッセージ数と進捗率を計算
- 分かりやすく表示

### 実行結果の例

```bash
$ npm run learn:view-offset

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

### 出力結果の詳細解説

#### 【現在のOffset】

```
Topic: learn-topic
  Partition 0:
    Current Offset: 5
    → 次回は Offset 5 から読み始める
```

**意味:**
- Consumer Group `offset-check-group` は
- トピック `learn-topic` の
- パーティション `0` を
- **Offset 5** まで読んだ
- 次回起動時は **Offset 5 から再開**

---

#### 【トピックのOffset情報】

```
Partition 0:
  Low (最古): 0
  High (最新): 15
  → 合計メッセージ数: 15件
```

**Low (最古): 0**
- トピックに残っている最も古いメッセージのOffset
- 保持期間が過ぎると古いメッセージは削除される
- 削除されると Low の値が増える（例: 0 → 5）

**High (最新): 15**
- 次に書き込まれるメッセージのOffset
- Offset 0〜14（15件）のメッセージが存在
- High は常に「最新メッセージのOffset + 1」

**合計メッセージ数: 15件**
- 計算式: High - Low = 15 - 0 = 15件
- トピックに保存されているメッセージの総数

---

#### 【進捗状況】

```
読み終えたメッセージ: 5件
未読メッセージ: 10件
合計: 15件
進捗率: 33.3%
```

**読み終えたメッセージ: 5件**
- 計算式: Current Offset - Low = 5 - 0 = 5件
- Consumer Groupが既に読んだメッセージ数

**未読メッセージ: 10件**
- 計算式: High - Current Offset = 15 - 5 = 10件
- まだ読んでいないメッセージ数
- これが **Lag（遅延）** の値

**進捗率: 33.3%**
- 計算式: (読了 / 合計) × 100 = (5 / 15) × 100 = 33.3%
- 全体の何%を読み終えたか

---

### 特定のConsumer GroupとTopicを指定する

```bash
# デフォルト: offset-check-group / learn-topic
npm run learn:view-offset

# 指定: demo-group / demo-topic
npm run learn:view-offset -- demo-group demo-topic
```

**引数の意味:**
- 第1引数: Consumer Group名
- 第2引数: Topic名

**使用例:**
```bash
# test-orders-group の orders-topic を確認
npm run learn:view-offset -- test-orders-group orders-topic
```

---

## 方法3: Docker CLIで確認

### コマンド1: Consumer Group一覧を表示

```bash
docker exec kafka-broker-modern kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --list
```

#### 何をするコマンドか
- Kafka Brokerに登録されている全Consumer Groupの一覧を表示
- どんなConsumer Groupが存在するか確認できる

#### 実行結果の例
```
offset-check-group
demo-group
test-orders-group
manual-commit-group
```

#### 出力の意味
- 各行が1つのConsumer Group
- これらのグループがOffset情報を持っている

---

### コマンド2: 特定のConsumer Groupの詳細を表示

```bash
docker exec kafka-broker-modern kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group offset-check-group \
  --describe
```

#### コマンドオプションの解説

**`docker exec kafka-broker-modern`**
- Dockerコンテナ内でコマンドを実行
- `kafka-broker-modern` = Kafkaブローカーのコンテナ名

**`kafka-consumer-groups`**
- Consumer Group管理用のKafka CLIツール

**`--bootstrap-server localhost:9092`**
- Kafka Brokerのアドレスを指定
- Docker内部なので `localhost:9092` を使用

**`--group offset-check-group`**
- 確認したいConsumer Group名を指定

**`--describe`**
- 詳細情報を表示するオプション

---

#### 実行結果の例

```
GROUP              TOPIC          PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG   CONSUMER-ID     HOST            CLIENT-ID
offset-check-group learn-topic    0          5               15              10    -               -               -
```

---

#### 各列の詳細解説

**GROUP**
- Consumer Group名
- 例: `offset-check-group`

**TOPIC**
- 購読しているトピック名
- 例: `learn-topic`

**PARTITION**
- パーティション番号
- 例: `0`

**CURRENT-OFFSET**
- **重要**: Consumer Groupの現在のOffset
- 例: `5`
- **意味**: 次に読むのは Offset 5

**LOG-END-OFFSET**
- トピックの最新Offset（End Offset）
- 例: `15`
- **意味**: トピックには Offset 0〜14（15件）がある

**LAG**
- 未読メッセージ数（遅延）
- 計算式: LOG-END-OFFSET - CURRENT-OFFSET
- 例: `10`
- **意味**: 10件の未読メッセージがある

**CONSUMER-ID**
- 現在接続中のConsumerのID
- 例: `-` （接続なし）

**HOST**
- Consumerが動いているホスト
- 例: `-` （接続なし）

**CLIENT-ID**
- ConsumerのクライアントID
- 例: `-` （接続なし）

---

### コマンド3: 全Consumer Groupの詳細を一括表示

```bash
docker exec kafka-broker-modern kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --all-groups \
  --describe
```

#### 何をするコマンドか
- 全てのConsumer Groupの詳細情報を一度に表示
- 複数のグループを比較できる

#### 実行結果の例
```
GROUP              TOPIC          PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
offset-check-group learn-topic    0          5               15              10
demo-group         demo-topic     0          20              20              0
test-orders-group  orders-topic   0          3               18              15
```

#### 読み方
1. `offset-check-group`: Lag 10 → 10件未読
2. `demo-group`: Lag 0 → 全て読了
3. `test-orders-group`: Lag 15 → 15件未読（大幅に遅延）

---

## 実践ワークフロー

### シナリオ: 途中まで読んでOffsetを確認する

#### ステップ1: メッセージを準備
```bash
npm run learn:producer-group
```

**実行内容:**
- `learn-topic` に15件のメッセージを送信

**結果:**
```
✓ メッセージ 0 を送信
✓ メッセージ 1 を送信
...
✓ メッセージ 14 を送信
全15件のメッセージを送信完了！
```

**トピックの状態:**
```
learn-topic: [0][1][2][3][4][5][6][7][8][9][10][11][12][13][14]
             ↑                                                 ↑
           Offset 0                                        Offset 14
```

---

#### ステップ2: 5件だけ読む
```bash
npm run learn:check-offset
```

**実行内容:**
- Consumer Group `offset-check-group` で
- `learn-topic` から5件読む
- 自動的に停止

**結果:**
```
[1] Offset 0: メッセージ 0
[2] Offset 1: メッセージ 1
[3] Offset 2: メッセージ 2
[4] Offset 3: メッセージ 3
[5] Offset 4: メッセージ 4

5件読んだので停止します
Offsetがコミットされました。
Consumer Group "offset-check-group" は次回 Offset 5 から読みます。
```

**Consumer Groupの状態:**
```
offset-check-group:
  learn-topic Partition 0: Current Offset = 5
```

**トピックの状態:**
```
learn-topic: [0][1][2][3][4][5][6][7][8][9][10][11][12][13][14]
             ↑           ↑
           読了済み    次に読む位置
        (Offset 0-4)   (Offset 5)
```

---

#### ステップ3: Offsetを確認（方法を選ぶ）

**選択肢A: Kafka UI（ビジュアル）**
```
1. http://localhost:8080 を開く
2. Consumers → offset-check-group
3. Current Offset: 5, Lag: 10 を確認
```

**選択肢B: スクリプト（詳細情報）**
```bash
npm run learn:view-offset
```
```
Current Offset: 5
読み終えたメッセージ: 5件
未読メッセージ: 10件
進捗率: 33.3%
```

**選択肢C: CLI（生データ）**
```bash
docker exec kafka-broker-modern kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group offset-check-group \
  --describe
```
```
CURRENT-OFFSET: 5
LOG-END-OFFSET: 15
LAG: 10
```

---

#### ステップ4: 続きを読む（オプション）

```bash
# もう一度Consumerを起動すると...
npm run learn:check-offset
```

**結果:**
```
[1] Offset 5: メッセージ 5   ← Offset 5 から再開！
[2] Offset 6: メッセージ 6
[3] Offset 7: メッセージ 7
[4] Offset 8: メッセージ 8
[5] Offset 9: メッセージ 9

5件読んだので停止します
Consumer Group "offset-check-group" は次回 Offset 10 から読みます。
```

**Consumer Groupの状態:**
```
offset-check-group:
  learn-topic Partition 0: Current Offset = 10
```

**Offset確認:**
```bash
npm run learn:view-offset
```
```
Current Offset: 10
読み終えたメッセージ: 10件
未読メッセージ: 5件
進捗率: 66.7%
```

---

## Offset値の意味

### Offset: -1

**意味:**
- Consumer Groupが一度もメッセージを読んでいない
- または、Offsetがまだコミットされていない

**例:**
```
Current Offset: -1
→ まだ1件も読んでいない
→ 次回起動時は fromBeginning の設定に従う
```

**fromBeginning の影響:**
```typescript
// fromBeginning: true の場合
await consumer.subscribe({ topic: 'learn-topic', fromBeginning: true });
→ Offset 0 から読む

// fromBeginning: false の場合
await consumer.subscribe({ topic: 'learn-topic', fromBeginning: false });
→ 最新から読む（新しいメッセージを待機）
```

---

### Offset: 0

**意味1: Current Offset = 0**
- 次に読むのは Offset 0
- まだ1件も読んでいない

**意味2: Low Offset = 0**
- トピックの最も古いメッセージが Offset 0
- メッセージ削除されていない

---

### Offset: 5

**Current Offset = 5**
```
[0][1][2][3][4] | [5][6][7][8][9]
 ↑     読了     ↑  ↑    未読
               次に読む
```

- Offset 0〜4（5件）読了
- 次は Offset 5 から読む
- 5件処理済み

---

### Offset: End Offset = 15

**意味:**
```
[0][1][2][3]...[14] | [15]
 ↑    存在する    ↑   ↑ 次に書き込まれる位置
                     (End Offset)
```

- Offset 0〜14（15件）が存在
- 次に送信されるメッセージは Offset 15 になる

---

## トラブルシューティング

### Q1: Kafka UIで Consumer Group が表示されない

**原因:**
- Consumer Groupがまだ作成されていない
- 一度もConsumerを起動していない

**解決策:**
```bash
# 1. Consumerを起動してメッセージを読む
npm run learn:check-offset

# 2. Kafka UIを更新
# http://localhost:8080 → Consumers
```

---

### Q2: Current Offset が -1 のまま

**原因:**
- メッセージを読んだが、Offsetがコミットされていない
- Consumer Groupが削除された

**解決策:**
```bash
# 1. もう一度Consumerを起動
npm run learn:check-offset

# 2. Offsetを確認
npm run learn:view-offset
```

---

### Q3: Lag が減らない

**原因:**
- Consumerが停止している
- Producerが新しいメッセージを送信し続けている

**確認:**
```bash
npm run learn:view-offset
```

**解決策:**
```bash
# Consumerを起動して追いつく
npm run learn:consumer-group
```

---

### Q4: 「Consumer group has no active members」と表示される

**これは正常です！**

**意味:**
- Consumer Groupは存在する
- ただし、現在接続中のConsumerがいない（停止している）

**Offsetは保存されている:**
```bash
# CLIで詳細を確認
docker exec kafka-broker-modern kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group offset-check-group \
  --describe
```

---

## まとめ

### 確認方法の使い分け

| 方法 | おすすめ度 | 用途 |
|------|----------|------|
| **Kafka UI** | ⭐⭐⭐ | 初心者、ビジュアルで確認したい |
| **npm run learn:view-offset** | ⭐⭐⭐ | 詳細情報、進捗率を知りたい |
| **Docker CLI** | ⭐⭐ | 自動化、スクリプト化したい |

### 重要な用語のおさらい

| 用語 | 意味 |
|------|------|
| **Current Offset** | 次に読む位置（どこまで読んだか） |
| **End Offset** | トピックの最新位置（何件あるか） |
| **Lag** | 未読メッセージ数（遅れ） |
| **Low Offset** | トピックの最古位置 |

### クイック確認コマンド

```bash
# 最も簡単
npm run learn:view-offset

# ビジュアル
http://localhost:8080 → Consumers
```

---

これで、Kafkaで途中まで購読したOffsetを確認する方法を完全にマスターできました！
