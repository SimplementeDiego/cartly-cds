import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { apiErrorResponse, ApiSessionAuth } from '../common/decorators/api-session-auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AUTH_COOKIE_NAME } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request';
import { AuthService } from './auth.service';
import { AuthResponseDto, CurrentSessionResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Create a customer account and start a session' })
  @ApiCreatedResponse({
    description: 'Account created; the response also sets the HttpOnly session cookie',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse(apiErrorResponse('The registration payload failed validation'))
  @ApiConflictResponse(apiErrorResponse('An account already uses the supplied email'))
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const { user, token } = await this.authService.register(dto);
    this.setSessionCookie(response, token);
    return { user };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiOkResponse({
    description: 'Authenticated; the response also sets the HttpOnly session cookie',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse(apiErrorResponse('The login payload failed validation'))
  @ApiUnauthorizedResponse(apiErrorResponse('The email or password is invalid'))
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const { user, token } = await this.authService.login(dto);
    this.setSessionCookie(response, token);
    return { user };
  }

  @ApiSessionAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  @ApiOperation({ summary: 'End the current session' })
  @ApiNoContentResponse({
    description: 'Session ended; the session cookie is cleared',
  })
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(AUTH_COOKIE_NAME, this.cookieOptions());
  }

  @ApiSessionAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get the user stored in the current session' })
  @ApiOkResponse({ type: CurrentSessionResponseDto })
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  private setSessionCookie(response: Response, token: string) {
    response.cookie(AUTH_COOKIE_NAME, token, {
      ...this.cookieOptions(),
      maxAge: this.config.getOrThrow<number>('JWT_COOKIE_MAX_AGE_MS'),
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get<boolean>('COOKIE_SECURE', false),
      sameSite: 'lax' as const,
      path: '/',
    };
  }
}
