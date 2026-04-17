import { Kafka } from 'kafkajs';

/**
 * 【ステップ1】Consumer Group学習 - Producer
 *
 * 📋 前提条件:
 *   - Kafka環境が起動していること (docker-compose up -d)
 *   - learn-topicが存在すること（自動作成済み）
 *
 * 🎯 このスクリプトで学ぶこと:
 *   - Producerからトピックへのメッセージ送信
 *   - 送信したメッセージがKafkaに保管されること
 *
 * 🚀 実行方法:
 *   npm run learn:producer-group
 *
 * ✅ 期待される結果:
 *   - 10件のメッセージが learn-topic に送信される
 *   - 各メッセージ送信後に「✓ メッセージ N を送信」と表示
 *   - 最後に「全10件のメッセージを送信完了！」と表示
 *
 * 📊 データフロー:
 *   Producer (このスクリプト) → learn-topic → Consumer (次のステップ)
 *
 * 🔗 次のステップ:
 *   npm run learn:consumer-group
 *   (送信したメッセージを受信して、Consumer Groupの動作を確認)
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
