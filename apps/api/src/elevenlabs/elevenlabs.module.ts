import { Module, Global, forwardRef } from '@nestjs/common';
import { ElevenLabsService } from './elevenlabs.service';
import { ElevenLabsController } from './elevenlabs.controller';
import { CallsModule } from '../calls/calls.module';

@Global()
@Module({
  imports: [forwardRef(() => CallsModule)],
  controllers: [ElevenLabsController],
  providers: [ElevenLabsService],
  exports: [ElevenLabsService],
})
export class ElevenLabsModule {}
