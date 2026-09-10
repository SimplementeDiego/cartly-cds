# Imágenes de productos del seed

Esta carpeta contiene las 25 imágenes de demostración que deben estar disponibles en una instalación nueva: una para cada producto del catálogo inicial. Son fotografías de producto generadas para Cartly, sin marcas, logos ni texto incorporado.

Cada JPEG se declara mediante `seedImageFile` en `prisma/catalog-data.ts`. Al ejecutar el seed, se verifican su firma binaria y tamaño y se compara su SHA-256. Solo si falta o cambió, el archivo se carga al bucket S3/MinIO bajo una clave determinística; PostgreSQL guarda solamente esa referencia.

Las imágenes que un administrador carga durante el uso normal continúan viviendo solamente en el almacenamiento de objetos y nunca son sobrescritas por el seed. Los archivos de esta carpeta sí deben versionarse; los volúmenes de MinIO y PostgreSQL, no.
