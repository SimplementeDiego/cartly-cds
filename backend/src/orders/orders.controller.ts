import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request';
import { OrderResponseDto } from './dto/order-response.dto';
import { SetOrderItemRatingDto } from './dto/set-order-item-rating.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiCookieAuth('session')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders owned by the authenticated customer' })
  @ApiOkResponse({ type: OrderResponseDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order owned by the authenticated customer' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found for this customer' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.ordersService.get(user.id, orderId);
  }

  @Put(':orderId/items/:itemId/rating')
  @ApiOperation({
    summary: 'Create or replace the authenticated customer rating for a purchased item',
  })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({ description: 'Rating is not an integer between 1 and 5' })
  @ApiNotFoundResponse({
    description: 'Order item not found in an order owned by this customer',
  })
  setItemRating(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: SetOrderItemRatingDto,
  ) {
    return this.ordersService.setItemRating(user.id, orderId, itemId, dto);
  }
}
