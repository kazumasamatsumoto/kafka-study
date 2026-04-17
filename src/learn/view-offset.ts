import { Kafka } from 'kafkajs';

/**
 * 【ステップ7】Offset確認学習 - Offset詳細表示ツール
 *
 * 📋 前提条件:
 *   - 確認したいConsumer Groupが存在すること
 *   - 対象トピックにメッセージが存在すること
 *
 * 🎯 このスクリプトで学ぶこと:
 *   - Consumer GroupのOffset状態を確認する方法
 *   - Current Offset、End Offset、Lagの意味
 *   - 読み終えたメッセージ数、未読メッセージ数、進捗率の計算
 *
 * 🚀 実行方法:
 *   【デフォルト（offset-check-group / learn-topic）】
 *   npm run learn:view-offset
 *
 *   【Consumer GroupとTopicを指定】
 *   npm run learn:view-offset <groupId> <topic>
 *   例: npm run learn:view-offset demo-group demo-topic
 *
 * ✅ 期待される結果:
 *   【現在のOffset】
 *   - Current Offset: 次に読むOffset
 *   - 「次回は Offset N から読み始める」
 *
 *   【トピックのOffset情報】
 *   - Low (最古): 最も古いOffset
 *   - High (最新): 次の書き込みOffset
 *   - 合計メッセージ数
 *
 *   【進捗状況】
 *   - 読み終えたメッセージ数
 *   - 未読メッセージ数
 *   - 進捗率（%）
 *
 * 📊 データフロー:
 *   Admin API → Kafka
 *   - fetchOffsets: Consumer GroupのOffset取得
 *   - fetchTopicOffsets: トピックのOffset情報取得
 *   → 進捗率を計算して表示
 *
 * 🔗 関連スクリプト:
 *   npm run learn:check-offset (5件読んでOffset確認のデモ)
 */

const kafka = new Kafka({
  clientId: 'view-offset',
  brokers: ['localhost:19092'],
});

async function viewOffsets() {
  const admin = kafka.admin();

  try {
    await admin.connect();

    const groupId = process.argv[2] || 'offset-check-group';
    const topic = process.argv[3] || 'learn-topic';

    console.log('\n========================================');
    console.log('Consumer Group Offset情報');
    console.log('========================================\n');
    console.log(`Consumer Group: ${groupId}`);
    console.log(`Topic: ${topic}\n`);

    // Consumer GroupのOffset情報を取得
    const offsets = await admin.fetchOffsets({
      groupId,
      topics: [topic],
    });

    console.log('【現在のOffset】');
    console.log('─────────────────────────────────\n');

    if (offsets.length === 0) {
      console.log('Offsetなし（まだ読んでいない）\n');
    } else {
      offsets.forEach((topicOffsets) => {
        console.log(`Topic: ${topicOffsets.topic}`);
        topicOffsets.partitions.forEach((p) => {
          console.log(`  Partition ${p.partition}:`);
          console.log(`    Current Offset: ${p.offset}`);
          console.log(`    → 次回は Offset ${p.offset} から読み始める`);
        });
      });
      console.log('');
    }

    // トピックの最新Offset情報を取得
    const topicOffsets = await admin.fetchTopicOffsets(topic);

    console.log('【トピックのOffset情報】');
    console.log('─────────────────────────────────\n');
    topicOffsets.forEach((p) => {
      console.log(`Partition ${p.partition}:`);
      console.log(`  Low (最古): ${p.low}`);
      console.log(`  High (最新): ${p.high}`);
      console.log(`  → 合計メッセージ数: ${parseInt(p.high) - parseInt(p.low)}件`);
    });
    console.log('');

    // Consumer Groupが読んだ進捗を計算
    if (offsets.length > 0 && topicOffsets.length > 0) {
      const currentOffset = parseInt(offsets[0].partitions[0].offset);
      const highOffset = parseInt(topicOffsets[0].high);
      const lowOffset = parseInt(topicOffsets[0].low);
      const totalMessages = highOffset - lowOffset;
      const readMessages = currentOffset - lowOffset;
      const unreadMessages = highOffset - currentOffset;

      console.log('【進捗状況】');
      console.log('─────────────────────────────────\n');
      console.log(`読み終えたメッセージ: ${readMessages}件`);
      console.log(`未読メッセージ: ${unreadMessages}件`);
      console.log(`合計: ${totalMessages}件`);
      console.log(`進捗率: ${((readMessages / totalMessages) * 100).toFixed(1)}%\n`);
    }

    await admin.disconnect();
  } catch (error: any) {
    console.error('エラー:', error.message);
    await admin.disconnect();
  }
}

viewOffsets();
