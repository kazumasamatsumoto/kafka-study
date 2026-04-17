import { Kafka } from 'kafkajs';

/**
 * Partition学習用のProducer
 *
 * 実行方法:
 * npm run learn:partition-producer
 *
 * このスクリプトは:
 * 1. 3つのパーティションを持つTopicを作成
 * 2. メッセージを送信（keyによってパーティションが決まる）
 * 3. どのパーティションに振り分けられたかを確認
 */

const kafka = new Kafka({
  clientId: 'learn-partition',
  brokers: ['localhost:19092'],
});

const admin = kafka.admin();
const producer = kafka.producer();

async function createTopicWithPartitions() {
  try {
    await admin.connect();
    console.log('Admin接続完了\n');

    const topic = 'partition-topic';
    const partitions = 3;

    // 既存のTopicを削除（学習用）
    try {
      await admin.deleteTopics({ topics: [topic] });
      console.log(`既存の ${topic} を削除しました`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      // Topicが存在しない場合は無視
    }

    // 3つのパーティションを持つTopicを作成
    await admin.createTopics({
      topics: [
        {
          topic,
          numPartitions: partitions,
          replicationFactor: 1,
        },
      ],
    });

    console.log(`✓ ${topic} を作成（パーティション数: ${partitions}）\n`);
    await admin.disconnect();
  } catch (error) {
    console.error('Topic作成エラー:', error);
    await admin.disconnect();
    throw error;
  }
}

async function sendMessages() {
  try {
    await producer.connect();
    console.log('Producer接続完了\n');

    const topic = 'partition-topic';
    const messageCount = 15;

    console.log(`${messageCount}個のメッセージを送信します...\n`);

    for (let i = 0; i < messageCount; i++) {
      const result = await producer.send({
        topic,
        messages: [
          {
            key: `user-${i % 5}`, // 5種類のkeyでメッセージを分散
            value: `メッセージ ${i} (key: user-${i % 5})`,
          },
        ],
      });

      // どのパーティションに送られたかを表示
      const partition = result[0].partition;
      console.log(`✓ メッセージ ${i} → Partition ${partition} (key: user-${i % 5})`);

      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    console.log(`\n全${messageCount}件のメッセージを送信完了！`);
    console.log('\n--- 重要ポイント ---');
    console.log('同じkeyを持つメッセージは同じパーティションに送られます。');
    console.log('これにより、順序を保証する必要があるメッセージをグループ化できます。');
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await producer.disconnect();
  }
}

async function run() {
  await createTopicWithPartitions();
  await sendMessages();
}

run();
