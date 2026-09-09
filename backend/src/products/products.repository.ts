import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const productOrder = { createdAt: 'desc' } as const;
const LANDING_PRODUCT_LIMIT = 5;

type NumericAggregate = bigint | number;

interface SalesTotalsRow {
  totalUnitsSold: NumericAggregate;
  totalOrders: NumericAggregate;
  totalRevenueCents: NumericAggregate;
}

export interface ProductRatingSummaryRow {
  productId: string;
  ratingAverage: number;
  ratingCount: number;
}

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPublic(
    search?: string,
    category?: string,
    minPriceCents?: number,
    maxPriceCents?: number,
  ) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(search ? { searchName: { contains: search } } : {}),
        ...(category ? { category: { slug: category } } : {}),
        ...(minPriceCents !== undefined || maxPriceCents !== undefined
          ? {
              priceCents: {
                ...(minPriceCents !== undefined ? { gte: minPriceCents } : {}),
                ...(maxPriceCents !== undefined ? { lte: maxPriceCents } : {}),
              },
            }
          : {}),
      },
      include: { category: true },
      orderBy: productOrder,
    });
  }

  findBestSellers() {
    return this.prisma.$transaction(
      async (transaction) => {
        // Ranking active products also keeps unsold catalogue entries so the landing
        // always fills its five slots when at least five active products exist.
        const ranking = await transaction.$queryRaw<
          Array<{ productId: string; unitsSold: NumericAggregate }>
        >`
          SELECT
            product.id AS "productId",
            COALESCE(sales.units_sold, 0)::bigint AS "unitsSold"
          FROM products AS product
          LEFT JOIN (
            SELECT item.product_id, SUM(item.quantity)::bigint AS units_sold
            FROM order_items AS item
            INNER JOIN orders AS purchase ON purchase.id = item.order_id
            INNER JOIN checkout_sessions AS checkout
              ON checkout.id = purchase.checkout_session_id
            WHERE checkout.status = 'PAID'
            GROUP BY item.product_id
          ) AS sales ON sales.product_id = product.id
          WHERE product.is_active = TRUE
            AND product.deleted_at IS NULL
          ORDER BY
            COALESCE(sales.units_sold, 0) DESC,
            product.created_at ASC,
            product.id ASC
          LIMIT ${LANDING_PRODUCT_LIMIT}
        `;

        const productIds = ranking.map(({ productId }) => productId);
        const products = await transaction.product.findMany({
          where: { id: { in: productIds }, isActive: true, deletedAt: null },
          include: { category: true },
        });
        const hasSales = ranking.some(({ unitsSold }) => Number(unitsSold) > 0);

        return {
          selection: hasSales ? ('best-sellers' as const) : ('featured' as const),
          products: products.sort(
            (a, b) => productIds.indexOf(a.id) - productIds.indexOf(b.id),
          ),
        };
      },
      // Keep ranking and product retrieval on the same snapshot during admin edits.
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async getSalesOverview() {
    const [totals] = await this.prisma.$queryRaw<SalesTotalsRow[]>`
      WITH paid_orders AS (
        SELECT purchase.id, purchase.total_cents
        FROM orders AS purchase
        INNER JOIN checkout_sessions AS checkout
          ON checkout.id = purchase.checkout_session_id
        WHERE checkout.status = 'PAID'
      )
      SELECT
        COALESCE((
          SELECT SUM(item.quantity)
          FROM order_items AS item
          INNER JOIN paid_orders ON paid_orders.id = item.order_id
        ), 0)::bigint AS "totalUnitsSold",
        (SELECT COUNT(*) FROM paid_orders)::bigint AS "totalOrders",
        COALESCE((SELECT SUM(total_cents) FROM paid_orders), 0)::bigint
          AS "totalRevenueCents"
    `;

    return totals;
  }

  findAll(search?: string, category?: string) {
    return this.prisma.product.findMany({
      where: {
        deletedAt: null,
        ...(search ? { searchName: { contains: search } } : {}),
        ...(category ? { category: { slug: category } } : {}),
      },
      include: { category: true },
      orderBy: productOrder,
    });
  }

  findRatingSummaries(productIds: string[]) {
    if (productIds.length === 0) return Promise.resolve([] as ProductRatingSummaryRow[]);

    return this.prisma.$queryRaw<ProductRatingSummaryRow[]>`
      SELECT
        item.product_id AS "productId",
        AVG(item.rating)::double precision AS "ratingAverage",
        COUNT(item.rating)::integer AS "ratingCount"
      FROM order_items AS item
      WHERE item.product_id = ANY(
        ARRAY[${Prisma.join(productIds)}]::uuid[]
      )
        AND item.rating IS NOT NULL
      GROUP BY item.product_id
    `;
  }

  findPublicById(id: string) {
    return this.prisma.product.findFirst({
      where: { id, isActive: true, deletedAt: null },
      include: { category: true },
    });
  }

  findById(id: string) {
    return this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: { category: true },
    });
  }

  findCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  findCategoryById(id: string) {
    return this.prisma.category.findUnique({ where: { id } });
  }

  create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data, include: { category: true } });
  }

  update(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({ where: { id }, data, include: { category: true } });
  }

  softDelete(id: string, deletedAt: Date) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.cartItem.deleteMany({ where: { productId: id } });
      return transaction.product.update({
        where: { id },
        data: { deletedAt, isActive: false, imageKey: null },
        include: { category: true },
      });
    });
  }
}
