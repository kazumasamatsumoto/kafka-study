# Apache Kafka アーキテクチャ解説 — 実コードで理解する

このドキュメントでは、Apache Kafka の内部実装を実際のソースコードを見ながら解説します。「日常の例え」と「実装」の両方から Kafka の仕組みを理解できるようになっています。

---

## 目次

1. [全体構造](#全体構造)
2. [ログの書き込み — 日記帳の末尾に追記](#ログの書き込み--日記帳の末尾に追記)
3. [セグメントの管理 — 日記帳が満杯になったら新しい冊を開く](#セグメントの管理--日記帳が満杯になったら新しい冊を開く)
4. [Zero-Copy — 受付から直接トラックに渡す](#zero-copy--受付から直接トラックに渡す)
5. [インデックス — 目次でページ番号を引く](#インデックス--目次でページ番号を引く)
6. [Partition の振り分け — どのレジに並ぶか](#partition-の振り分け--どのレジに並ぶか)
7. [まとめ — 全体の流れ](#まとめ--全体の流れ)

---

## 全体構造

Apache Kafka のソースコードは大きく以下のディレクトリで構成されています：

```
apache/kafka/
├── clients/     ← Producer・Consumer のコード（Java）
├── core/        ← Broker のコード（過去は Scala、移行中）
├── storage/     ← データ保存まわり（Java）
├── server/      ← サーバーのリクエスト処理
└── ...
```

主要なクラスとその場所：

| クラス | パス | 役割 |
|--------|------|------|
| `LogSegment` | `storage/src/main/java/.../log/LogSegment.java` | ログセグメント（日記帳の1冊） |
| `FileRecords` | `clients/src/main/java/.../record/internal/FileRecords.java` | ファイルへの読み書き |
| `OffsetIndex` | `storage/src/main/java/.../log/OffsetIndex.java` | オフセット→位置のインデックス |
| `TimeIndex` | `storage/src/main/java/.../log/TimeIndex.java` | タイムスタンプ→オフセットのインデックス |
| `BuiltInPartitioner` | `clients/src/main/java/.../producer/internals/BuiltInPartitioner.java` | パーティション振り分けロジック |

---

## ログの書き込み — 日記帳の末尾に追記

### 日常の例え

**「日記帳の末尾に常に追記する」**

普通のデータベースは「3ページ目の2行目を書き換えて…」のように、途中のページを開いて書き換えます（ランダムアクセス）。これは遅いです。

Kafka は違います。**常に最後のページの一番下に書き足すだけ**です。これを「シーケンシャル書き込み」と呼びます。ディスクは先頭から順番に書くのが得意なので、とても速いのです。

### 実装 — LogSegment.append()

この「末尾に追記」を実際にやっているのが `LogSegment.append()` メソッドです。

**ファイル：** `storage/src/main/java/org/apache/kafka/storage/internals/log/LogSegment.java:251-281`

```java
public void append(long largestOffset,
                   MemoryRecords records) throws IOException {
    if (records.sizeInBytes() > 0) {
        LOGGER.trace("Inserting {} bytes at end offset {} at position {}",
            records.sizeInBytes(), largestOffset, log.sizeInBytes());
        int physicalPosition = log.sizeInBytes();

        ensureOffsetInRange(largestOffset);

        // append the messages
        long appendedBytes = log.append(records);
        LOGGER.trace("Appended {} to {} at end offset {}", appendedBytes, log.file(), largestOffset);

        for (RecordBatch batch : records.batches()) {
            long batchMaxTimestamp = batch.maxTimestamp();
            long batchLastOffset = batch.lastOffset();
            if (batchMaxTimestamp > maxTimestampSoFar()) {
                maxTimestampAndOffsetSoFar = new TimestampOffset(batchMaxTimestamp, batchLastOffset);
            }

            if (bytesSinceLastIndexEntry > indexIntervalBytes) {
                offsetIndex().append(batchLastOffset, physicalPosition);
                timeIndex().maybeAppend(maxTimestampSoFar(), shallowOffsetOfMaxTimestampSoFar());
                bytesSinceLastIndexEntry = 0;
            }
            var sizeInBytes = batch.sizeInBytes();
            physicalPosition += sizeInBytes;
            bytesSinceLastIndexEntry += sizeInBytes;
        }
    }
}
```

ポイント：

1. **`int physicalPosition = log.sizeInBytes();`** — 現在のファイルサイズ（＝末尾の位置）を取得
2. **`log.append(records);`** — ファイルの末尾にデータを追記
3. **`offsetIndex().append(...)`** — 一定バイト数ごとにインデックスを更新

### 実装 — FileRecords.append()

実際のファイル書き込みは `FileRecords.append()` で行われます。

**ファイル：** `clients/src/main/java/org/apache/kafka/common/record/internal/FileRecords.java:193-201`

```java
public int append(MemoryRecords records) throws IOException {
    if (records.sizeInBytes() > Integer.MAX_VALUE - size.get())
        throw new IllegalArgumentException("Append of size " + records.sizeInBytes() +
                " bytes is too large for segment with current file position at " + size.get());

    int written = records.writeFullyTo(channel);
    size.getAndAdd(written);
    return written;
}
```

ポイント：

- **`records.writeFullyTo(channel)`** — Java の `FileChannel` を使ってファイルに書き込む
- `FileChannel` は内部で OS のページキャッシュと連携し、効率的にディスクに書き込む
- **途中のデータを上書きするコードは一切ない** — 常に末尾に追加するだけ

TypeScript で例えると：

```typescript
import { appendFileSync } from 'fs';

function append(filePath: string, data: Buffer) {
    // ファイルの末尾に追加するだけ。上書きも挿入もなし
    appendFileSync(filePath, data);
}
```

Node.js の `appendFileSync` と本質的に同じです。ただし Kafka は Java の `FileChannel` を使うことで、OS のページキャッシュを最大限活用しています。

---

## セグメントの管理 — 日記帳が満杯になったら新しい冊を開く

### 日常の例え

**「日記帳が1冊満杯になったら、新しい冊を用意する」**

1冊の日記帳に無限に書き続けることはできません。Kafka では「セグメント」という単位でファイルを分割します。デフォルトでは1つのセグメントは最大 1GB です。

例えば：

```
00000000000000000000.log  ← Offset 0 から始まるセグメント（古い）
00000000000000100000.log  ← Offset 100000 から始まるセグメント
00000000000000200000.log  ← Offset 200000 から始まるセグメント（最新）
```

古いセグメントは保存期間（デフォルト7日間）が過ぎたら、**ファイルごと削除**します。ファイルの中身を部分的に消す必要がないので、削除も高速です。

### 実装 — LogSegment クラス

`LogSegment` クラスがこの「日記帳の1冊」に相当します。

**ファイル：** `storage/src/main/java/org/apache/kafka/storage/internals/log/LogSegment.java:66`

```java
/**
 * A segment of the log. Each segment has two components: a log and an index. The log is a FileRecords containing
 * the actual messages. The index is an OffsetIndex that maps from logical offsets to physical file positions. Each
 * segment has a base offset which is an offset <= the least offset of any message in this segment and > any offset in
 * any previous segment.
 *
 * A segment with a base offset of [base_offset] would be stored in two files, a [base_offset].index and a [base_offset].log file.
 */
public class LogSegment implements Closeable {
    private final FileRecords log;
    private final LazyIndex<OffsetIndex> lazyOffsetIndex;
    private final LazyIndex<TimeIndex> lazyTimeIndex;
    private final TransactionIndex txnIndex;
    private final long baseOffset;
    // ...
}
```

構成要素：

- **`log`** — 実際のメッセージを保存する `.log` ファイル
- **`lazyOffsetIndex`** — オフセット→位置を記録する `.index` ファイル
- **`lazyTimeIndex`** — タイムスタンプ→オフセットを記録する `.timeindex` ファイル
- **`txnIndex`** — トランザクション情報を記録する `.txnindex` ファイル
- **`baseOffset`** — このセグメントの開始オフセット

### 実装 — 新しいセグメントを作るタイミング

`LogSegment.shouldRoll()` で「新しい冊を開くべきか」を判定します。

**ファイル：** `storage/src/main/java/org/apache/kafka/storage/internals/log/LogSegment.java:168-174`

```java
public boolean shouldRoll(RollParams rollParams) throws IOException {
    boolean reachedRollMs = timeWaitedForRoll(rollParams.now(), rollParams.maxTimestampInMessages()) > rollParams.maxSegmentMs() - rollJitterMs;
    int size = size();
    return size > rollParams.maxSegmentBytes() - rollParams.messagesSize() ||
        (size > 0 && reachedRollMs) ||
        offsetIndex().isFull() || timeIndex().isFull() || !canConvertToRelativeOffset(rollParams.maxOffsetInMessages());
}
```

新しいセグメントを作る条件：

1. **サイズが上限を超えた** — デフォルト 1GB
2. **時間が経過した** — デフォルト 7日間
3. **インデックスが満杯** — インデックスファイルの上限に達した
4. **オフセットがオーバーフロー** — 相対オフセットが32ビット整数で表現できなくなった

---

## Zero-Copy — 受付から直接トラックに渡す

### 日常の例え

**「倉庫から配送トラックに、受付を経由せず直接荷物を渡す」**

普通のやり方：

```
倉庫（ディスク） → 受付（カーネル） → 担当者の机（アプリのメモリ） → 受付に戻す → トラック（ネットワーク）
```

荷物（データ）を一旦担当者の机まで運んで、また受付に戻すのは無駄です。

Kafka のやり方：

```
倉庫（ディスク） → 受付（カーネル） → トラック（ネットワーク）
```

OS に「倉庫からトラックに直接送って」と指示するだけ。担当者の机（アプリのメモリ）を経由しないので、**メモリコピーが不要**です。これを Zero-Copy と呼びます。

### 実装 — FileRecords.writeTo()

この Zero-Copy を実装しているのが `FileRecords.writeTo()` です。

**ファイル：** `clients/src/main/java/org/apache/kafka/common/record/internal/FileRecords.java:291-303`

```java
@Override
public int writeTo(TransferableChannel destChannel, int offset, int length) throws IOException {
    long newSize = Math.min(channel.size(), end) - start;
    int oldSize = sizeInBytes();
    if (newSize < oldSize)
        throw new KafkaException(String.format(
                "Size of FileRecords %s has been truncated during write: old size %d, new size %d",
                file.getAbsolutePath(), oldSize, newSize));

    long position = start + offset;
    int count = Math.min(length, oldSize - offset);
    // safe to cast to int since `count` is an int
    return (int) destChannel.transferFrom(channel, position, count);
}
```

ポイント：

- **`destChannel.transferFrom(channel, position, count)`** が Zero-Copy の正体！
- `channel` = ディスク上のログファイル
- `destChannel` = ネットワークのソケット（Consumer への接続）
- `transferFrom()` は内部で Java の `FileChannel.transferTo()` を呼び、さらに OS の `sendfile()` システムコールを呼ぶ

処理の流れ：

```
1. Java コード: destChannel.transferFrom(channel, position, count)
2. Java 内部: FileChannel.transferTo() を呼ぶ
3. OS: sendfile() システムコールを呼ぶ
4. OS がディスクからネットワークに直接データを転送
```

**Kafka のコードはたった1行**。あとは Java と OS が「アプリのメモリを経由せずに直接送る」処理をやってくれます。

### 注意点：SSL 使用時は Zero-Copy が効かない

SSL（暗号化通信）を使う場合、データを暗号化する必要があるため、一旦アプリのメモリに読み込む必要があります。そのため SSL 使用時は Zero-Copy の恩恵を受けられません。

---

## インデックス — 目次でページ番号を引く

### 日常の例え

**「本の目次で、目的のページ番号を素早く見つける」**

Consumer が「Offset 50000 から読みたい」と言ったとき、ログファイルを最初から全部読むわけにはいきません。そこで `.index` ファイルが目次の役割をします。

インデックスの中身（イメージ）：

```
Offset → ファイル内の位置（バイト数）
    0  →  0
  100  →  4096
  200  →  8192
  300  →  12288
  ...
```

**全てのオフセットは記録しません**。一定バイト数ごと（デフォルト 4096 バイト）に1つだけ記録します。全部記録するとインデックス自体が巨大になるからです。

検索の流れ：

```
「Offset 150を探したい」

1. インデックスを見る
   → Offset 100 = ファイル位置 4096（150以下で最大のもの）

2. ファイル位置 4096 から順番に読んでいく
   → Offset 100, 101, 102, ... 150 を見つけた！
```

本の目次で「第3章は50ページから」とわかったら、50ページを開いてそこから目的のページまでパラパラめくるのと同じです。

### 実装 — OffsetIndex クラス

オフセット→位置のインデックスを管理するのが `OffsetIndex` クラスです。

**ファイル：** `storage/src/main/java/org/apache/kafka/storage/internals/log/OffsetIndex.java:54`

```java
/**
 * An index that maps offsets to physical file locations for a particular log segment. This index may be sparse:
 * that is it may not hold an entry for all messages in the log.
 *
 * The index is stored in a file that is pre-allocated to hold a fixed maximum number of 8-byte entries.
 *
 * The index supports lookups against a memory-map of this file. These lookups are done using a simple binary search variant
 * to locate the offset/location pair for the greatest offset less than or equal to the target offset.
 *
 * The file format is a series of entries. The physical format is a 4 byte "relative" offset and a 4 byte file location for the
 * message with that offset. The offset stored is relative to the base offset of the index file. So, for example,
 * if the base offset was 50, then the offset 55 would be stored as 5. Using relative offsets in this way let's us use
 * only 4 bytes for the offset.
 */
public final class OffsetIndex extends AbstractIndex {
    private static final int ENTRY_SIZE = 8;
    // ...
}
```

ファイルフォーマット：

- **エントリサイズ = 8 バイト**
  - 4 バイト：相対オフセット（base offset からの差分）
  - 4 バイト：ファイル内の位置（バイト数）
- 相対オフセットを使うことで、4 バイト（32ビット）で表現可能

### 実装 — OffsetIndex.lookup()

インデックスの検索は二分探索で行います。

**ファイル：** `storage/src/main/java/org/apache/kafka/storage/internals/log/OffsetIndex.java:97-106`

```java
/**
 * Find the largest offset less than or equal to the given targetOffset
 * and return a pair holding this offset and its corresponding physical file position.
 */
public OffsetPosition lookup(long targetOffset) {
    return inRemapReadLock(() -> {
        ByteBuffer idx = mmap().duplicate();
        int slot = largestLowerBoundSlotFor(idx, targetOffset, IndexSearchType.KEY);
        if (slot == -1)
            return new OffsetPosition(baseOffset(), 0);
        else
            return parseEntry(idx, slot);
    });
}
```

ポイント：

- **`mmap()`** — インデックスファイルをメモリマップ（OS のページキャッシュを利用）
- **`largestLowerBoundSlotFor()`** — 二分探索で「targetOffset 以下で最大のオフセット」を探す
- 見つかったら `parseEntry()` でオフセットと位置のペアを返す

### 実装 — OffsetIndex.append()

インデックスへのエントリ追加。

**ファイル：** `storage/src/main/java/org/apache/kafka/storage/internals/log/OffsetIndex.java:143-160`

```java
public void append(long offset, int position) {
    inLock(() -> {
        if (isFull())
            throw new IllegalArgumentException("Attempt to append to a full index (size = " + entries() + ").");

        if (entries() == 0 || offset > lastOffset) {
            log.trace("Adding index entry {} => {} to {}", offset, position, file().getAbsolutePath());
            mmap().putInt(relativeOffset(offset));
            mmap().putInt(position);
            incrementEntries();
            lastOffset = offset;
            if (entries() * ENTRY_SIZE != mmap().position())
                throw new IllegalStateException(entries() + " entries but file position in index is " + mmap().position());
        } else
            throw new InvalidOffsetException("Attempt to append an offset " + offset + " to position " + entries() +
                " no larger than the last offset appended (" + lastOffset + ") to " + file().getAbsolutePath());
    });
}
```

ポイント：

- **`mmap().putInt(relativeOffset(offset))`** — 相対オフセット（4バイト）を書き込む
- **`mmap().putInt(position)`** — ファイル位置（4バイト）を書き込む
- オフセットは常に増加する必要がある（`offset > lastOffset` のチェック）

### 実装 — TimeIndex クラス

タイムスタンプ→オフセットのインデックス。

**ファイル：** `storage/src/main/java/org/apache/kafka/storage/internals/log/TimeIndex.java:54`

```java
/**
 * An index that maps from the timestamp to the logical offsets of the messages in a segment. This index might be
 * sparse, i.e. it may not hold an entry for all the messages in the segment.
 *
 * The index is stored in a file that is preallocated to hold a fixed maximum amount of 12-byte time index entries.
 * The file format is a series of time index entries. The physical format is a 8 bytes timestamp and a 4 bytes "relative"
 * offset used in the [[OffsetIndex]]. A time index entry (TIMESTAMP, OFFSET) means that the biggest timestamp seen
 * before OFFSET is TIMESTAMP. i.e. Any message whose timestamp is greater than TIMESTAMP must come after OFFSET.
 */
public class TimeIndex extends AbstractIndex {
    private static final int ENTRY_SIZE = 12;
    // ...
}
```

ファイルフォーマット：

- **エントリサイズ = 12 バイト**
  - 8 バイト：タイムスタンプ（Unix time in milliseconds）
  - 4 バイト：相対オフセット

---

## Partition の振り分け — どのレジに並ぶか

### 日常の例え

**「スーパーのレジに並ぶとき、どのレジを選ぶか」**

Kafka の Topic は複数の Partition に分かれています。Producer がメッセージを送るとき、どの Partition に入れるかを決める必要があります。

振り分け方法：

1. **キーがない場合** — 順番に振り分ける（ラウンドロビン）
   - レジ1 → レジ2 → レジ3 → レジ1 → ...

2. **キーがある場合** — キーのハッシュ値で決める
   - `user-A` さんは常にレジ1
   - `user-B` さんは常にレジ2
   - 同じユーザーのメッセージは常に同じ Partition に行く → **順序保証**

### 実装 — BuiltInPartitioner クラス

Kafka の標準的なパーティショナー。

**ファイル：** `clients/src/main/java/org/apache/kafka/clients/producer/internals/BuiltInPartitioner.java:39`

```java
/**
 * Built-in default partitioner.  Note, that this is just a utility class that is used directly from
 * RecordAccumulator, it does not implement the Partitioner interface.
 *
 * The class keeps track of various bookkeeping information required for adaptive sticky partitioning
 * (described in detail in KIP-794).  There is one partitioner object per topic.
 */
public class BuiltInPartitioner {
    private final String topic;
    private final int stickyBatchSize;
    private volatile PartitionLoadStats partitionLoadStats = null;
    private final AtomicReference<StickyPartitionInfo> stickyPartitionInfo = new AtomicReference<>();
    // ...
}
```

### 実装 — nextPartition()

次に使う Partition を選ぶロジック。

**ファイル：** `clients/src/main/java/org/apache/kafka/clients/producer/internals/BuiltInPartitioner.java:66-112`

```java
private int nextPartition(Cluster cluster) {
    int random = randomPartition();

    // Cache volatile variable in local variable.
    PartitionLoadStats partitionLoadStats = this.partitionLoadStats;
    int partition;

    if (partitionLoadStats == null) {
        // We don't have stats to do adaptive partitioning (or it's disabled), just switch to the next
        // partition based on uniform distribution.
        List<PartitionInfo> availablePartitions = cluster.availablePartitionsForTopic(topic);
        if (!availablePartitions.isEmpty()) {
            partition = availablePartitions.get(random % availablePartitions.size()).partition();
        } else {
            // We don't have available partitions, just pick one among all partitions.
            List<PartitionInfo> partitions = cluster.partitionsForTopic(topic);
            partition = random % partitions.size();
        }
    } else {
        // Calculate next partition based on load distribution.
        // Note that partitions without leader are excluded from the partitionLoadStats.
        assert partitionLoadStats.length > 0;

        int[] cumulativeFrequencyTable = partitionLoadStats.cumulativeFrequencyTable;
        int weightedRandom = random % cumulativeFrequencyTable[partitionLoadStats.length - 1];

        // By construction, the cumulative frequency table is sorted, so we can use binary
        // search to find the desired index.
        int searchResult = Arrays.binarySearch(cumulativeFrequencyTable, 0, partitionLoadStats.length, weightedRandom);

        // binarySearch results the index of the found element, or -(insertion_point) - 1
        // (where insertion_point is the index of the first element greater than the key).
        int partitionIndex = Math.abs(searchResult + 1);
        assert partitionIndex < partitionLoadStats.length;
        partition = partitionLoadStats.partitionIds[partitionIndex];
    }

    log.trace("Switching to partition {} in topic {}", partition, topic);
    return partition;
}
```

ポイント：

1. **負荷分散統計がない場合** — 利用可能な Partition からランダムに選ぶ
2. **負荷分散統計がある場合** — Partition の負荷状況を考慮して選ぶ（KIP-794: Adaptive Sticky Partitioning）

**Sticky Partitioning** とは：

- 一定量のメッセージを同じ Partition に送り続ける
- バッチ処理の効率を高める
- 一定量に達したら別の Partition に切り替える

---

## まとめ — 全体の流れ

Producer がメッセージを送ってから Consumer が読むまでの全体像を、実際のクラスとメソッドで追うとこうなります：

### 1. Producer が送信

```
BuiltInPartitioner.nextPartition()
  → どの Partition に入れるか決める
  → random % partitionCount で振り分け
```

### 2. Broker が受信

```
LogSegment.append(largestOffset, records)
  → 該当 Partition の LogSegment に渡す
  → int physicalPosition = log.sizeInBytes()  // 現在のファイル末尾の位置
  → log.append(records)                       // ファイルの末尾に追記
```

### 3. ファイルに書き込み

```
FileRecords.append(records)
  → int written = records.writeFullyTo(channel)  // FileChannel で書き込み
  → size.getAndAdd(written)                      // サイズを更新
```

### 4. インデックスを更新

```
LogSegment.append() 内で:
  if (bytesSinceLastIndexEntry > indexIntervalBytes) {
      offsetIndex().append(batchLastOffset, physicalPosition)  // 位置を記録
      timeIndex().maybeAppend(maxTimestampSoFar(), ...)        // タイムスタンプを記録
  }
```

### 5. Consumer が読み取り

#### 5-1. オフセットから位置を検索

```
LogSegment.translateOffset(offset)
  → OffsetPosition mapping = offsetIndex().lookup(offset)  // インデックスで位置を特定
  → log.searchForOffsetFromPosition(offset, mapping.position())
```

#### 5-2. データを読み取る

```
LogSegment.read(startOffset, maxSize)
  → LogOffsetPosition startOffsetAndSize = translateOffset(startOffset)
  → log.slice(startPosition, fetchSize)  // データのスライスを返す
```

#### 5-3. Zero-Copy で送信

```
FileRecords.writeTo(destChannel, offset, length)
  → destChannel.transferFrom(channel, position, count)
      → 内部で OS の sendfile() を呼ぶ
      → ディスクからネットワークに直接転送（アプリのメモリを経由しない）
```

---

## Kafka が速い理由

コード自体はどれも数十行〜数百行程度で、1つ1つは驚くほどシンプルです。Kafka が速い理由は「魔法のような難しいアルゴリズム」ではなく、**「シンプルな処理を OS の得意な方法で組み合わせた」** ことにあります。

1. **ファイルの末尾に追加するだけ** — シーケンシャル書き込み
2. **OS のページキャッシュに任せる** — メモリマップとページキャッシュの活用
3. **ファイルからソケットに直接送る** — Zero-Copy (sendfile)
4. **スパースなインデックスと二分探索** — メモリ効率と検索速度の両立
5. **セグメント単位での削除** — ファイルごと削除するだけ

この「だけ」の積み重ねが、**毎秒数百万メッセージ**という性能を生んでいます。

---

## 参考リンク

- [Apache Kafka GitHub](https://github.com/apache/kafka)
- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [KIP-794: Adaptive Sticky Partitioning](https://cwiki.apache.org/confluence/display/KAFKA/KIP-794%3A+Strictly+Uniform+Sticky+Partitioner)

---

**Generated with Apache Kafka source code inspection**
