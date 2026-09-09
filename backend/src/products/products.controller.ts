import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active products' })
  list(@Query() query: ProductQueryDto) {
    return this.productsService.listPublic(
      query.search,
      query.category,
      query.minPriceCents,
      query.maxPriceCents,
    );
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'List available product categories' })
  categories() {
    return this.productsService.listCategories();
  }

  @Public()
  @Get('best-sellers')
  @ApiOperation({
    summary: 'List five active products ordered by confirmed sales',
    description:
      'Products with paid sales are ordered by units sold and any remaining slots are filled with the established catalogue order. Selection is featured only when none of the returned active products has a paid sale.',
  })
  @ApiOkResponse({
    description: 'Five products when the active catalogue contains at least five entries',
    schema: {
      type: 'object',
      required: ['selection', 'products'],
      properties: {
        selection: { type: 'string', enum: ['best-sellers', 'featured'] },
        products: { type: 'array', maxItems: 5, items: { type: 'object' } },
      },
    },
  })
  bestSellers() {
    return this.productsService.listBestSellers();
  }

  @Public()
  @Get(':id/image')
  @ApiOperation({ summary: 'Stream a product image from private object storage' })
  async image(@Param('id', ParseUUIDPipe) id: string, @Res() response: Response) {
    const image = await this.productsService.getPublicImage(id);
    if (!image.body || typeof image.body.pipe !== 'function') {
      throw new NotFoundException('Product image not found');
    }
    response.setHeader('Content-Type', image.contentType);
    response.setHeader('Cache-Control', 'public, max-age=3600');
    if (image.contentLength !== undefined) response.setHeader('Content-Length', image.contentLength);
    if (image.etag) response.setHeader('ETag', image.etag);
    image.body.pipe(response);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get an active product' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.getPublic(id);
  }
}
