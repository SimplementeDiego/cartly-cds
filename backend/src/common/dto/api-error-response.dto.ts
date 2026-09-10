import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ type: 'integer', example: 400 })
  statusCode!: number;

  @ApiProperty({ type: String, example: 'Bad Request' })
  error!: string;

  @ApiProperty({
    description: 'Human-readable error or validation errors',
    oneOf: [
      { type: 'string', example: 'The request could not be processed' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['quantity must not be less than 1'],
      },
    ],
  })
  message!: string | string[];

  @ApiProperty({ type: String, example: '/api/cart/items' })
  path!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  timestamp!: string;
}
