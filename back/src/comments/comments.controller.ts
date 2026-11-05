import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators';
import { CommentsService } from './comments.service';

export class CreateCommentDto {
  @ApiProperty({ example: 'Orçamento do gerador aprovado pela diretoria.' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body!: string;
}

@ApiTags('risk comments')
@ApiBearerAuth()
@Controller('risks/:riskId/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('riskId', ParseUUIDPipe) riskId: string,
  ) {
    return this.comments.list(user, riskId);
  }

  /** Any role can comment, including viewers. */
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('riskId', ParseUUIDPipe) riskId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.comments.create(user, riskId, dto.body);
  }

  /** The author or an admin can delete a comment. */
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('riskId', ParseUUIDPipe) riskId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.comments.remove(user, riskId, id);
  }
}
