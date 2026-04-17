import { Kafka } from 'kafkajs';

/**
 * リアルタイム送信用のProducer
 *
 * 実行方法:
 * npm run learn:realtime-producer
 *
 * このスクリプトは3秒ごとにメッセージを送信し続けます。
 * Consumerを別ターミナルで起動して、リアルタイムで受信されることを確認してください。
 */

const kafka = new Kafka({
  clientId: 'realtime-producer',
  brokers: ['localhost:19092'],
});

const producer = kafka.producer();

async function run() {
  try {
    await producer.connect();
    console.log('\n========================================');
    console.log('リアルタイムProducer起動');
    console.log('3秒ごとにメッセージを送信します');
    console.log('Ctrl+Cで停止');
    console.log('========================================\n');

    const topic = 'realtime-topic';
    let count = 0;

    // 3秒ごとにメッセージを送信
    const interval = setInterval(async () => {
      try {
        const timestamp = new Date().toISOString();
        const message = {
          id: count,
          timestamp,
          data: `リアルタイムメッセージ ${count}`,
        };

        await producer.send({
          topic,
          messages: [
            {
              key: `msg-${count}`,
              value: JSON.stringify(message),
            },
          ],
        });

        console.log(`[${timestamp}] ✓ メッセージ ${count} を送信`);
        count++;
      } catch (error) {
        console.error('送信エラー:', error);
      }
    }, 3000);

    // Ctrl+Cでクリーンアップ
    process.on('SIGINT', async () => {
      console.log('\n\nProducerを停止しています...');
      clearInterval(interval);
      await producer.disconnect();
      console.log('停止完了');
      process.exit(0);
    });
  } catch (error) {
    console.error('エラー:', error);
    await producer.disconnect();
  }
}

run();
