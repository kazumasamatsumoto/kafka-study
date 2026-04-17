import { Kafka } from 'kafkajs';

/**
 * テストトピック向けConsumer
 * orders-topicからメッセージを受信
 */

const kafka = new Kafka({
  clientId: 'test-consumer',
  brokers: ['localhost:19092'], // ホストから接続
});

const consumer = kafka.consumer({
  groupId: 'test-orders-group',
});

async function consumeTestMessages() {
  try {
    await consumer.connect();
    console.log('✅ Consumer接続完了\n');

    const topic = 'orders-topic';

    await consumer.subscribe({
      topic,
      fromBeginning: true, // 最初から読む
    });

    console.log(`📬 ${topic} からメッセージを受信開始...`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let messageCount = 0;

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        messageCount++;
        const value = message.value?.toString();
        const key = message.key?.toString();

        console.log(`📨 [メッセージ ${messageCount}] 受信`);
        console.log(`  Topic: ${topic}`);
        console.log(`  Partition: ${partition}`);
        console.log(`  Offset: ${message.offset}`);
        console.log(`  Key: ${key}`);

        try {
          const parsedValue = JSON.parse(value || '{}');
          console.log(`  Content: ${parsedValue.content}`);
          console.log(`  Type: ${parsedValue.type}`);
          console.log(`  Timestamp: ${parsedValue.timestamp}`);
          console.log(`  Sender: ${parsedValue.sender}`);
        } catch (error) {
          console.log(`  Value: ${value}`);
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      },
    });
  } catch (error) {
    console.error('❌ エラー発生:', error);
    await consumer.disconnect();
  }
}

// Ctrl+Cでクリーンアップ
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Consumerを停止しています...');
  await consumer.disconnect();
  console.log('🔌 Consumer切断完了');
  process.exit(0);
});

consumeTestMessages();
