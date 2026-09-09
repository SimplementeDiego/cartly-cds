import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// Null clears a field; omitted properties leave stored values unchanged.
const normalizeProfileField = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class UpdateProfileDto {
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 100, example: 'Lucía Pérez' })
  @Transform(normalizeProfileField)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 30, example: '+598 99 123 456' })
  @Transform(normalizeProfileField)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 250, example: 'Av. 18 de Julio 1234' })
  @Transform(normalizeProfileField)
  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 100, example: 'Montevideo' })
  @Transform(normalizeProfileField)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 100, example: 'Uruguay' })
  @Transform(normalizeProfileField)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string | null;
}
