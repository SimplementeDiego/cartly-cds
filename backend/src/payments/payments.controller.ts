import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedRequest, AuthenticatedUser } from '../common/interfaces/authenticated-request';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly paymentsService: PaymentsService) {}

  @ApiCookieAuth('session')
  @Post('checkout')
  @ApiOperation({ summary: 'Reprice the cart and create a Stripe Checkout Session' })
  checkout(@CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.createCheckout(user.id);
  }

  @ApiCookieAuth('session')
  @Get('checkout/:sessionId/status')
  @ApiOperation({ summary: 'Get the authenticated customer checkout status' })
  checkoutStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ) {
    return this.paymentsService.getCheckoutStatus(user.id, sessionId);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('webhook')
  @ApiOperation({ summary: 'Receive signed Stripe webhook events' })
  webhook(
    @Req() request: AuthenticatedRequest,
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!request.rawBody) {
      throw new Error('Raw request body is unavailable; rawBody must be enabled at bootstrap');
    }
    return this.paymentsService.handleWebhook(request.rawBody, signature);
  }
}
