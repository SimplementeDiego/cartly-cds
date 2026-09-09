import { Prisma } from '@prisma/client';

// Keep seed data self-contained: production images copy `prisma/` but not the
// TypeScript application sources. Demo names only need Unicode diacritic
// removal; runtime writes use the broader domain normalizer.
const normalizeSeedProductName = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/\p{Mark}+/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

const categoryId = (suffix: number) =>
  `20000000-0000-4000-8000-${String(suffix).padStart(12, '0')}`;
const productId = (suffix: number) =>
  `10000000-0000-4000-8000-${String(suffix).padStart(12, '0')}`;

export const GENERAL_CATEGORY_ID = categoryId(1);

interface CatalogProductDefinition {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  categoryId: string;
  isActive: boolean;
  seedImageFile?: string;
}

export const catalogCategories = [
  { id: GENERAL_CATEGORY_ID, name: 'General', slug: 'general' },
  { id: categoryId(2), name: 'Tecnología', slug: 'tecnologia' },
  { id: categoryId(3), name: 'Hogar', slug: 'hogar' },
  { id: categoryId(4), name: 'Moda y accesorios', slug: 'moda' },
  { id: categoryId(5), name: 'Deporte y aire libre', slug: 'deporte' },
  { id: categoryId(6), name: 'Oficina', slug: 'oficina' },
  { id: categoryId(7), name: 'Cocina', slug: 'cocina' },
] satisfies Prisma.CategoryCreateManyInput[];

// Stable IDs and insert-only upserts preserve changes made from Administration.
const catalogProductDefinitions: CatalogProductDefinition[] = [
  {
    id: productId(1),
    name: 'Auriculares inalámbricos',
    description: 'Auriculares cómodos con cancelación de ruido y autonomía para todo el día.',
    priceCents: 8999,
    categoryId: categoryId(2),
    isActive: true,
  },
  {
    id: productId(2),
    name: 'Teclado mecánico compacto',
    description: 'Teclado 75% con switches táctiles, iluminación regulable y conexión USB-C.',
    priceCents: 10990,
    categoryId: categoryId(2),
    isActive: true,
  },
  {
    id: productId(3),
    name: 'Soporte de aluminio',
    description: 'Soporte ergonómico y regulable para notebooks de hasta 16 pulgadas.',
    priceCents: 4590,
    categoryId: categoryId(6),
    isActive: true,
  },
  {
    id: productId(4),
    name: 'Producto archivado',
    description: 'Producto inactivo utilizado para verificar el filtrado del catálogo.',
    priceCents: 1999,
    categoryId: GENERAL_CATEGORY_ID,
    isActive: false,
  },
  {
    id: 'b15f41dc-14f6-4459-b9c2-0c995839c9e2',
    name: 'Una maqueta',
    description: 'Una maqueta',
    priceCents: 10000,
    categoryId: GENERAL_CATEGORY_ID,
    isActive: true,
    seedImageFile: 'una-maqueta.png',
  },
  {
    id: productId(5),
    name: 'Parlante portátil Bluetooth',
    description: 'Sonido claro en un formato compacto, con resistencia a salpicaduras y hasta 12 horas de música.',
    priceCents: 5990,
    categoryId: categoryId(2),
    isActive: true,
  },
  {
    id: productId(6),
    name: 'Batería portátil USB-C',
    description: 'Batería externa de 10.000 mAh con carga rápida y dos puertos para acompañarte durante el día.',
    priceCents: 3490,
    categoryId: categoryId(2),
    isActive: true,
  },
  {
    id: productId(7),
    name: 'Manta de algodón tejida',
    description: 'Manta suave de 130 × 170 cm, ideal para el sofá o para sumar una capa ligera a la cama.',
    priceCents: 4290,
    categoryId: categoryId(3),
    isActive: true,
  },
  {
    id: productId(8),
    name: 'Almohadón de lino',
    description: 'Almohadón de 45 × 45 cm con funda desmontable de textura natural y relleno incluido.',
    priceCents: 2490,
    categoryId: categoryId(3),
    isActive: true,
  },
  {
    id: productId(9),
    name: 'Florero de cerámica',
    description: 'Florero de cerámica con acabado mate y silueta orgánica, para flores frescas o ramas secas.',
    priceCents: 2890,
    categoryId: categoryId(3),
    isActive: true,
  },
  {
    id: productId(10),
    name: 'Canasto organizador',
    description: 'Canasto de fibras trenzadas con asas, práctico para guardar mantas, revistas y objetos cotidianos.',
    priceCents: 3290,
    categoryId: categoryId(3),
    isActive: true,
  },
  {
    id: productId(11),
    name: 'Mochila urbana',
    description: 'Mochila de 20 litros con compartimento acolchado para notebook, bolsillos internos y tela repelente al agua.',
    priceCents: 6490,
    categoryId: categoryId(4),
    isActive: true,
  },
  {
    id: productId(12),
    name: 'Billetera compacta',
    description: 'Billetera de perfil delgado con seis espacios para tarjetas y compartimento para billetes.',
    priceCents: 2790,
    categoryId: categoryId(4),
    isActive: true,
  },
  {
    id: productId(13),
    name: 'Lentes de sol clásicos',
    description: 'Lentes de sol con marco liviano, protección UV400 y estuche de tela para llevar todos los días.',
    priceCents: 3990,
    categoryId: categoryId(4),
    isActive: true,
  },
  {
    id: productId(14),
    name: 'Gorra de algodón',
    description: 'Gorra de seis paneles con visera curva, bordado discreto y cierre ajustable.',
    priceCents: 1890,
    categoryId: categoryId(4),
    isActive: true,
  },
  {
    id: productId(15),
    name: 'Mat de yoga antideslizante',
    description: 'Mat de 6 mm de espesor para yoga y estiramientos, con superficie antideslizante y correa de transporte.',
    priceCents: 3690,
    categoryId: categoryId(5),
    isActive: true,
  },
  {
    id: productId(16),
    name: 'Botella térmica de acero',
    description: 'Botella de 750 ml con doble pared de acero inoxidable y tapa hermética para tus salidas y entrenamientos.',
    priceCents: 2990,
    categoryId: categoryId(5),
    isActive: true,
  },
  {
    id: productId(17),
    name: 'Set de bandas de resistencia',
    description: 'Cinco bandas de distintas resistencias para entrenamiento funcional, con bolsa para guardarlas.',
    priceCents: 2290,
    categoryId: categoryId(5),
    isActive: true,
  },
  {
    id: productId(18),
    name: 'Mochila de senderismo',
    description: 'Mochila ligera de 30 litros con espalda ventilada, correas ajustables y cubierta para lluvia.',
    priceCents: 7990,
    categoryId: categoryId(5),
    isActive: true,
  },
  {
    id: productId(19),
    name: 'Cuaderno de tapa dura',
    description: 'Cuaderno A5 con 192 páginas punteadas, cinta señaladora y cierre elástico para tus ideas y apuntes.',
    priceCents: 1590,
    categoryId: categoryId(6),
    isActive: true,
  },
  {
    id: productId(20),
    name: 'Organizador de escritorio',
    description: 'Organizador de bambú con divisiones para lápices, tarjetas y accesorios pequeños de escritorio.',
    priceCents: 2690,
    categoryId: categoryId(6),
    isActive: true,
  },
  {
    id: productId(21),
    name: 'Lámpara de escritorio LED',
    description: 'Lámpara de brazo regulable con tres temperaturas de luz y control de intensidad para trabajar con comodidad.',
    priceCents: 4990,
    categoryId: categoryId(6),
    isActive: true,
  },
  {
    id: productId(22),
    name: 'Sartén antiadherente',
    description: 'Sartén de 24 cm con recubrimiento antiadherente y mango ergonómico, apta para todo tipo de cocinas.',
    priceCents: 4490,
    categoryId: categoryId(7),
    isActive: true,
  },
  {
    id: productId(23),
    name: 'Cuchillo de chef',
    description: 'Cuchillo de cocina de 20 cm con hoja de acero inoxidable y mango equilibrado para cortes precisos.',
    priceCents: 3890,
    categoryId: categoryId(7),
    isActive: true,
  },
  {
    id: productId(24),
    name: 'Cafetera de prensa francesa',
    description: 'Prensa francesa de 600 ml con jarra de vidrio resistente al calor y filtro reutilizable de acero.',
    priceCents: 3290,
    categoryId: categoryId(7),
    isActive: true,
  },
  {
    id: productId(25),
    name: 'Set de tablas de bambú',
    description: 'Tres tablas de diferentes tamaños para cortar y servir, con bordes redondeados y acabado natural.',
    priceCents: 2790,
    categoryId: categoryId(7),
    isActive: true,
  },
];

const seedImageKey = (productIdValue: string, fileName: string) => {
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return `products/${productIdValue}/seed${extension}`;
};

export const catalogProductImages = catalogProductDefinitions.flatMap((product) =>
  product.seedImageFile
    ? [{
        productId: product.id,
        fileName: product.seedImageFile,
        objectKey: seedImageKey(product.id, product.seedImageFile),
      }]
    : [],
);

export const catalogProducts = catalogProductDefinitions.map(({ seedImageFile, ...product }) => ({
  ...product,
  searchName: normalizeSeedProductName(product.name),
  ...(seedImageFile ? { imageKey: seedImageKey(product.id, seedImageFile) } : {}),
})) satisfies Prisma.ProductCreateManyInput[];
