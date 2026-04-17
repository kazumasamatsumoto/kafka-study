import { Kafka } from 'kafkajs';

/**
 * Offsetリセット時にoldestから取得する実装パターン
 *
 * 実行方法:
 * npm run learn:offset-reset-flow
 */

const kafka = new Kafka({
  clientId: 'offset-reset-flow',
  brokers: ['localhost:19092'],
});

/**
 * パターン1: fromBeginningで初回のみ最初から読む
 *
 * 動作:
 * - Consumer Groupが初めてTopicを読む → 最初から
 * - 2回目以降 → 前回の続きから
 */
async function pattern1_fromBeginning() {
  const consumer = kafka.consumer({
    groupId: 'pattern1-group',
  });

  try {
    await consumer.connect();
    console.log('\n========================================');
    console.log('パターン1: fromBeginning');
    console.log('========================================\n');

    await consumer.subscribe({
      topic: 'learn-topic',
      fromBeginning: true, // 初回のみ最初から、2回目以降は続きから
    });

    console.log('fromBeginning: true で起動');
    console.log('→ 初回: Offset 0から読む');
    console.log('→ 2回目以降: 前回の続きから読む\n');

    let count = 0;
    await consumer.run({
      eachMessage: async ({ partition, message }) => {
        count++;
        console.log(`[${count}] Offset ${message.offset}: ${message.value?.toString()}`);

        if (count >= 5) {
          console.log('\n5件読んだので停止します');
          console.log('もう一度実行すると、Offset 5から読みます');
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

/**
 * パターン2: Consumer Group削除で完全リセット
 *
 * 動作:
 * - Consumer Groupを削除 → 次回は必ず最初から
 */
async function pattern2_deleteGroup() {
  const admin = kafka.admin();
  const groupId = 'pattern2-group';

  try {
    await admin.connect();
    console.log('\n========================================');
    console.log('パターン2: Consumer Group削除');
    console.log('========================================\n');

    // Consumer Groupを削除
    try {
      await admin.deleteGroups([groupId]);
      console.log(`✓ Consumer Group "${groupId}" を削除しました`);
    } catch (error: any) {
      // エラーコード69: COORDINATOR_NOT_AVAILABLE（Groupが存在しない）
      // エラーコード15: GROUP_ID_NOT_FOUND（Groupが見つからない）
      if (error.groups && error.groups[0]?.errorCode === 69) {
        console.log(`Consumer Group "${groupId}" は存在しません（問題なし）`);
      } else if (error.groups && error.groups[0]?.errorCode === 15) {
        console.log(`Consumer Group "${groupId}" は存在しません（問題なし）`);
      } else if (error.message && (error.message.includes('does not exist') || error.message.includes('not found'))) {
        console.log(`Consumer Group "${groupId}" は存在しません（問題なし）`);
      } else {
        throw error;
      }
    }

    console.log('\n次にこのgroupIdでConsumerを起動すると、最初から読みます。');
    console.log('これが最も確実にリセットする方法です。');

    await admin.disconnect();
  } catch (error) {
    console.error('エラー:', error);
    await admin.disconnect();
  }
}

/**
 * パターン3: Admin APIで特定Offsetにリセット
 *
 * 動作:
 * - 任意のOffset位置を指定できる
 */
async function pattern3_setOffset() {
  const admin = kafka.admin();
  const groupId = 'pattern3-group';
  const topic = 'learn-topic';

  try {
    await admin.connect();
    console.log('\n========================================');
    console.log('パターン3: Admin APIでOffset指定');
    console.log('========================================\n');

    // 現在のOffsetを確認
    console.log('--- 現在のOffset ---');
    try {
      const offsets = await admin.fetchOffsets({ groupId, topics: [topic] });
      console.log(JSON.stringify(offsets, null, 2));
    } catch (error) {
      console.log('Offsetが存在しません（初回）');
    }

    // Offsetを0（最初）にセット
    console.log('\n--- Offsetを0にリセット ---');
    await admin.setOffsets({
      groupId,
      topic,
      partitions: [
        {
          partition: 0,
          offset: '0', // 最初から
        },
      ],
    });
    console.log('✓ Offset 0にセットしました');

    // リセット後のOffsetを確認
    console.log('\n--- リセット後のOffset ---');
    const resetOffsets = await admin.fetchOffsets({ groupId, topics: [topic] });
    console.log(JSON.stringify(resetOffsets, null, 2));

    console.log('\n次にConsumerを起動すると、Offset 0から読みます。');

    await admin.disconnect();
  } catch (error) {
    console.error('エラー:', error);
    await admin.disconnect();
  }
}

/**
 * パターン4: Consumer起動時に毎回最初から読む（強制リセット）
 *
 * 動作:
 * - 起動のたびにConsumer Groupを削除して最初から読む
 * - 開発・デバッグ用
 */
async function pattern4_alwaysFromBeginning() {
  const admin = kafka.admin();
  const groupId = `always-reset-${Date.now()}`; // 毎回新しいgroupId

  try {
    console.log('\n========================================');
    console.log('パターン4: 毎回最初から読む');
    console.log('========================================\n');

    console.log('方法1: 毎回新しいgroupIdを使う');
    console.log(`→ groupId: ${groupId}\n`);

    const consumer = kafka.consumer({ groupId });
    await consumer.connect();

    await consumer.subscribe({
      topic: 'learn-topic',
      fromBeginning: true,
    });

    console.log('このConsumerは毎回最初から読みます');
    console.log('（groupIdが毎回異なるため）\n');

    let count = 0;
    await consumer.run({
      eachMessage: async ({ partition, message }) => {
        count++;
        console.log(`[${count}] Offset ${message.offset}: ${message.value?.toString()}`);

        if (count >= 5) {
          console.log('\n5件読んだので停止します');
          await consumer.disconnect();
          process.exit(0);
        }
      },
    });
  } catch (error) {
    console.error('エラー:', error);
  }
}

// コマンドライン引数で選択
const pattern = process.argv[2] || '1';

console.log('Offsetリセット時にoldestから取得する方法\n');

switch (pattern) {
  case '1':
    console.log('実行: パターン1 - fromBeginning（初回のみ）');
    pattern1_fromBeginning();
    break;
  case '2':
    console.log('実行: パターン2 - Consumer Group削除');
    pattern2_deleteGroup();
    break;
  case '3':
    console.log('実行: パターン3 - Admin APIでOffset指定');
    pattern3_setOffset();
    break;
  case '4':
    console.log('実行: パターン4 - 毎回最初から');
    pattern4_alwaysFromBeginning();
    break;
  default:
    console.log('使い方: npm run learn:offset-reset-flow -- [1|2|3|4]');
    console.log('  1: fromBeginning（初回のみ最初から）');
    console.log('  2: Consumer Group削除（完全リセット）');
    console.log('  3: Admin APIでOffset指定');
    console.log('  4: 毎回最初から読む');
}
