import { Kafka } from 'kafkajs';

/**
 * Offsetリセット時の動作確認スクリプト
 *
 * 実行手順:
 * 1. npm run learn:offset-reset-test -- setup    # メッセージ送信
 * 2. npm run learn:offset-reset-test -- read5    # 5件読む
 * 3. npm run learn:offset-reset-test -- delete   # Consumer Group削除
 * 4. npm run learn:offset-reset-test -- read-default  # デフォルト設定で読む
 * 5. npm run learn:offset-reset-test -- read-beginning # fromBeginning: true で読む
 */

const kafka = new Kafka({
  clientId: 'offset-reset-test',
  brokers: ['localhost:19092'],
});

const topic = 'test-topic';
const groupId = 'test-group';

// Step 1: テスト用メッセージを送信
async function setup() {
  const admin = kafka.admin();
  const producer = kafka.producer();

  try {
    await admin.connect();
    await producer.connect();

    console.log('\n========================================');
    console.log('Step 1: セットアップ');
    console.log('========================================\n');

    // トピック削除（クリーンスタート）
    try {
      await admin.deleteTopics({ topics: [topic] });
      console.log(`✓ 既存の ${topic} を削除`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      // トピックが存在しない場合は無視
    }

    // トピック作成
    await admin.createTopics({
      topics: [{ topic, numPartitions: 1, replicationFactor: 1 }],
    });
    console.log(`✓ ${topic} を作成`);

    // メッセージ送信
    console.log('\n10件のメッセージを送信...\n');
    for (let i = 0; i < 10; i++) {
      await producer.send({
        topic,
        messages: [{ key: `key-${i}`, value: `メッセージ ${i}` }],
      });
      console.log(`  [${i}] 送信完了`);
    }

    console.log('\n✅ セットアップ完了');
    console.log('次のコマンドを実行: npm run learn:offset-reset-test -- read5\n');
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await admin.disconnect();
    await producer.disconnect();
  }
}

// Step 2: 5件だけ読む（Offset 0-4）
async function read5() {
  const consumer = kafka.consumer({ groupId });

  try {
    await consumer.connect();

    console.log('\n========================================');
    console.log('Step 2: 5件読む（Offset 0-4）');
    console.log('========================================\n');

    await consumer.subscribe({ topic, fromBeginning: true });

    let count = 0;
    await consumer.run({
      eachMessage: async ({ message }) => {
        console.log(`✓ Offset ${message.offset}: ${message.value?.toString()}`);
        count++;

        if (count >= 5) {
          console.log('\n5件読んだので停止します');
          console.log(`Consumer Group "${groupId}" の Offset は 5 に保存されました`);
          console.log('\n次のコマンドを実行: npm run learn:offset-reset-test -- delete\n');
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

// Step 3: Consumer Groupを削除
async function deleteGroup() {
  const admin = kafka.admin();

  try {
    await admin.connect();

    console.log('\n========================================');
    console.log('Step 3: Consumer Group削除');
    console.log('========================================\n');

    await admin.deleteGroups([groupId]);
    console.log(`✓ Consumer Group "${groupId}" を削除しました`);
    console.log('→ Offsetがリセットされました\n');

    console.log('トピックの状態:');
    console.log('  test-topic: [0][1][2][3][4][5][6][7][8][9]');
    console.log('              ↑                   ↑');
    console.log('            読んだ               未読\n');

    console.log('次の2つのパターンを試してください:\n');
    console.log('【パターンA】デフォルト設定（fromBeginning: false）');
    console.log('  npm run learn:offset-reset-test -- read-default\n');
    console.log('【パターンB】fromBeginning: true');
    console.log('  npm run learn:offset-reset-test -- read-beginning\n');
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await admin.disconnect();
  }
}

// Step 4A: デフォルト設定で読む（fromBeginning: false）
async function readDefault() {
  const consumer = kafka.consumer({ groupId });

  try {
    await consumer.connect();

    console.log('\n========================================');
    console.log('Step 4A: デフォルト設定で読む');
    console.log('========================================\n');
    console.log('設定: fromBeginning: false (デフォルト)\n');

    await consumer.subscribe({
      topic,
      fromBeginning: false, // ← デフォルト設定
    });

    console.log('メッセージを待機中...');
    console.log('（10秒経過したら自動停止します）\n');

    let count = 0;
    const timeout = setTimeout(async () => {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('結果: メッセージを受信しませんでした');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('理由:');
      console.log('  fromBeginning: false のため、');
      console.log('  「新たにきたメッセージ」のみを待機します。');
      console.log('  既存のメッセージ [0]～[9] は読みません。\n');
      console.log('これが「Offsetリセット時にデータロス」の状態です。\n');
      await consumer.disconnect();
      process.exit(0);
    }, 10000);

    await consumer.run({
      eachMessage: async ({ message }) => {
        clearTimeout(timeout);
        count++;
        console.log(`✓ Offset ${message.offset}: ${message.value?.toString()}`);
      },
    });
  } catch (error) {
    console.error('エラー:', error);
    await consumer.disconnect();
  }
}

// Step 4B: fromBeginning: true で読む
async function readBeginning() {
  const consumer = kafka.consumer({ groupId });

  try {
    await consumer.connect();

    console.log('\n========================================');
    console.log('Step 4B: fromBeginning: true で読む');
    console.log('========================================\n');
    console.log('設定: fromBeginning: true\n');

    await consumer.subscribe({
      topic,
      fromBeginning: true, // ← これで最初から読む
    });

    let count = 0;
    await consumer.run({
      eachMessage: async ({ message }) => {
        count++;
        console.log(`✓ Offset ${message.offset}: ${message.value?.toString()}`);

        if (count >= 10) {
          console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('結果: 全10件のメッセージを読みました');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log('fromBeginning: true により、');
          console.log('Offset 0から全メッセージを読み取りました。\n');
          console.log('これが「Offsetリセット時にデータロスを防ぐ」方法です。\n');
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

// メイン処理
const mode = process.argv[2] || 'help';

switch (mode) {
  case 'setup':
    setup();
    break;
  case 'read5':
    read5();
    break;
  case 'delete':
    deleteGroup();
    break;
  case 'read-default':
    readDefault();
    break;
  case 'read-beginning':
    readBeginning();
    break;
  default:
    console.log('\n========================================');
    console.log('Offsetリセット時の動作確認');
    console.log('========================================\n');
    console.log('使い方（順番に実行してください）:\n');
    console.log('1. npm run learn:offset-reset-test -- setup');
    console.log('   → 10件のメッセージを送信\n');
    console.log('2. npm run learn:offset-reset-test -- read5');
    console.log('   → 5件だけ読む（Offset 0-4）\n');
    console.log('3. npm run learn:offset-reset-test -- delete');
    console.log('   → Consumer Groupを削除（Offsetリセット）\n');
    console.log('4A. npm run learn:offset-reset-test -- read-default');
    console.log('    → デフォルト設定で読む（新しいメッセージを待機）\n');
    console.log('4B. npm run learn:offset-reset-test -- read-beginning');
    console.log('    → fromBeginning: true で読む（全メッセージ読む）\n');
}
