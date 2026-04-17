import { Kafka } from 'kafkajs';

/**
 * リアルタイム受信用のConsumer
 *
 * 実行方法:
 * npm run learn:realtime-consumer
 *
 * このスクリプトはリアルタイムでメッセージを受信し続けます。
 * Producerを別ターミナルで起動して、送信されたメッセージがすぐに受信されることを確認してください。
 */

const kafka = new Kafka({
  clientId: 'realtime-consumer',
  brokers: ['localhost:19092'],
});

const consumer = kafka.consumer({
  groupId: 'realtime-group',
});

async function run() {
  try {
    await consumer.connect();
    console.log('\n========================================');
    console.log('リアルタイムConsumer起動');
    console.log('メッセージを待機中...');
    console.log('Ctrl+Cで停止');
    console.log('========================================\n');

    const topic = 'realtime-topic';

    await consumer.subscribe({
      topic,
      fromBeginning: false, // 最新のメッセージのみ受信（リアルタイム）
    });

    let receivedCount = 0;

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        receivedCount++;
        const receiveTime = new Date().toISOString();
        const value = message.value?.toString();

        let parsedValue;
        try {
          parsedValue = JSON.parse(value || '{}');
        } catch {
          parsedValue = value;
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📩 メッセージ受信 (${receivedCount}件目)`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`受信時刻: ${receiveTime}`);
        console.log(`Offset: ${message.offset}`);
        console.log(`Partition: ${partition}`);

        if (parsedValue.timestamp) {
          const sendTime = new Date(parsedValue.timestamp);
          const receiveTimeObj = new Date(receiveTime);
          const latency = receiveTimeObj.getTime() - sendTime.getTime();
          console.log(`送信時刻: ${parsedValue.timestamp}`);
          console.log(`遅延: ${latency}ms`);
        }

        console.log(`内容: ${JSON.stringify(parsedValue, null, 2)}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      },
    });
  } catch (error) {
    console.error('エラー:', error);
    await consumer.disconnect();
  }
}

// Ctrl+Cでクリーンアップ
process.on('SIGINT', async () => {
  console.log('\n\nConsumerを停止しています...');
  await consumer.disconnect();
  console.log('停止完了');
  process.exit(0);
});

run();
