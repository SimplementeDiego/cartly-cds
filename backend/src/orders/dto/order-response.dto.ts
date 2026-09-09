import { ApiProperty } from '@nestjs/swagger';

export class OrderItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ example: 'Auriculares inalámbricos' })
  productName!: string;

  @ApiProperty({ minimum: 1, maximum: 99 })
  quantity!: number;

  @ApiProperty({ description: 'Unit price in the currency minimum unit', example: 2599 })
  unitPriceCents!: number;

  @ApiProperty({ description: 'Line total in the currency minimum unit', example: 5198 })
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
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['PAID'], example: 'PAID' })
  status!: 'PAID';

  @ApiProperty({ minLength: 3, maxLength: 3, example: 'usd' })
  currency!: string;

  @ApiProperty({ description: 'Order total in the currency minimum unit', example: 5198 })
  totalCents!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: () => OrderItemResponseDto, isArray: true })
  items!: OrderItemResponseDto[];
}
