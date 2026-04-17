import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class KafkaController {
  @MessagePattern('test-topic')
  async handleTestTopic(@Payload() message: any) {
    console.log('=== Kafkaメッセージを受信 ===');
    console.log('受信データ:', message);
    console.log('');

    // ここでメッセージの処理を行う
    // 例: データベースへの保存、別のサービスへの通知など

    return { processed: true };
  }
}
