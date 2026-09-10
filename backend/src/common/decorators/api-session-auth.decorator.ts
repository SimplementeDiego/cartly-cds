import { applyDecorators } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiResponseNoStatusOptions,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../dto/api-error-response.dto';

export const apiErrorResponse = (description: string): ApiResponseNoStatusOptions => ({
  description,
  type: ApiErrorResponseDto,
});

export function ApiSessionAuth() {
  return applyDecorators(
    ApiCookieAuth('session'),
    ApiUnauthorizedResponse(apiErrorResponse('The session cookie is missing, invalid, or expired')),
  );
}

export function ApiAdminSessionAuth() {
  return applyDecorators(
    ApiSessionAuth(),
    ApiForbiddenResponse(apiErrorResponse('The authenticated user is not an administrator')),
  );
}
