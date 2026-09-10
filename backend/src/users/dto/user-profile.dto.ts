import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserProfileDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'email', example: 'customer@example.com' })
  email!: string;

  @ApiProperty({ type: String, enum: Role })
  role!: Role;

  @ApiProperty({ type: String, nullable: true })
  displayName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty({ type: String, nullable: true })
  address!: string | null;

  @ApiProperty({ type: String, nullable: true })
  city!: string | null;

  @ApiProperty({ type: String, nullable: true })
  country!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
