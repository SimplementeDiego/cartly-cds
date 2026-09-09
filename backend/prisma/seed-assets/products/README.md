# Imágenes de productos del seed

Esta carpeta contiene únicamente imágenes de demostración que deben estar disponibles en una instalación nueva.

Cada archivo se declara mediante `seedImageFile` en `prisma/catalog-data.ts`. Al ejecutar el seed, el archivo se sube al bucket S3/MinIO con una clave determinística y se asocia al producto correspondiente.

Las imágenes que un administrador carga durante el uso normal continúan viviendo solamente en el almacenamiento de objetos y nunca son sobrescritas por el seed.
