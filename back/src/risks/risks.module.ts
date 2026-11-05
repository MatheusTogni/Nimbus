import { Module } from '@nestjs/common';
import { ActionsController } from '../actions/actions.controller';
import { ActionsService } from '../actions/actions.service';
import { CommentsController } from '../comments/comments.controller';
import { CommentsService } from '../comments/comments.service';
import { DemoModule } from '../demo/demo.module';
import { RisksController } from './risks.controller';
import { RisksService } from './risks.service';

/** Risks plus their nested resources (actions and comments). */
@Module({
  imports: [DemoModule],
  controllers: [RisksController, ActionsController, CommentsController],
  providers: [RisksService, ActionsService, CommentsService],
})
export class RisksModule {}
