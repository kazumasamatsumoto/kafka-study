import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { OffsetManagerService } from './offset-manager.service';

@Controller('offset')
export class OffsetController {
  constructor(private readonly offsetManager: OffsetManagerService) {}

  /**
   * オフセットをリセット
   * POST /offset/reset
   * Body: { groupId, topic, partition?, offset? }
   */
  @Post('reset')
  async resetOffset(@Body() body: {
    groupId: string;
    topic: string;
    partition?: number;
    offset?: string;
  }) {
    await this.offsetManager.resetOffset(
      body.groupId,
      body.topic,
      body.partition || 0,
      body.offset || '0',
    );

    return {
      success: true,
      message: 'オフセットをリセットしました',
      groupId: body.groupId,
      topic: body.topic,
      partition: body.partition || 0,
      offset: body.offset || '0',
    };
  }

  /**
   * オフセットを最初にリセット
   * POST /offset/reset-to-earliest
   */
  @Post('reset-to-earliest')
  async resetToEarliest(@Body() body: {
    groupId: string;
    topic: string;
    partition?: number;
  }) {
    await this.offsetManager.resetToEarliest(
      body.groupId,
      body.topic,
      body.partition || 0,
    );

    return {
      success: true,
      message: '最初のメッセージからリセットしました',
    };
  }

  /**
   * オフセットを最新にリセット
   * POST /offset/reset-to-latest
   */
  @Post('reset-to-latest')
  async resetToLatest(@Body() body: {
    groupId: string;
    topic: string;
    partition?: number;
  }) {
    await this.offsetManager.resetToLatest(
      body.groupId,
      body.topic,
      body.partition || 0,
    );

    return {
      success: true,
      message: '最新のメッセージにリセットしました',
    };
  }

  /**
   * タイムスタンプを指定してリセット
   * POST /offset/reset-to-timestamp
   */
  @Post('reset-to-timestamp')
  async resetToTimestamp(@Body() body: {
    groupId: string;
    topic: string;
    timestamp: number; // Unix timestamp (ms)
    partition?: number;
  }) {
    await this.offsetManager.resetToTimestamp(
      body.groupId,
      body.topic,
      body.timestamp,
      body.partition || 0,
    );

    return {
      success: true,
      message: '指定したタイムスタンプにリセットしました',
      timestamp: new Date(body.timestamp).toISOString(),
    };
  }

  /**
   * オフセット情報を取得
   * GET /offset?groupId=xxx&topics=topic1,topic2
   */
  @Get()
  async getOffsets(@Query('groupId') groupId: string, @Query('topics') topics: string) {
    const topicList = topics.split(',');
    const offsets = await this.offsetManager.getOffsets(groupId, topicList);

    return {
      success: true,
      groupId,
      offsets,
    };
  }

  /**
   * Consumer Groupの一覧を取得
   * GET /offset/groups
   */
  @Get('groups')
  async listGroups() {
    const groups = await this.offsetManager.listConsumerGroups();

    return {
      success: true,
      groups,
    };
  }

  /**
   * トピックのメタデータを取得
   * GET /offset/topic-metadata?topics=topic1,topic2
   */
  @Get('topic-metadata')
  async getTopicMetadata(@Query('topics') topics: string) {
    const topicList = topics.split(',');
    const metadata = await this.offsetManager.getTopicMetadata(topicList);

    return {
      success: true,
      metadata,
    };
  }
}
