import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Response } from 'express';
import {
  apiErrorResponse,
  ApiAdminSessionAuth,
} from '../common/decorators/api-session-auth.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductResponseDto, SalesOverviewResponseDto } from './dto/product-response.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('admin products')
@ApiAdminSessionAuth()
@Roles(Role.ADMIN)
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products visible in administration' })
  @ApiOkResponse({ type: ProductResponseDto, isArray: true })
  @ApiBadRequestResponse(apiErrorResponse('The catalogue filters failed validation'))
  list(@Query() query: ProductQueryDto) {
    return this.productsService.listAdmin(query.search, query.category);
  }

  @Get('sales-overview')
  @ApiOperation({ summary: 'Get confirmed sales totals' })
  @ApiOkResponse({ type: SalesOverviewResponseDto })
  salesOverview() {
    return this.productsService.getSalesOverview();
  }

  @Get(':id/image')
  @ApiOperation({ summary: 'Stream a product image for administration' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Product identifier' })
  @ApiOkResponse({
    description: 'JPEG, PNG, or WebP image bytes',
    content: {
      'image/jpeg': { schema: { type: 'string', format: 'binary' } },
      'image/png': { schema: { type: 'string', format: 'binary' } },
      'image/webp': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiBadRequestResponse(apiErrorResponse('The product ID is not a UUID'))
  @ApiNotFoundResponse(apiErrorResponse('The product or its image was not found'))
  async image(@Param('id', ParseUUIDPipe) id: string, @Res() response: Response) {
    const image = await this.productsService.getAdminImage(id);
    if (!image.body || typeof image.body.pipe !== 'function') {
      throw new NotFoundException('Product image not found');
    }
    response.setHeader('Content-Type', image.contentType);
    response.setHeader('Cache-Control', 'private, max-age=3600');
    if (image.contentLength !== undefined)
      response.setHeader('Content-Length', image.contentLength);
    if (image.etag) response.setHeader('ETag', image.etag);
    image.body.pipe(response);
  }

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  @ApiCreatedResponse({ type: ProductResponseDto })
  @ApiBadRequestResponse(apiErrorResponse('The product payload or category is invalid'))
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product fields' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Product identifier' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiBadRequestResponse(apiErrorResponse('The product ID, payload, or category is invalid'))
  @ApiNotFoundResponse(apiErrorResponse('The product was not found'))
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate a product' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Product identifier' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiBadRequestResponse(apiErrorResponse('The product ID or status payload is invalid'))
  @ApiNotFoundResponse(apiErrorResponse('The product was not found'))
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductStatusDto) {
    return this.productsService.updateStatus(id, dto.isActive);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a product from the catalogue and administration' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Product identifier' })
  @ApiNoContentResponse({ description: 'Product removed' })
  @ApiBadRequestResponse(apiErrorResponse('The product ID is not a UUID'))
  @ApiNotFoundResponse(apiErrorResponse('The product was not found'))
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.productsService.remove(id);
  }

  @Post(':id/image')
  @ApiOperation({ summary: 'Upload or replace a product image' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Product identifier' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: ProductResponseDto })
  @ApiBadRequestResponse(
    apiErrorResponse('The product ID or image file is missing, malformed, or unsupported'),
  )
  @ApiNotFoundResponse(apiErrorResponse('The product was not found'))
  @ApiPayloadTooLargeResponse(apiErrorResponse('The image exceeds the configured size limit'))
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file?: Express.Multer.File) {
    return this.productsService.uploadImage(id, file);
  }
}
