import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { apiErrorResponse, ApiSessionAuth } from '../common/decorators/api-session-auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiSessionAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiOkResponse({ type: UserProfileDto })
  @ApiNotFoundResponse(apiErrorResponse('The authenticated user no longer exists'))
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update personal information for the authenticated user' })
  @ApiOkResponse({ type: UserProfileDto })
  @ApiBadRequestResponse(apiErrorResponse('The profile payload failed validation'))
  @ApiNotFoundResponse(apiErrorResponse('The authenticated user no longer exists'))
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() input: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, input);
  }
}
