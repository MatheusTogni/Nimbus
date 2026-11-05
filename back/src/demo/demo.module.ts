import { Controller, Get, Module } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators';
import { DemoLimitsService } from './demo-limits.service';
import { DemoService } from './demo.service';

@ApiTags('demo')
@Controller('demo')
export class DemoController {
  constructor(private readonly demo: DemoService) {}

  @Public()
  @Get('info')
  @ApiOperation({
    summary:
      'Demo credentials, limits and next automatic reset (shown on the login page)',
  })
  info() {
    return this.demo.info();
  }
}

@Module({
  controllers: [DemoController],
  providers: [DemoLimitsService, DemoService],
  exports: [DemoLimitsService, DemoService],
})
export class DemoModule {}
