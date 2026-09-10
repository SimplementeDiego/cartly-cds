import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class AuthUserResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'email', example: 'customer@example.com' })
  email!: string;

  @ApiProperty({ type: String, nullable: true, example: 'Lucía Pérez' })
  displayName!: string | null;

  @ApiProperty({ type: String, enum: Role })
  role!: Role;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty({ type: () => AuthUserResponseDto })
  user!: AuthUserResponseDto;
}

export class CurrentSessionUserResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'email', example: 'customer@example.com' })
  email!: string;

  @ApiProperty({ type: String, nullable: true, example: 'Lucía Pérez' })
  displayName!: string | null;

  @ApiProperty({ type: String, enum: Role })
  role!: Role;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class CurrentSessionResponseDto {
  @ApiProperty({ type: () => CurrentSessionUserResponseDto })
  user!: CurrentSessionUserResponseDto;
}
