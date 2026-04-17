import { Kafka } from 'kafkajs';

/**
 * Consumer Group学習用のProducer
 *
 * 実行方法:
 * npm run learn:producer-group
 *
 * このスクリプトは learn-topic に10個のメッセージを送信します。
 * 複数のConsumerを起動して、どう分散されるか確認してください。
 */

const kafka = new Kafka({
  clientId: 'learn-producer',
  brokers: ['localhost:19092'],
});

const producer = kafka.producer();

async function sendMessages() {
  try {
    await producer.connect();
    console.log('Producer接続完了\n');

    const topic = 'learn-topic';
    const messageCount = 10;

    console.log(`${messageCount}個のメッセージを送信します...\n`);

    for (let i = 0; i < messageCount; i++) {
      await producer.send({
        topic,
        messages: [
          {
            key: `key-${i}`,
            value: `メッセージ ${i}`,
          },
        ],
      });

      console.log(`✓ メッセージ ${i} を送信`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`\n全${messageCount}件のメッセージを送信完了！`);
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await producer.disconnect();
  }
}

sendMessages();
