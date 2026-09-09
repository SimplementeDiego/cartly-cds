import { Prisma, PrismaClient } from "@prisma/client";

const PRODUCT_PREFIX = "Producto E2E ";
const PRODUCT_NAME_PATTERN = /^Producto E2E \d+-[0-9a-f]{8}( editado)?$/;

const databaseUrl = () => {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  // Compose builds its own DATABASE_URL. Prefer the same POSTGRES_* settings
  // here so a changed published port is not shadowed by an old host URL.
  const hasComposeSettings = ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB', 'POSTGRES_PORT']
    .some((key) => Boolean(process.env[key]));
  if (!hasComposeSettings && process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const user = encodeURIComponent(process.env.POSTGRES_USER || "cartly");
  const password = encodeURIComponent(
    process.env.POSTGRES_PASSWORD || "cartly_dev_password",
  );
  const database = encodeURIComponent(process.env.POSTGRES_DB || "cartly");
  const port = process.env.POSTGRES_PORT || "5432";
  return `postgresql://${user}:${password}@127.0.0.1:${port}/${database}?schema=public`;
};

const connectionUrl = databaseUrl();
const prisma = new PrismaClient({
  datasources: { db: { url: connectionUrl } },
});

async function findFixtures(where: Prisma.ProductWhereInput) {
  try {
    return await prisma.product.findMany({ where, select: fixtureSelection });
  } catch (error) {
    const code = error instanceof Prisma.PrismaClientInitializationError
      ? error.errorCode
      : error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
    if (code !== 'P1000' && code !== 'P1001') throw error;
    // Print only host/port, never credentials or the raw connection string.
    const endpoint = new URL(connectionUrl);
    throw new Error(
      `No se pudo conectar la limpieza E2E a PostgreSQL (${endpoint.hostname}:${endpoint.port || '5432'}). ` +
      'Revisá POSTGRES_USER, POSTGRES_PASSWORD y POSTGRES_PORT en .env. ' +
      'Si definiste E2E_DATABASE_URL, tiene prioridad y debe apuntar a la misma base que usa la aplicación evaluada.',
    );
  }
}

type ProductFixture = {
  id: string;
  name: string;
  imageKey: string | null;
  _count: { checkoutItems: number };
};

async function removeProducts(products: ProductFixture[]) {
  if (!products.length) return;

  const invalidFixture = products.find(
    (product) =>
      !PRODUCT_NAME_PATTERN.test(product.name) ||
      product.imageKey !== null ||
      product._count.checkoutItems > 0,
  );
  if (invalidFixture) {
    throw new Error(
      `Refusing to remove non-disposable E2E product ${invalidFixture.id}`,
    );
  }

  const ids = products.map((product) => product.id);
  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { productId: { in: ids } } }),
    prisma.product.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

const fixtureSelection = {
  id: true,
  name: true,
  imageKey: true,
  _count: { select: { checkoutItems: true } },
} as const;

export async function purgeStaleAdminProductFixtures() {
  const candidates = await findFixtures({ name: { startsWith: PRODUCT_PREFIX } });
  await removeProducts(
    candidates.filter((product) => PRODUCT_NAME_PATTERN.test(product.name)),
  );
}

export async function removeAdminProductFixture(
  id: string | undefined,
  marker: string,
) {
  const candidates = await findFixtures({
    OR: [...(id ? [{ id }] : []), { name: { contains: marker } }],
  });

  const fixtures = candidates.filter(
    (product) =>
      product.name.includes(marker) && PRODUCT_NAME_PATTERN.test(product.name),
  );
  await removeProducts(fixtures);
}

export async function disconnectE2EDatabase() {
  await prisma.$disconnect();
}
