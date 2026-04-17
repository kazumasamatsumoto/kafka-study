import { Injectable } from '@nestjs/common';

@Injectable()
export class KafkaService {
  // ここにKafka関連のビジネスロジックを実装

  processMessage(message: any) {
    console.log('Processing message:', message);
    // メッセージ処理ロジック
  }
}
