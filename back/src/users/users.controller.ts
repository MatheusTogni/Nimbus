import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser, DemoForbidden, Roles } from '../common/decorators';
import {
  ChangePasswordDto,
  CreateUserDto,
  UpdateProfileDto,
  UpdateUserDto,
} from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List the users of my organization (admin)' })
  list(@CurrentUser() user: AuthUser) {
    return this.users.list(user);
  }

  @Get('options')
  @ApiOperation({ summary: 'Active users for owner/assignee pickers' })
  options(@CurrentUser() user: AuthUser) {
    return this.users.options(user);
  }

  @Post()
  @Roles(Role.ADMIN)
  @DemoForbidden()
  @ApiOperation({ summary: 'Invite a user to my organization (admin)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(user, dto);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update my name, language and theme' })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user, dto);
  }

  @Post('me/password')
  @HttpCode(204)
  @DemoForbidden()
  @ApiOperation({ summary: 'Change my password' })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.users.changePassword(user, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @DemoForbidden()
  @ApiOperation({
    summary: 'Change name, role, status or password of a user (admin)',
  })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(user, id, dto);
  }
}
