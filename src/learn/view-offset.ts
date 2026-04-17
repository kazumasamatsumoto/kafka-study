import { Kafka } from 'kafkajs';

/**
 * Consumer GroupのOffset情報を表示
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
