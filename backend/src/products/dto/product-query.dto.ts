import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const MAX_PRICE_CENTS = 10_000_000;

const toOptionalNumber = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  return Number(value);
};

export class ProductQueryDto {
  @ApiPropertyOptional({
    description: 'Case- and accent-insensitive product name search',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Category slug, combined with the name search', example: 'tecnologia' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  category?: string;

  @ApiPropertyOptional({
    description: 'Minimum price in the smallest currency unit (inclusive)',
    example: 1000,
    minimum: 0,
    maximum: MAX_PRICE_CENTS,
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_CENTS)
  minPriceCents?: number;

  @ApiPropertyOptional({
    description: 'Maximum price in the smallest currency unit (inclusive)',
    example: 5000,
    minimum: 0,
    maximum: MAX_PRICE_CENTS,
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_CENTS)
  maxPriceCents?: number;
}
