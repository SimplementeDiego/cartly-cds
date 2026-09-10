import { ApiProperty } from '@nestjs/swagger';
import { CategoryResponseDto } from '../../products/dto/product-response.dto';

export class CartProductResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, example: 'Auriculares inalámbricos' })
  name!: string;

  @ApiProperty({ type: String })
  description!: string;

  @ApiProperty({ type: 'integer', example: 2599 })
  priceCents!: number;

  @ApiProperty({ type: String, format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ type: () => CategoryResponseDto })
  category!: CategoryResponseDto;

  @ApiProperty({ type: Boolean })
  isActive!: boolean;

  @ApiProperty({ type: String, nullable: true })
  imageUrl!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class CartItemResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  productId!: string;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: 99 })
  quantity!: number;

  @ApiProperty({ type: 'integer', minimum: 0, example: 5198 })
  lineTotalCents!: number;

  @ApiProperty({ type: () => CartProductResponseDto })
  product!: CartProductResponseDto;
}

export class CartResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: () => CartItemResponseDto, isArray: true })
  items!: CartItemResponseDto[];

  @ApiProperty({ type: 'integer', minimum: 0, example: 5198 })
  subtotalCents!: number;

  @ApiProperty({ type: 'integer', minimum: 0, example: 5198 })
  totalCents!: number;

  @ApiProperty({ type: String, minLength: 3, maxLength: 3, example: 'usd' })
  currency!: string;
}
