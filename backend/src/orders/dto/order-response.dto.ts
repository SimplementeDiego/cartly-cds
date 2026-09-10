import { ApiProperty } from '@nestjs/swagger';

export class OrderItemResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  productId!: string;

  @ApiProperty({ type: String, example: 'Auriculares inalámbricos' })
  productName!: string;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 99 })
  quantity!: number;

  @ApiProperty({ type: 'integer', description: 'Unit price in the currency minimum unit', example: 2599 })
  unitPriceCents!: number;

  @ApiProperty({ type: 'integer', description: 'Line total in the currency minimum unit', example: 5198 })
  totalCents!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    minimum: 1,
    maximum: 5,
    description: 'Authenticated customer rating for this purchased item',
    example: 5,
  })
  rating!: number | null;
}

export class OrderResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, enum: ['PAID'], example: 'PAID' })
  status!: 'PAID';

  @ApiProperty({ type: String, minLength: 3, maxLength: 3, example: 'usd' })
  currency!: string;

  @ApiProperty({ type: 'integer', description: 'Order total in the currency minimum unit', example: 5198 })
  totalCents!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: () => OrderItemResponseDto, isArray: true })
  items!: OrderItemResponseDto[];
}
