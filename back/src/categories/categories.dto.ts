import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Infraestrutura' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name!: string;

  @ApiPropertyOptional({ example: '#0ea5e9' })
  @IsOptional()
  @IsHexColor()
  color?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
