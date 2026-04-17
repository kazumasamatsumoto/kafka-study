import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaController } from './kafka.controller';
import { KafkaService } from './kafka.service';
import { OffsetController } from './offset.controller';
import { OffsetManagerService } from './offset-manager.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'nestjs-kafka-client',
            brokers: ['localhost:9092'],
          },
          consumer: {
            groupId: 'nestjs-consumer-group',
          },
        },
      },
    ]),
  ],
  controllers: [KafkaController, OffsetController],
  providers: [KafkaService, OffsetManagerService],
  exports: ['KAFKA_SERVICE', OffsetManagerService],
})
export class KafkaModule {}
