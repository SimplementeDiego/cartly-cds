import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { apiErrorResponse, ApiSessionAuth } from '../common/decorators/api-session-auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request';
import { OrderResponseDto } from './dto/order-response.dto';
import { SetOrderItemRatingDto } from './dto/set-order-item-rating.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiSessionAuth()
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
  @ApiParam({ name: 'id', format: 'uuid', description: 'Order identifier' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse(apiErrorResponse('The order ID is not a UUID'))
  @ApiNotFoundResponse(apiErrorResponse('Order not found for this customer'))
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) orderId: string) {
    return this.ordersService.get(user.id, orderId);
  }

  @Put(':orderId/items/:itemId/rating')
  @ApiOperation({
    summary: 'Create or replace the authenticated customer rating for a purchased item',
  })
  @ApiParam({ name: 'orderId', format: 'uuid', description: 'Order identifier' })
  @ApiParam({ name: 'itemId', format: 'uuid', description: 'Order item identifier' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse(apiErrorResponse('The identifiers or rating payload failed validation'))
  @ApiNotFoundResponse(apiErrorResponse('Order item not found in an order owned by this customer'))
  setItemRating(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: SetOrderItemRatingDto,
  ) {
    return this.ordersService.setItemRating(user.id, orderId, itemId, dto);
  }
}
