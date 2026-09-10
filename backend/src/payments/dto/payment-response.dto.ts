import { ApiProperty } from '@nestjs/swagger';
import { CheckoutStatus } from '@prisma/client';

export class CheckoutSessionResponseDto {
  @ApiProperty({ format: 'uri', example: 'https://checkout.stripe.com/c/pay/cs_test_...' })
  url!: string;

  @ApiProperty({ type: String, example: 'cs_test_a1b2c3' })
  sessionId!: string;
}

export class CheckoutStatusResponseDto {
  @ApiProperty({ type: String, example: 'cs_test_a1b2c3' })
  sessionId!: string;

  @ApiProperty({ type: String, enum: CheckoutStatus })
  status!: CheckoutStatus;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  orderId!: string | null;
}

export class WebhookReceivedResponseDto {
  @ApiProperty({ type: Boolean, example: true })
  received!: boolean;
}
