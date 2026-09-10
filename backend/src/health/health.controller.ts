import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Report API availability' })
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
