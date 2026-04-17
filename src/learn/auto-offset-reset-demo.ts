import { Kafka } from 'kafkajs';

/**
 * auto.offset.reset のデモ
 *
 * 重要: KafkaJSには auto.offset.reset の直接設定がありません。
 * 代わりに fromBeginning で制御します。
 *
 * しかし、これは「初回のみ」の動作です。
 * Offsetが無効になった場合の動作は、Kafka Broker側の設定に依存します。
 */

const kafka = new Kafka({
  clientId: 'auto-offset-reset-demo',
  brokers: ['localhost:19092'],
});

/**
 * シナリオ: メッセージが削除された場合
 *
 * 1. Offset 0-9 のメッセージがある
 * 2. Consumer が Offset 3 まで読んだ
 * 3. 保持期間切れで Offset 0-5 が削除される
 * 4. Consumer が再起動
 * 5. Offset 3 は存在しない（無効）
 * 6. どうなる？
 */
async function demonstrateInvalidOffset() {
  console.log('\n========================================');
  console.log('Offsetが無効になった場合の動作');
  console.log('========================================\n');

  console.log('【シナリオ】');
  console.log('1. メッセージ: Offset 0-9');
  console.log('2. Consumerが Offset 5 まで読んだ');
  console.log('3. Offset 0-2 が削除された（保持期間切れ）');
  console.log('4. Consumerの保存済みOffset (5) は有効');
  console.log('   → Offset 5 から続きを読む（正常）\n');

  console.log('【問題のシナリオ】');
  console.log('1. メッセージ: Offset 0-9');
  console.log('2. Consumerが Offset 3 まで読んだ');
  console.log('3. Offset 0-5 が削除された');
  console.log('4. Consumerの保存済みOffset (3) は無効');
  console.log('   → どうする？\n');

  console.log('【Kafkaの設定: auto.offset.reset】');
  console.log('earliest (oldest):');
  console.log('  → 現在残っている最古のメッセージ（Offset 6）から読む');
  console.log('latest:');
  console.log('  → 最新のメッセージから読む（6-9を読まない）\n');

  console.log('【KafkaJSでの制限】');
  console.log('❌ auto.offset.reset を直接設定できない');
  console.log('✅ fromBeginning で初回の動作を制御');
  console.log('⚠️  Offset無効時の動作は、Broker側の設定に依存\n');
}

/**
 * KafkaJSでの回避策
 */
async function workaroundInKafkaJS() {
  console.log('\n========================================');
  console.log('KafkaJSでの回避策');
  console.log('========================================\n');

  console.log('方法1: fromBeginning: true（推奨）');
  console.log('--------------------------------------');
  console.log('const consumer = kafka.consumer({ groupId: "my-group" });');
  console.log('await consumer.subscribe({');
  console.log('  topic: "my-topic",');
  console.log('  fromBeginning: true,  // 初回は最初から');
  console.log('});\n');
  console.log('動作:');
  console.log('  - 初回: 最古のメッセージから読む');
  console.log('  - 2回目以降: 保存されたOffsetから読む');
  console.log('  - Offset無効時: Broker設定に依存（通常はlatest）\n');

  console.log('方法2: Consumer Group削除後に再起動');
  console.log('--------------------------------------');
  console.log('// Admin APIでConsumer Groupを削除');
  console.log('await admin.deleteGroups(["my-group"]);\n');
  console.log('// Consumerを起動（fromBeginning: true）');
  console.log('// → 確実に最古から読む\n');

  console.log('方法3: エラーハンドリング + 手動リセット');
  console.log('--------------------------------------');
  console.log('consumer.on(consumer.events.CRASH, async (event) => {');
  console.log('  // Offsetエラーを検知');
  console.log('  if (isOffsetError(event.payload.error)) {');
  console.log('    // Consumer Groupを削除して再起動');
  console.log('    await resetAndRestart();');
  console.log('  }');
  console.log('});\n');

  console.log('方法4: Kafkaクライアント設定（低レベル）');
  console.log('--------------------------------------');
  console.log('KafkaJSでは現在サポートされていません。');
  console.log('将来のバージョンで追加される可能性があります。\n');
}

/**
 * 実際の実装例
 */
async function practicalExample() {
  console.log('\n========================================');
  console.log('実際の実装例');
  console.log('========================================\n');

  const consumer = kafka.consumer({
    groupId: 'practical-demo',
  });

  try {
    await consumer.connect();
    console.log('Consumer接続完了\n');

    // fromBeginning: true で初回は確実に最古から
    await consumer.subscribe({
      topic: 'learn-topic',
      fromBeginning: true,
    });

    console.log('設定:');
    console.log('  topic: test-topic');
    console.log('  fromBeginning: true');
    console.log('  groupId: practical-demo\n');

    console.log('動作:');
    console.log('  - 初回実行: 現在残っている最古のメッセージから読む');
    console.log('  - 2回目以降: 前回の続きから読む\n');

    let count = 0;
    await consumer.run({
      eachMessage: async ({ partition, message }) => {
        count++;
        console.log(`[${count}] Offset ${message.offset}: ${message.value?.toString()}`);

        if (count >= 5) {
          console.log('\n5件読んだので停止');
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
const mode = process.argv[2] || 'explain';

switch (mode) {
  case 'explain':
    demonstrateInvalidOffset();
    workaroundInKafkaJS();
    break;
  case 'run':
    practicalExample();
    break;
  default:
    console.log('使い方:');
    console.log('  npm run learn:auto-offset -- explain  # 説明を表示');
    console.log('  npm run learn:auto-offset -- run      # 実際に動かす');
}
