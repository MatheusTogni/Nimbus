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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser, EDITOR_ROLES, Roles } from '../common/decorators';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';
import { CategoriesService } from './categories.service';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List categories with their risk count' })
  list(@CurrentUser() user: AuthUser) {
    return this.categories.list(user);
  }

  @Post()
  @Roles(...EDITOR_ROLES)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCategoryDto) {
    return this.categories.create(user, dto);
  }

  @Patch(':id')
  @Roles(...EDITOR_ROLES)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(...EDITOR_ROLES)
  @ApiOperation({
    summary: 'Delete a category (its risks become uncategorized)',
  })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.categories.remove(user, id);
  }
}
