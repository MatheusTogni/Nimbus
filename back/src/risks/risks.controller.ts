import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser, EDITOR_ROLES, Roles } from '../common/decorators';
import { CreateRiskDto, RiskQueryDto, UpdateRiskDto } from './dto/risk.dto';
import { RisksService } from './risks.service';

@ApiTags('risks')
@ApiBearerAuth()
@Controller('risks')
export class RisksController {
  constructor(
    private readonly risks: RisksService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List risks with filters, sorting and pagination' })
  list(@CurrentUser() user: AuthUser, @Query() query: RiskQueryDto) {
    return this.risks.list(user, query);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="nimbus-risks.csv"')
  @ApiOperation({ summary: 'Export the filtered risks as CSV' })
  export(@CurrentUser() user: AuthUser, @Query() query: RiskQueryDto) {
    return this.risks.exportCsv(user, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.risks.findOne(user, id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Audit trail of a risk and its actions/comments' })
  async history(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.risks.assertExists(user, id);
    return this.audit.riskHistory(user, id);
  }

  @Post()
  @Roles(...EDITOR_ROLES)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRiskDto) {
    return this.risks.create(user, dto);
  }

  @Patch(':id')
  @Roles(...EDITOR_ROLES)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRiskDto,
  ) {
    return this.risks.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(...EDITOR_ROLES)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.risks.remove(user, id);
  }
}
