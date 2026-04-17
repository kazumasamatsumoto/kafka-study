import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, Admin, Consumer } from 'kafkajs';

/**
 * NestJSでKafkaのオフセットを管理するサービス
 */
@Injectable()
export class OffsetManagerService implements OnModuleInit {
  private kafka: Kafka;
  private admin: Admin;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'nestjs-offset-manager',
      brokers: ['localhost:9092'],
    });
    this.admin = this.kafka.admin();
  }

  async onModuleInit() {
    await this.admin.connect();
    console.log('OffsetManagerService initialized');
  }

  /**
   * 指定されたConsumer Groupのオフセットをリセット
   * @param groupId - Consumer Group ID
   * @param topic - トピック名
   * @param partition - パーティション番号（デフォルト: 0）
   * @param offset - リセット先のオフセット（デフォルト: '0' = 最初から）
   */
  async resetOffset(
    groupId: string,
    topic: string,
    partition: number = 0,
    offset: string = '0',
  ): Promise<void> {
    try {
      console.log(`Resetting offset for group: ${groupId}, topic: ${topic}, partition: ${partition}`);

      await this.admin.setOffsets({
        groupId,
        topic,
        partitions: [{ partition, offset }],
      });

      console.log(`✓ Offset reset to ${offset}`);
    } catch (error) {
      console.error('Failed to reset offset:', error);
      throw error;
    }
  }

  /**
   * Consumer Groupの現在のオフセット情報を取得
   * @param groupId - Consumer Group ID
   * @param topics - トピック名の配列
   */
  async getOffsets(groupId: string, topics: string[]) {
    try {
      const offsets = await this.admin.fetchOffsets({
        groupId,
        topics,
      });
      return offsets;
    } catch (error) {
      console.error('Failed to fetch offsets:', error);
      throw error;
    }
  }

  /**
   * オフセットを最初（earliest）にリセット
   */
  async resetToEarliest(groupId: string, topic: string, partition: number = 0) {
    return this.resetOffset(groupId, topic, partition, '0');
  }

  /**
   * オフセットを最新（latest）にリセット
   * -1を指定すると、次に来る新しいメッセージから読み始める
   */
  async resetToLatest(groupId: string, topic: string, partition: number = 0) {
    return this.resetOffset(groupId, topic, partition, '-1');
  }

  /**
   * 特定のタイムスタンプ以降のメッセージから読み始める
   * @param groupId - Consumer Group ID
   * @param topic - トピック名
   * @param timestamp - Unix timestamp (ミリ秒)
   * @param partition - パーティション番号
   */
  async resetToTimestamp(
    groupId: string,
    topic: string,
    timestamp: number,
    partition: number = 0,
  ) {
    try {
      // タイムスタンプからオフセットを検索
      const offsets = await this.admin.fetchTopicOffsetsByTimestamp(topic, timestamp);

      const targetOffset = offsets.find(o => o.partition === partition);
      if (!targetOffset) {
        throw new Error(`Partition ${partition} not found`);
      }

      await this.resetOffset(groupId, topic, partition, targetOffset.offset);
      console.log(`✓ Reset to timestamp ${new Date(timestamp).toISOString()}, offset: ${targetOffset.offset}`);
    } catch (error) {
      console.error('Failed to reset to timestamp:', error);
      throw error;
    }
  }

  /**
   * Consumer Groupの一覧を取得
   */
  async listConsumerGroups() {
    try {
      const groups = await this.admin.listGroups();
      return groups.groups;
    } catch (error) {
      console.error('Failed to list consumer groups:', error);
      throw error;
    }
  }

  /**
   * トピックの詳細情報を取得
   */
  async getTopicMetadata(topics: string[]) {
    try {
      const metadata = await this.admin.fetchTopicMetadata({ topics });
      return metadata;
    } catch (error) {
      console.error('Failed to fetch topic metadata:', error);
      throw error;
    }
  }

  /**
   * アプリケーション終了時のクリーンアップ
   */
  async onModuleDestroy() {
    await this.admin.disconnect();
    console.log('OffsetManagerService disconnected');
  }
}
