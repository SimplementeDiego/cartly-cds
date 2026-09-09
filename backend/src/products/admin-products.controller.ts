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
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('admin products')
@ApiCookieAuth('session')
@Roles(Role.ADMIN)
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list(@Query() query: ProductQueryDto) {
    return this.productsService.listAdmin(query.search, query.category);
  }

  @Get('sales-overview')
  @ApiOperation({ summary: 'Get confirmed sales totals' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      required: ['totalUnitsSold', 'totalOrders', 'totalRevenueCents'],
      properties: {
        totalUnitsSold: { type: 'integer', example: 18 },
        totalOrders: { type: 'integer', example: 7 },
        totalRevenueCents: { type: 'integer', example: 125970 },
      },
    },
  })
  salesOverview() {
    return this.productsService.getSalesOverview();
  }

  @Get(':id/image')
  async image(@Param('id', ParseUUIDPipe) id: string, @Res() response: Response) {
    const image = await this.productsService.getAdminImage(id);
    if (!image.body || typeof image.body.pipe !== 'function') {
      throw new NotFoundException('Product image not found');
    }
    response.setHeader('Content-Type', image.contentType);
    response.setHeader('Cache-Control', 'private, max-age=3600');
    if (image.contentLength !== undefined) response.setHeader('Content-Length', image.contentLength);
    if (image.etag) response.setHeader('ETag', image.etag);
    image.body.pipe(response);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.productsService.updateStatus(id, dto.isActive);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a product from the catalogue and administration' })
  @ApiNoContentResponse({ description: 'Product removed' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.productsService.remove(id);
  }

  @Post(':id/image')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.productsService.uploadImage(id, file);
  }
}
