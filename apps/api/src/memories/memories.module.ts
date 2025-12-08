import { Module, forwardRef } from '@nestjs/common';
import { MemoriesService } from './memories.service';
import { MemoriesController } from './memories.controller';
import { MemoirModule } from '../memoir/memoir.module';

@Module({
  imports: [forwardRef(() => MemoirModule)],
  providers: [MemoriesService],
  controllers: [MemoriesController],
  exports: [MemoriesService],
})
export class MemoriesModule {}
