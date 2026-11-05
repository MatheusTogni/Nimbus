import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { RiskStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';
import { RISK_LEVELS, type RiskLevel } from '../risk-level';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Integer rating from 1 to 5 (accepts numeric strings from query params). */
const Rating = () =>
  applyDecorators(
    Type(() => Number),
    IsInt(),
    Min(1),
    Max(5),
  );

export class CreateRiskDto {
  @ApiProperty({ example: 'Queda de energia no prédio' })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional({ example: 'O prédio não possui gerador próprio.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  ownerId?: string | null;

  @ApiProperty({
    minimum: 1,
    maximum: 5,
    description: '1 = rare, 5 = almost certain',
  })
  @Rating()
  probability!: number;

  @ApiProperty({
    minimum: 1,
    maximum: 5,
    description: '1 = negligible, 5 = catastrophic',
  })
  @Rating()
  impact!: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Rating()
  residualProbability?: number | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Rating()
  residualImpact?: number | null;

  @ApiPropertyOptional({ enum: RiskStatus })
  @IsOptional()
  @IsEnum(RiskStatus)
  status?: RiskStatus;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Date)
  @IsDate()
  reviewDate?: Date | null;
}

export class UpdateRiskDto extends PartialType(CreateRiskDto) {}

export const RISK_SORT_FIELDS = [
  'code',
  'title',
  'score',
  'residualScore',
  'status',
  'reviewDate',
  'createdAt',
  'updatedAt',
] as const;

export class RiskQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Searches code, title and description' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: RISK_LEVELS })
  @IsOptional()
  @IsIn(RISK_LEVELS)
  level?: RiskLevel;

  @ApiPropertyOptional({ enum: RiskStatus })
  @IsOptional()
  @IsEnum(RiskStatus)
  status?: RiskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Rating()
  probability?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Rating()
  impact?: number;

  @ApiPropertyOptional({ enum: RISK_SORT_FIELDS, default: 'score' })
  @IsOptional()
  @IsIn(RISK_SORT_FIELDS)
  sort: (typeof RISK_SORT_FIELDS)[number] = 'score';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
