import { Kafka } from 'kafkajs';

/**
 * 全トピックテストスクリプト
 * 全6トピックにメッセージを送信してテスト
 */

const kafka = new Kafka({
  clientId: 'test-all-topics',
  brokers: ['localhost:19092'],
});

const producer = kafka.producer();

// 全トピック定義
const topics = [
  { name: 'orders-topic', prefix: 'order', description: '注文情報' },
  { name: 'payments-topic', prefix: 'payment', description: '決済情報' },
  { name: 'notifications-topic', prefix: 'notification', description: '通知' },
  { name: 'events-topic', prefix: 'event', description: 'イベント' },
  { name: 'logs-topic', prefix: 'log', description: 'ログ' },
  { name: 'health-check-topic', prefix: 'health', description: 'ヘルスチェック' },
];

async function sendMessagesToAllTopics() {
  try {
    await producer.connect();
    console.log('✅ Producer接続完了\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 全トピックへメッセージ送信開始');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const messagesPerTopic = 3;
    let totalSent = 0;

    for (const topic of topics) {
      console.log(`\n📬 Topic: ${topic.name}`);
      console.log(`   説明: ${topic.description}`);
      console.log(`   メッセージ数: ${messagesPerTopic}件\n`);

      for (let i = 0; i < messagesPerTopic; i++) {
        const message = {
          key: `${topic.prefix}-${i}`,
          value: JSON.stringify({
            id: i,
            topicName: topic.name,
            type: topic.prefix.toUpperCase(),
            content: `${topic.description} - テストメッセージ ${i + 1}`,
            timestamp: new Date().toISOString(),
            sender: 'test-all-topics',
          }),
        };

        await producer.send({
          topic: topic.name,
          messages: [message],
        });

        totalSent++;
        console.log(`  ✓ [${i + 1}/${messagesPerTopic}] 送信完了: ${message.key}`);
      }

      console.log(`  ✅ ${topic.name} 完了`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 全トピックへの送信完了！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`📊 統計情報:`);
    console.log(`  - トピック数: ${topics.length}`);
    console.log(`  - トピックあたりメッセージ数: ${messagesPerTopic}`);
    console.log(`  - 合計送信数: ${totalSent}件\n`);

    console.log('🔍 確認方法:');
    console.log('  1. Kafka UI: http://localhost:8080');
    console.log('  2. Consumer: npm run test:verify-all');
    console.log('  3. CLI: docker exec kafka-broker-modern kafka-console-consumer \\');
    console.log('          --bootstrap-server localhost:9092 \\');
    console.log('          --topic [TOPIC_NAME] \\');
    console.log('          --from-beginning --max-messages 3\n');
  } catch (error) {
    console.error('❌ エラー発生:', error);
  } finally {
    await producer.disconnect();
    console.log('🔌 Producer切断完了\n');
  }
}

sendMessagesToAllTopics();
