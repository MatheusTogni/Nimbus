import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateActionDto {
  @ApiProperty({ example: 'Instalar gerador a diesel' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  description!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  assigneeId?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Date)
  @IsDate()
  dueDate?: Date | null;
}

export class UpdateActionDto extends PartialType(CreateActionDto) {
  @ApiPropertyOptional({ description: 'Marks the action as done / not done' })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
