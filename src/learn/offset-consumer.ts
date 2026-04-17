import { Kafka } from 'kafkajs';

/**
 * Offset学習用のConsumer
 *
 * 実行方法:
 * npm run learn:offset -- beginning    // 最初から読む
 * npm run learn:offset -- latest       // 最新のみ読む（デフォルト）
 * npm run learn:offset -- 5            // Offset 5から読む
 *
 * このスクリプトでOffsetの動作を理解できます。
 */

const kafka = new Kafka({
  clientId: 'learn-offset',
  brokers: ['localhost:19092'],
});

const mode = process.argv[2] || 'latest';

const consumer = kafka.consumer({
  groupId: `offset-learn-${mode}-${Date.now()}`, // 毎回新しいグループIDで実行
});

async function run() {
  try {
    await consumer.connect();
    console.log('\n========================================');
    console.log(`Offset Consumer起動`);
    console.log(`モード: ${mode}`);
    console.log('========================================\n');

    const topic = 'learn-topic';

    // モードに応じた設定
    if (mode === 'beginning') {
      // 最初から読む
      await consumer.subscribe({
        topic,
        fromBeginning: true,
      });
      console.log('→ Offset 0から読み始めます\n');
    } else if (mode === 'latest') {
      // 最新のみ読む（これから送られるメッセージのみ）
      await consumer.subscribe({
        topic,
        fromBeginning: false,
      });
      console.log('→ 最新のメッセージのみ読みます');
      console.log('→ 新しいメッセージが来るまで待機...\n');
    } else {
      // 特定のOffsetから読む
      const targetOffset = parseInt(mode, 10);
      await consumer.subscribe({
        topic,
        fromBeginning: false,
      });

      // 特定のOffsetを設定
      consumer.on('consumer.group_join', async ({ payload }) => {
        const { memberAssignment } = payload;
        const assignments = Object.entries(memberAssignment)[0];
        if (assignments) {
          const [, partitions] = assignments as [string, number[]];
          for (const partition of partitions) {
            await consumer.seek({
              topic,
              partition,
              offset: targetOffset.toString(),
            });
          }
        }
      });

      console.log(`→ Offset ${targetOffset}から読み始めます\n`);
    }

    let count = 0;

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        count++;
        const value = message.value?.toString();

        console.log(`\n[${count}件目] 受信:`);
        console.log(`  Offset: ${message.offset}`);
        console.log(`  Partition: ${partition}`);
        console.log(`  Value: ${value}`);

        // 最大10件で自動停止
        if (mode === 'beginning' && count >= 10) {
          console.log('\n--- 10件受信したので停止します ---');
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
