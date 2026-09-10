import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { apiErrorResponse, ApiSessionAuth } from '../common/decorators/api-session-auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CartResponseDto } from './dto/cart-response.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('cart')
@ApiSessionAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get the authenticated customer cart' })
  @ApiOkResponse({ type: CartResponseDto })
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.get(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add product units to the cart' })
  @ApiCreatedResponse({ type: CartResponseDto })
  @ApiBadRequestResponse(apiErrorResponse('The item payload failed validation or exceeds 99 units'))
  @ApiNotFoundResponse(apiErrorResponse('The active product was not found'))
  add(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddCartItemDto) {
    return this.cartService.add(user.id, dto);
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: 'Replace the quantity of a cart item' })
  @ApiParam({ name: 'productId', format: 'uuid', description: 'Product identifier' })
  @ApiOkResponse({ type: CartResponseDto })
  @ApiBadRequestResponse(apiErrorResponse('The product ID or item payload is invalid'))
  @ApiNotFoundResponse(apiErrorResponse('The active product or cart item was not found'))
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.update(user.id, productId, dto);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove a product from the cart' })
  @ApiParam({ name: 'productId', format: 'uuid', description: 'Product identifier' })
  @ApiOkResponse({ type: CartResponseDto })
  @ApiBadRequestResponse(apiErrorResponse('The product ID is not a UUID'))
  @ApiNotFoundResponse(apiErrorResponse('The cart item was not found'))
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.cartService.remove(user.id, productId);
  }
}
