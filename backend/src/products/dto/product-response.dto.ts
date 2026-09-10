import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, example: 'Tecnología' })
  name!: string;

  @ApiProperty({ type: String, example: 'tecnologia' })
  slug!: string;
}

export class ProductResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, example: 'Auriculares inalámbricos' })
  name!: string;

  @ApiProperty({ type: String, example: 'Auriculares con cancelación activa de ruido.' })
  description!: string;

  @ApiProperty({
    type: 'integer',
    description: 'Price in the smallest currency unit',
    example: 2599,
  })
  priceCents!: number;

  @ApiProperty({ type: String, format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ type: () => CategoryResponseDto })
  category!: CategoryResponseDto;

  @ApiProperty({ type: Boolean })
  isActive!: boolean;

  @ApiProperty({ type: Number, nullable: true, minimum: 1, maximum: 5, example: 4.6 })
  ratingAverage!: number | null;

  @ApiProperty({ type: 'integer', minimum: 0, example: 12 })
  ratingCount!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '/api/products/10000000-0000-4000-8000-000000000001/image?v=1750000000000',
  })
  imageUrl!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class SalesOverviewResponseDto {
  @ApiProperty({ type: 'integer', minimum: 0, example: 18 })
  totalUnitsSold!: number;

  @ApiProperty({ type: 'integer', minimum: 0, example: 7 })
  totalOrders!: number;

  @ApiProperty({ type: 'integer', minimum: 0, example: 125970 })
  totalRevenueCents!: number;
}

export class ProductSelectionResponseDto {
  @ApiProperty({ type: String, enum: ['best-sellers', 'featured'], example: 'best-sellers' })
  selection!: 'best-sellers' | 'featured';

  @ApiProperty({ type: () => ProductResponseDto, isArray: true, maxItems: 5 })
  products!: ProductResponseDto[];
}
