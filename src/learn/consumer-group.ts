import { Kafka } from 'kafkajs';

/**
 * Consumer Group学習スクリプト
 *
 * 実行方法:
 * 1. ターミナル1: npm run learn:consumer-group -- consumer1
 * 2. ターミナル2: npm run learn:consumer-group -- consumer2
 *
 * 説明:
 * - 同じgroupId → メッセージを分け合う（負荷分散）
 * - 違うgroupId → それぞれ全メッセージを受け取る
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
