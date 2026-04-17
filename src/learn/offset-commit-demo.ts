import { Kafka } from 'kafkajs';

/**
 * Offsetコミットの仕組みを学習するスクリプト
 *
 * 実行方法:
 * 1. npm run learn:offset-commit -- setup           # メッセージ準備
 * 2. npm run learn:offset-commit -- auto            # 自動コミット
 * 3. npm run learn:offset-commit -- manual          # 手動コミット
 * 4. npm run learn:offset-commit -- check-offset    # Offset確認
 * 5. npm run learn:offset-commit -- stop-middle     # 途中で止める
 * 6. npm run learn:offset-commit -- reset-offset    # Offsetリセット
 */

const kafka = new Kafka({
  clientId: 'offset-commit-demo',
  brokers: ['localhost:19092'],
});

const topic = 'demo-topic';
const groupId = 'demo-group';

// ========================================
// セットアップ: 20件のメッセージを送信
// ========================================
async function setup() {
  const admin = kafka.admin();
  const producer = kafka.producer();

  try {
    await admin.connect();
    await producer.connect();

    console.log('\n========================================');
    console.log('セットアップ: 20件のメッセージを送信');
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

    // Consumer Group削除（クリーンスタート）
    try {
      await admin.deleteGroups([groupId]);
      console.log(`✓ Consumer Group "${groupId}" を削除\n`);
    } catch (error) {
      // グループが存在しない場合は無視
    }

    // 20件のメッセージ送信
    console.log('20件のメッセージを送信中...\n');
    for (let i = 0; i < 20; i++) {
      await producer.send({
        topic,
        messages: [
          {
            key: `key-${i}`,
            value: JSON.stringify({
              id: i,
              message: `メッセージ ${i}`,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      });
      console.log(`  ✓ [${i}] 送信完了`);
    }

    console.log('\n✅ セットアップ完了\n');
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await admin.disconnect();
    await producer.disconnect();
  }
}

// ========================================
// パターン1: 自動コミット（デフォルト）
// ========================================
async function autoCommit() {
  const consumer = kafka.consumer({
    groupId,
    // autoCommit: true はデフォルト（省略可）
  });

  try {
    await consumer.connect();

    console.log('\n========================================');
    console.log('パターン1: 自動コミット');
    console.log('========================================\n');
    console.log('設定:');
    console.log('  autoCommit: true (デフォルト)');
    console.log('  → Kafkaが自動的にOffsetをコミット\n');

    await consumer.subscribe({ topic, fromBeginning: true });

    let count = 0;
    await consumer.run({
      eachMessage: async ({ partition, message }) => {
        count++;
        const value = JSON.parse(message.value?.toString() || '{}');

        console.log(
          `[${count}] Offset ${message.offset}: ${value.message}`
        );

        // 5件読んだら停止
        if (count >= 5) {
          console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('5件読んだので停止します');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log('【重要】自動コミットの動作:');
          console.log('  - Offset 0-4 を読んだ');
          console.log('  - 次回起動時は Offset 5 から読む');
          console.log('  - Kafkaが自動的にコミットした\n');
          console.log('確認: npm run learn:offset-commit -- check-offset\n');

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

// ========================================
// パターン2: 手動コミット
// ========================================
async function manualCommit() {
  const consumer = kafka.consumer({
    groupId: 'manual-commit-group', // 別のグループ
    // 手動コミットを有効化
    // KafkaJSではデフォルトで自動コミットなので、
    // 手動でコミットしたい場合は eachMessage内で明示的に行う
  });

  try {
    await consumer.connect();

    console.log('\n========================================');
    console.log('パターン2: 手動コミット');
    console.log('========================================\n');
    console.log('設定:');
    console.log('  手動でOffsetをコミット');
    console.log('  → 処理が成功した時だけコミット\n');

    await consumer.subscribe({ topic, fromBeginning: true });

    let count = 0;
    await consumer.run({
      // eachBatchを使うと手動コミットが簡単
      eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
        for (const message of batch.messages) {
          count++;
          const value = JSON.parse(message.value?.toString() || '{}');

          console.log(
            `[${count}] Offset ${message.offset}: ${value.message}`
          );

          // ★ メッセージ処理が成功したらOffsetをコミット
          await resolveOffset(message.offset);
          console.log(`  → Offset ${message.offset} をコミット`);

          // ハートビートを送信（Consumer Groupに生存を通知）
          await heartbeat();

          // 5件読んだら停止
          if (count >= 5) {
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('5件読んだので停止します');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            console.log('【重要】手動コミットの動作:');
            console.log('  - Offset 0-4 を読んだ');
            console.log('  - 各Offsetを明示的にコミットした');
            console.log('  - 処理失敗時はコミットしないこともできる\n');

            await consumer.disconnect();
            process.exit(0);
          }
        }
      },
    });
  } catch (error) {
    console.error('エラー:', error);
    await consumer.disconnect();
  }
}

// ========================================
// Offset確認
// ========================================
async function checkOffset() {
  const admin = kafka.admin();

  try {
    await admin.connect();

    console.log('\n========================================');
    console.log('現在のOffset確認');
    console.log('========================================\n');

    // Consumer Groupのリスト取得
    const groups = await admin.listGroups();
    const relevantGroups = groups.groups.filter(
      (g) =>
        g.groupId === groupId || g.groupId === 'manual-commit-group'
    );

    console.log('Consumer Group一覧:');
    relevantGroups.forEach((g) => {
      console.log(`  - ${g.groupId} (${g.protocolType})`);
    });

    console.log('\n');

    // 各グループのOffset情報を取得
    for (const group of relevantGroups) {
      try {
        const offsets = await admin.fetchOffsets({
          groupId: group.groupId,
          topics: [topic],
        });

        console.log(`Consumer Group: ${group.groupId}`);
        console.log('─────────────────────────────────');

        if (offsets.length === 0) {
          console.log('  Offsetなし（まだ読んでいない）\n');
          continue;
        }

        offsets.forEach((topicOffsets) => {
          console.log(`  Topic: ${topicOffsets.topic}`);
          topicOffsets.partitions.forEach((p) => {
            console.log(
              `    Partition ${p.partition}: Offset ${p.offset}`
            );
            console.log(
              `    → 次回は Offset ${p.offset} から読み始める`
            );
          });
        });
        console.log('');
      } catch (error: any) {
        console.log(
          `  ${group.groupId}: ${error.message}\n`
        );
      }
    }

    // トピックの最新Offset情報を取得
    const topicOffsets = await admin.fetchTopicOffsets(topic);
    console.log('トピックのOffset情報:');
    console.log('─────────────────────────────────');
    topicOffsets.forEach((p) => {
      console.log(`  Partition ${p.partition}:`);
      console.log(`    Low: ${p.low} (最古のOffset)`);
      console.log(`    High: ${p.high} (最新のOffset)`);
    });
    console.log('');
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await admin.disconnect();
  }
}

// ========================================
// 途中で止めるデモ
// ========================================
async function stopMiddle() {
  const consumer = kafka.consumer({
    groupId: 'stop-middle-group',
  });

  try {
    await consumer.connect();

    console.log('\n========================================');
    console.log('途中で止めるデモ');
    console.log('========================================\n');
    console.log('3秒後に強制終了します\n');

    await consumer.subscribe({ topic, fromBeginning: true });

    let count = 0;
    await consumer.run({
      eachMessage: async ({ message }) => {
        count++;
        const value = JSON.parse(message.value?.toString() || '{}');
        console.log(
          `[${count}] Offset ${message.offset}: ${value.message}`
        );
      },
    });

    // 3秒後に強制終了
    setTimeout(async () => {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('強制終了します');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('【重要】途中で止めた場合:');
      console.log('  - 自動コミットは定期的に実行される');
      console.log('  - 最後に処理したOffsetが保存される');
      console.log('  - 次回起動時はそこから再開\n');
      console.log('確認: npm run learn:offset-commit -- check-offset\n');

      await consumer.disconnect();
      process.exit(0);
    }, 3000);
  } catch (error) {
    console.error('エラー:', error);
    await consumer.disconnect();
  }
}

// ========================================
// Offsetリセット
// ========================================
async function resetOffset() {
  const admin = kafka.admin();

  try {
    await admin.connect();

    console.log('\n========================================');
    console.log('Offsetリセット');
    console.log('========================================\n');

    // 現在のOffset確認
    console.log('【現在のOffset】');
    const currentOffsets = await admin.fetchOffsets({
      groupId,
      topics: [topic],
    });

    currentOffsets.forEach((topicOffsets) => {
      topicOffsets.partitions.forEach((p) => {
        console.log(
          `  Partition ${p.partition}: Offset ${p.offset}`
        );
      });
    });

    // Offsetを0にリセット
    console.log('\n【Offset 0 にリセット】');
    await admin.setOffsets({
      groupId,
      topic,
      partitions: [{ partition: 0, offset: '0' }],
    });
    console.log('  ✓ Offset 0 にリセット完了\n');

    // リセット後のOffset確認
    console.log('【リセット後のOffset】');
    const resetOffsets = await admin.fetchOffsets({
      groupId,
      topics: [topic],
    });

    resetOffsets.forEach((topicOffsets) => {
      topicOffsets.partitions.forEach((p) => {
        console.log(
          `  Partition ${p.partition}: Offset ${p.offset}`
        );
      });
    });

    console.log('\n次回Consumerを起動すると、Offset 0から読み始めます\n');
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await admin.disconnect();
  }
}

// ========================================
// メイン処理
// ========================================
const mode = process.argv[2] || 'help';

switch (mode) {
  case 'setup':
    setup();
    break;
  case 'auto':
    autoCommit();
    break;
  case 'manual':
    manualCommit();
    break;
  case 'check-offset':
    checkOffset();
    break;
  case 'stop-middle':
    stopMiddle();
    break;
  case 'reset-offset':
    resetOffset();
    break;
  default:
    console.log('\n========================================');
    console.log('Offsetコミットの学習');
    console.log('========================================\n');
    console.log('使い方:\n');
    console.log('1. npm run learn:offset-commit -- setup');
    console.log('   → 20件のメッセージを準備\n');
    console.log('2. npm run learn:offset-commit -- auto');
    console.log('   → 自動コミットのデモ（5件読む）\n');
    console.log('3. npm run learn:offset-commit -- manual');
    console.log('   → 手動コミットのデモ（5件読む）\n');
    console.log('4. npm run learn:offset-commit -- check-offset');
    console.log('   → 現在のOffsetを確認\n');
    console.log('5. npm run learn:offset-commit -- stop-middle');
    console.log('   → 途中で止めるデモ（3秒後に強制終了）\n');
    console.log('6. npm run learn:offset-commit -- reset-offset');
    console.log('   → Offsetを0にリセット\n');
}
