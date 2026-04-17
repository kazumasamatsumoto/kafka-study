import { Kafka } from 'kafkajs';

/**
 * 【ステップ1】Consumer Group学習 - Consumer
 *
 * 📋 前提条件:
 *   - npm run learn:producer-group を実行済み（メッセージ送信済み）
 *   - または、learn-topicにメッセージが存在すること
 *
 * 🎯 このスクリプトで学ぶこと:
 *   - Consumer Groupによる負荷分散の仕組み
 *   - 同じgroupIdのConsumerは、メッセージを分け合う
 *   - 異なるgroupIdのConsumerは、独立してメッセージを受信
 *
 * 🚀 実行方法:
 *   【単一Consumer】
 *   npm run learn:consumer-group
 *
 *   【複数Consumer（負荷分散確認）】
 *   ターミナル1: npm run learn:consumer-group
 *   ターミナル2: npm run learn:consumer-group
 *   → 同じgroupIdなので、メッセージを分け合う
 *
 * ✅ 期待される結果:
 *   【単一Consumer】
 *   - learn-topicの全メッセージを受信
 *   - 「[受信 1] Offset 0: メッセージ 0」〜「[受信 10] Offset 9: メッセージ 9」
 *
 *   【複数Consumer】
 *   - ターミナル1: 約5件受信
 *   - ターミナル2: 約5件受信
 *   - 合計10件を分け合う
 *
 * 📊 データフロー:
 *   learn-topic → Consumer (groupId: consumer-learn-group)
 *   同じgroupId → 負荷分散
 *   異なるgroupId → 独立受信
 *
 * 🔗 確認方法:
 *   Kafka UI: http://localhost:8080 → Consumers → consumer-learn-group
 */

const kafka = new Kafka({
  clientId: 'learn-consumer-group',
  brokers: ['localhost:19092'],
});

// コマンドライン引数から名前を取得
const consumerName = process.argv[2] || 'consumer1';

// consumer1とconsumer2は同じgroupId
// consumer3は別のgroupId
const groupId = consumerName === 'consumer3' ? 'different-group' : 'same-group';

const consumer = kafka.consumer({
  groupId,
});

async function run() {
  try {
    await consumer.connect();
    console.log(`\n========================================`);
    console.log(`${consumerName} が起動しました`);
    console.log(`Group ID: ${groupId}`);
    console.log(`========================================\n`);

    await consumer.subscribe({
      topic: 'learn-topic',
      fromBeginning: true,
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const value = message.value?.toString();
        console.log(`\n[${consumerName}] メッセージ受信:`);
        console.log(`  Offset: ${message.offset}`);
        console.log(`  Partition: ${partition}`);
        console.log(`  Value: ${value}`);
      },
    });
  } catch (error) {
    console.error('エラー:', error);
    await consumer.disconnect();
  }
}

// Ctrl+Cでクリーンアップ
process.on('SIGINT', async () => {
  console.log(`\n${consumerName} を停止しています...`);
  await consumer.disconnect();
  process.exit(0);
});

run();
