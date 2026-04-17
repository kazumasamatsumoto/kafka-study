import { Kafka } from 'kafkajs';

/**
 * Offset確認デモ
 * 5件だけ読んでOffsetをコミット
 */

const kafka = new Kafka({
  clientId: 'check-offset-demo',
  brokers: ['localhost:19092'],
});

const consumer = kafka.consumer({
  groupId: 'offset-check-group',
});

async function run() {
  try {
    await consumer.connect();
    console.log('\n========================================');
    console.log('Offset確認デモ');
    console.log('========================================\n');
    console.log('Consumer Group: offset-check-group');
    console.log('Topic: learn-topic\n');
    console.log('5件読んで停止します...\n');

    await consumer.subscribe({ topic: 'learn-topic', fromBeginning: true });

    let count = 0;
    await consumer.run({
      eachMessage: async ({ message }) => {
        count++;
        console.log(`[${count}] Offset ${message.offset}: ${message.value?.toString()}`);

        if (count >= 5) {
          console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('5件読んだので停止します');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log('Offsetがコミットされました。');
          console.log('Consumer Group "offset-check-group" は次回 Offset 5 から読みます。\n');
          console.log('【Kafka UIで確認】');
          console.log('1. http://localhost:8080 を開く');
          console.log('2. 左メニューから "Consumers" をクリック');
          console.log('3. "offset-check-group" を探す');
          console.log('4. グループ名をクリック');
          console.log('5. "Offset" 列を確認\n');

          // Offsetがコミットされるまで少し待つ
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await consumer.disconnect();
          process.exit(0);
        }
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
