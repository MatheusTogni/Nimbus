import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser, EDITOR_ROLES, Roles } from '../common/decorators';
import { CreateActionDto, UpdateActionDto } from './action.dto';
import { ActionsService } from './actions.service';

@ApiTags('risk actions')
@ApiBearerAuth()
@Controller('risks/:riskId/actions')
export class ActionsController {
  constructor(private readonly actions: ActionsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('riskId', ParseUUIDPipe) riskId: string,
  ) {
    return this.actions.list(user, riskId);
  }

  @Post()
  @Roles(...EDITOR_ROLES)
  create(
    @CurrentUser() user: AuthUser,
    @Param('riskId', ParseUUIDPipe) riskId: string,
    @Body() dto: CreateActionDto,
  ) {
    return this.actions.create(user, riskId, dto);
  }

  @Patch(':id')
  @Roles(...EDITOR_ROLES)
  update(
    @CurrentUser() user: AuthUser,
    @Param('riskId', ParseUUIDPipe) riskId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActionDto,
  ) {
    return this.actions.update(user, riskId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(...EDITOR_ROLES)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('riskId', ParseUUIDPipe) riskId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.actions.remove(user, riskId, id);
  }
}
