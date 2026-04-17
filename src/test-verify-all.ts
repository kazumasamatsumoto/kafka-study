import { Kafka } from 'kafkajs';

/**
 * 全トピック検証スクリプト
 * 各トピックからメッセージを読み取って検証
 */

const kafka = new Kafka({
  clientId: 'test-verify-all',
  brokers: ['localhost:19092'],
});

const topics = [
  'orders-topic',
  'payments-topic',
  'notifications-topic',
  'events-topic',
  'logs-topic',
  'health-check-topic',
];

async function verifyAllTopics() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 全トピック検証開始');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results: { [key: string]: number } = {};

  for (const topic of topics) {
    console.log(`\n📬 Topic: ${topic}`);
    console.log('─────────────────────────────────\n');

    const consumer = kafka.consumer({
      groupId: `verify-${topic}-${Date.now()}`, // 毎回新しいグループで読む
    });

    try {
      await consumer.connect();

      await consumer.subscribe({
        topic,
        fromBeginning: true,
      });

      let messageCount = 0;
      const messages: any[] = [];

      // タイムアウト付きで読み取り
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));

      const consumePromise = consumer.run({
        eachMessage: async ({ message }) => {
          messageCount++;
          const value = message.value?.toString();
          const key = message.key?.toString();

          try {
            const parsed = JSON.parse(value || '{}');
            messages.push({
              key,
              offset: message.offset,
              content: parsed.content,
              timestamp: parsed.timestamp,
            });
          } catch (error) {
            messages.push({
              key,
              offset: message.offset,
              value,
            });
          }
        },
      });

      await timeoutPromise;
      await consumer.disconnect();

      results[topic] = messageCount;

      if (messageCount > 0) {
        console.log(`✅ メッセージ数: ${messageCount}件\n`);
        messages.forEach((msg, index) => {
          console.log(`  [${index + 1}] Offset: ${msg.offset}, Key: ${msg.key}`);
          if (msg.content) {
            console.log(`      Content: ${msg.content}`);
          }
        });
      } else {
        console.log(`⚠️  メッセージなし`);
      }
    } catch (error) {
      console.error(`❌ エラー: ${error}`);
      results[topic] = -1;
    }
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 検証結果サマリー');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let totalMessages = 0;
  topics.forEach((topic) => {
    const count = results[topic] || 0;
    totalMessages += count > 0 ? count : 0;
    const status = count > 0 ? '✅' : count === 0 ? '⚠️' : '❌';
    console.log(`${status} ${topic.padEnd(35)} : ${count}件`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`合計メッセージ数: ${totalMessages}件`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
}

verifyAllTopics();
