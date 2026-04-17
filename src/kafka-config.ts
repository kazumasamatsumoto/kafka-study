import { Kafka, KafkaConfig } from 'kafkajs';

/**
 * 環境別のKafka設定
 * ローカル: confluentinc/cp-kafka（認証なし）
 * 本番: AWS MSK（IAM認証）
 */

export function createKafkaClient(): Kafka {
  const isProduction = process.env.NODE_ENV === 'production';

  const config: KafkaConfig = {
    clientId: process.env.KAFKA_CLIENT_ID || 'my-app',
    brokers: getBrokers(),

    // 本番環境のみ認証とSSL
    ...(isProduction && getProductionConfig()),
  };

  return new Kafka(config);
}

/**
 * ブローカーアドレスを取得
 */
function getBrokers(): string[] {
  const brokersEnv = process.env.KAFKA_BROKERS;

  if (brokersEnv) {
    return brokersEnv.split(',');
  }

  // デフォルト: ローカル環境
  return ['localhost:9092'];
}

/**
 * 本番環境（AWS MSK）の設定
 */
function getProductionConfig() {
  return {
    ssl: true,
    sasl: {
      mechanism: 'aws' as const,
      authorizationIdentity: process.env.AWS_ROLE_ARN,
    },
  };
}

/**
 * Topic作成時のレプリケーション設定
 */
export function getReplicationFactor(): number {
  return process.env.NODE_ENV === 'production' ? 3 : 1;
}

/**
 * 使用例
 */
export async function createTopic(topicName: string, partitions: number = 1) {
  const kafka = createKafkaClient();
  const admin = kafka.admin();

  try {
    await admin.connect();

    await admin.createTopics({
      topics: [
        {
          topic: topicName,
          numPartitions: partitions,
          replicationFactor: getReplicationFactor(), // 環境で切り替え
        },
      ],
    });

    console.log(`✓ Topic "${topicName}" を作成しました`);
  } catch (error) {
    console.error('Topic作成エラー:', error);
    throw error;
  } finally {
    await admin.disconnect();
  }
}
