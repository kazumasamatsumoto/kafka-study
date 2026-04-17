import { Kafka } from 'kafkajs';

/**
 * テストトピック向けProducer
 * orders-topicにメッセージを送信
 */

const kafka = new Kafka({
  clientId: 'test-producer',
  brokers: ['localhost:19092'], // ホストから接続
});

const producer = kafka.producer();

async function sendTestMessages() {
  try {
    await producer.connect();
    console.log('✅ Producer接続完了\n');

    const topic = 'orders-topic';
    const messageCount = 5;

    console.log(`📨 ${topic} に ${messageCount}件のメッセージを送信します...\n`);

    for (let i = 0; i < messageCount; i++) {
      const message = {
        key: `order-${i}`,
        value: JSON.stringify({
          id: i,
          type: 'ORDER',
          content: `注文テストメッセージ ${i}`,
          timestamp: new Date().toISOString(),
          sender: 'test-producer',
        }),
      };

      await producer.send({
        topic,
        messages: [message],
      });

      console.log(`✓ [${i + 1}/${messageCount}] メッセージ送信完了`);
      console.log(`  Key: ${message.key}`);
      console.log(`  Value: ${JSON.parse(message.value).content}`);
      console.log('');

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 全 ${messageCount}件のメッセージを送信完了！`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('次のコマンドで受信してください:');
    console.log('npm run test:consumer');
    console.log('');
    console.log('または Kafka UI で確認:');
    console.log('http://localhost:8080');
  } catch (error) {
    console.error('❌ エラー発生:', error);
  } finally {
    await producer.disconnect();
    console.log('\n🔌 Producer切断完了');
  }
}

sendTestMessages();
