import { Kafka } from 'kafkajs';

/**
 * Partition学習用のConsumer
 *
 * 実行方法:
 * npm run learn:partition-consumer
 *
 * このスクリプトは partition-topic から全パーティションのメッセージを受信します。
 * どのパーティションから読んでいるかを確認できます。
 */

const kafka = new Kafka({
  clientId: 'learn-partition',
  brokers: ['localhost:19092'],
});

const consumer = kafka.consumer({
  groupId: 'partition-learn-group',
});

async function run() {
  try {
    await consumer.connect();
    console.log('\n========================================');
    console.log('Partition Consumer が起動しました');
    console.log('========================================\n');

    await consumer.subscribe({
      topic: 'partition-topic',
      fromBeginning: true,
    });

    // パーティションごとのメッセージ数をカウント
    const partitionCounts: { [key: number]: number } = {};
    const keyCounts: { [key: string]: { partition: number; count: number } } = {};

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const key = message.key?.toString() || 'null';
        const value = message.value?.toString();

        // カウント更新
        partitionCounts[partition] = (partitionCounts[partition] || 0) + 1;
        if (!keyCounts[key]) {
          keyCounts[key] = { partition, count: 0 };
        }
        keyCounts[key].count++;

        console.log(`\n[受信] Partition ${partition}:`);
        console.log(`  Offset: ${message.offset}`);
        console.log(`  Key: ${key}`);
        console.log(`  Value: ${value}`);

        // 統計情報を表示
        console.log('\n--- 現在の統計 ---');
        Object.keys(partitionCounts).forEach((p) => {
          console.log(`  Partition ${p}: ${partitionCounts[Number(p)]}件`);
        });
        console.log('\n--- Keyごとのパーティション ---');
        Object.keys(keyCounts).forEach((k) => {
          console.log(
            `  ${k} → Partition ${keyCounts[k].partition} (${keyCounts[k].count}件)`
          );
        });
      },
    });
  } catch (error) {
    console.error('エラー:', error);
    await consumer.disconnect();
  }
}

// Ctrl+Cでクリーンアップ
process.on('SIGINT', async () => {
  console.log('\nConsumerを停止しています...');
  await consumer.disconnect();
  process.exit(0);
});

run();
