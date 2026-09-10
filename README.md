# Cartly

Cartly es un e-commerce de referencia construido como monolito modular. Incluye catálogo público, autenticación con cookie segura, carrito persistente, administración de productos e imágenes, Stripe Checkout y órdenes inmutables. El foco está puesto en reglas de negocio verificables, límites de autorización claros y una instalación local reproducible.

## Stack

- Frontend: React 19, TypeScript, Vite, Material UI, React Router, TanStack Query, React Hook Form y Zod.
- Backend: Node.js 22 LTS, NestJS, TypeScript, Prisma y PostgreSQL.
- Seguridad: contraseñas Argon2id y JWT en cookie `HttpOnly`.
- Objetos: MinIO privado mediante la API S3 de AWS SDK.
- Pagos: Stripe Checkout en Test Mode y webhook firmado.
- Calidad: Vitest/Supertest y Playwright.
- Desarrollo: Docker Compose.

## Inicio rápido con Docker

Requisitos: Docker con Compose v2. Stripe CLI solo es necesario para completar un pago real de prueba.

1. Crear el archivo local de configuración:

   ```bash
   cp .env.example .env
   ```

   En PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Levantar y construir todos los servicios:

   ```bash
   docker compose up --build
   ```

   En el primer arranque Compose espera a PostgreSQL y MinIO, crea el bucket privado, aplica las migraciones y ejecuta un seed idempotente antes de publicar la aplicación.

3. Abrir los servicios:

   | Servicio | URL |
   | --- | --- |
   | Aplicación | http://localhost:5173 |
   | API | http://localhost:3000/api |
   | Swagger | http://localhost:3000/api/docs |
   | Healthcheck | http://localhost:3000/api/health |
   | Consola de MinIO | http://localhost:9001 |

   La consola de MinIO usa, por defecto, `cartly_minio` / `cartly_minio_password`. Estos valores son solo para desarrollo y pueden cambiarse en `.env`.

4. Iniciar sesión con los usuarios del seed:

   | Rol | Email | Contraseña |
   | --- | --- | --- |
   | `CUSTOMER` | `customer@cartly.local` | `Customer123!` |
   | `ADMIN` | `admin@cartly.local` | `Admin123!` |

El seed crea **25 productos en total: 24 activos y uno archivado**, junto con una imagen propia para cada uno. Hay cuatro productos activos en cada categoría comercial. Las credenciales son únicamente para desarrollo local.

Para ejecutar en segundo plano, ver estado y detener:

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f backend
docker compose down
```

`npm run compose:clean` elimina también los volúmenes de PostgreSQL y MinIO; por lo tanto borra todos los datos locales.

## Configurar Stripe Test Mode

El catálogo, la autenticación y el carrito funcionan sin una cuenta de Stripe, pero la creación de una sesión de checkout requiere claves de prueba válidas.

1. Copiar `sk_test_...` del dashboard de Stripe a `STRIPE_SECRET_KEY` en `.env`.
2. Iniciar el listener local:

   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/payments/webhook
   ```

3. Copiar el secreto `whsec_...` mostrado por la CLI a `STRIPE_WEBHOOK_SECRET` en `.env`.
4. Recrear el backend para cargar las variables:

   ```bash
   docker compose up -d --force-recreate backend
   ```

5. Completar el checkout con la tarjeta de prueba `4242 4242 4242 4242`, una fecha futura y cualquier CVC y código postal válidos.

La orden se crea únicamente cuando llega `checkout.session.completed` o `checkout.session.async_payment_succeeded` con firma válida y estado pagado; volver a la URL de éxito por sí solo no confirma una compra. Los eventos `checkout.session.expired` y `checkout.session.async_payment_failed` cierran el checkout sin crear una orden y conservan el carrito. Para evitar duplicados y estados inconsistentes, cada evento que cambia el checkout se registra con un identificador único dentro de la misma transacción que actualiza su estado o materializa la orden.

## Arquitectura

La ruta `/` funciona como landing page de descubrimiento. El catálogo completo vive en `/products`; sus filtros se pueden compartir mediante los parámetros `search`, `category`, `minPriceCents` y `maxPriceCents`, y `/products/:id` muestra el detalle de cada artículo.

La portada obtiene cinco productos desde `GET /products/best-sellers`. El ranking suma unidades de órdenes pagadas y solo incluye productos activos; si hay menos de cinco productos vendidos, completa la selección con los primeros productos del catálogo sin duplicarlos. Si todavía no hay ventas, devuelve los primeros cinco activos y responde `selection: "featured"`.

El catálogo de demostración incluye 25 productos: 24 activos distribuidos en partes iguales entre Tecnología, Hogar, Moda y accesorios, Deporte y aire libre, Oficina y Cocina, más un producto archivado en General. El seed utiliza IDs estables y no sobrescribe nombres, precios, imágenes o categorías editadas. Una instalación que ya tenga volúmenes conserva sus cambios administrativos; `npm run compose:clean` permite volver deliberadamente al estado inicial.

Las 25 imágenes de demostración se versionan como archivos JPEG en `backend/prisma/seed-assets/products/` y se declaran con `seedImageFile` en `backend/prisma/catalog-data.ts`. Al arrancar, el seed valida formato, firma y tamaño, compara su SHA-256 y carga al bucket privado de MinIO mediante la API S3 solo los objetos ausentes o modificados. PostgreSQL guarda únicamente la clave del objeto. El proceso es repetible y conserva cualquier imagen reemplazada desde Administración. Los productos nuevos sin imagen —o una imagen que no pueda recuperarse— usan la representación visual de su categoría como fallback. No se versionan los volúmenes internos de PostgreSQL o MinIO.

Los filtros de nombre, categoría y rango de precio se combinan en la API y quedan en la URL (`?search=...&category=tecnologia&minPriceCents=2000&maxPriceCents=10000`). La búsqueda usa una representación normalizada e indexada en PostgreSQL, por lo que ignora mayúsculas y tildes sin perder las consultas parciales. Administración permite asignar y modificar la categoría. Cada usuario puede acceder a **Mi perfil** (`/profile`) para guardar nombre, teléfono, dirección, ciudad y país. El correo y el rol son de solo lectura. Las consultas y modificaciones del perfil siempre usan el usuario autenticado.

Cada ítem de una orden pagada admite una calificación editable de 1 a 5. La actualización queda limitada por el identificador del ítem, la orden y el usuario autenticado, por lo que conocer otro identificador no permite valorar compras ajenas. El catálogo y el detalle muestran promedio y cantidad únicamente cuando existen valoraciones; los agregados se resuelven en una consulta agrupada, sin N+1.

La interfaz usa un tema índigo con fondos claros y acentos rosados, centralizado en `frontend/src/theme.ts`; las superficies, menús, formularios y estados derivados usan los colores del tema.

```text
Browser
  └─ React/Vite (Nginx en Docker)
       └─ /api → NestJS
                 ├─ Auth / Users
                 ├─ Products ── S3 adapter ── MinIO
                 ├─ Cart
                 ├─ Payments ──────────────── Stripe
                 └─ Orders
                        └─ Prisma ──────────── PostgreSQL
```

El backend es un único proceso desplegable dividido por módulos de negocio. Los controllers resuelven HTTP, DTOs y autorización; los services concentran las reglas; Prisma centraliza la persistencia. Esta separación mantiene transacciones y reglas cerca de los datos sin introducir coordinación de red, colas o consistencia eventual innecesarias.

Estructura principal:

```text
cartly/
├── backend/              # API NestJS, Prisma, migraciones y tests
├── frontend/             # SPA React
├── e2e/                  # Flujos Playwright
├── docker-compose.yml
├── .env.example
└── package.json          # Workspaces y comandos comunes
```

### Decisiones importantes

- Cartly opera, administra productos y cobra en USD, y almacena todos los importes como enteros en centavos; no usa valores de punto flotante. El selector UYU es solo una conversión visual del storefront y sus filtros: el frontend los convierte nuevamente a centavos USD antes de consultar la API. La cotización de referencia es configurable con `VITE_USD_UYU_RATE` (42 por defecto).
- El carrito solo aporta producto y cantidad. El backend vuelve a leer precio y estado desde PostgreSQL al mostrar el carrito y justo antes de crear Checkout.
- Una orden conserva snapshots de nombre, precio unitario, cantidad y total para que cambios futuros de catálogo no alteren el historial.
- Los endpoints públicos filtran productos inactivos o eliminados. El listado administrativo también oculta los eliminados y toda mutación del catálogo requiere `ADMIN`.
- El borrado administrativo es lógico: quita el producto de los carritos y de todas las vistas, pero conserva la fila para no romper checkouts, órdenes, ratings ni auditoría histórica.
- Las consultas de órdenes siempre incluyen el `userId` autenticado; conocer un identificador ajeno no concede acceso.
- La cookie JWT es `HttpOnly`, `SameSite=Lax` y debe usar `Secure=true` en producción. La API no expone el token a JavaScript.
- MinIO permanece privado. PostgreSQL guarda únicamente la clave del objeto y la imagen se entrega a través del backend.
- La carga de imágenes valida MIME declarado, firma binaria y límite de tamaño en el servidor. Solo admite JPEG, PNG y WebP hasta `MAX_IMAGE_SIZE_BYTES` (5 MiB por defecto).
- El webhook valida la firma sobre el cuerpo HTTP sin modificar y registra cada evento antes de materializar la orden, garantizando idempotencia.

## API resumida

Todas las rutas usan el prefijo `/api`. Swagger documenta rutas, autenticación y DTOs de entrada.

| Área | Rutas principales | Acceso |
| --- | --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | Público / sesión |
| Perfil | `GET /users/me`, `PATCH /users/me` | Usuario autenticado |
| Categorías y filtros | `GET /products/categories`; `GET /products?category=<slug>&search=<nombre>&minPriceCents=<entero>&maxPriceCents=<entero>` | Público |
| Catálogo | `GET /products`, `GET /products/best-sellers`, `GET /products/:id`, `GET /products/:id/image` | Público, solo activos |
| Carrito | `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:productId`, `DELETE /cart/items/:productId` | Sesión autenticada |
| Pagos | `POST /payments/checkout`, `GET /payments/checkout/:sessionId/status`, `POST /payments/webhook` | Sesión / Stripe |
| Órdenes | `GET /orders`, `GET /orders/:id`, `PUT /orders/:orderId/items/:itemId/rating` | Propietario |
| Administración | `GET/POST /admin/products`, `PATCH/DELETE /admin/products/:id`, `PATCH /admin/products/:id/status`, `POST /admin/products/:id/image`, `GET /admin/products/sales-overview` | `ADMIN` |

Las respuestas de error mantienen una forma consistente con código HTTP, mensaje y detalles de validación. Consultar Swagger para ejemplos concretos.

## Desarrollo sin contenerizar la aplicación

Se recomienda Node.js 22 LTS y npm. PostgreSQL y MinIO pueden seguir ejecutándose en Compose:

```bash
npm install
docker compose up -d --wait postgres minio
docker compose run --rm minio-init
```

Copiar `.env.example` a `backend/.env`. Sus valores `DATABASE_URL` y `MINIO_ENDPOINT=localhost` ya apuntan a los puertos publicados. Luego, en terminales separadas:

```bash
npm run db:migrate:host
npm run db:seed:host
npm run dev:backend
npm run dev:frontend
```

Las migraciones y el seed anteriores se ejecutan desde el host; los comandos `db:migrate` y `db:seed` sin sufijo están reservados para una aplicación levantada completamente con Compose.

El servidor de Vite reenvía `/api` a `http://localhost:3000`. Para otro destino o cotización de visualización se puede crear `frontend/.env.local` con `BACKEND_URL`, `VITE_API_URL` y `VITE_USD_UYU_RATE`.

Comandos útiles:

```bash
npm run build
npm run lint
npm run db:migrate
npm run db:seed
```

## Tests

Instalar dependencias desde la raíz y ejecutar los tests unitarios/de integración:

```bash
npm install
npm test
```

El comando ejecuta las suites de backend y frontend. El backend prioriza cobertura de límites de seguridad y reglas de compra: separación `ADMIN`/`CUSTOMER`, órdenes propias, productos inactivos, precios manipulados, recálculo del checkout e idempotencia del webhook.

Para los flujos E2E, primero levantar la aplicación y descargar Chromium una sola vez:

```bash
npm run e2e:install
docker compose up --build -d
npm run test:e2e
```

También están disponibles `npm run test:e2e:headed` y `npm run test:e2e:ui`. Los flujos de compra registran clientes aislados y Playwright elimina sus productos administrativos de prueba directamente desde PostgreSQL al finalizar. La conexión se deriva de `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` y `POSTGRES_PORT`, igual que Compose, usando el puerto publicado en el host. Si no están definidos, usa `DATABASE_URL`. `E2E_DATABASE_URL` es una sobrescritura explícita y tiene prioridad: dejarla vacía para Compose; si se utiliza, debe apuntar a la misma base de datos que la aplicación evaluada. Por defecto simula solo la respuesta de Stripe al presionar checkout; autenticación, catálogo y carrito atraviesan la API real.

Si únicamente falla la limpieza administrativa con un error de autenticación PostgreSQL, revisar primero el puerto: un PostgreSQL local en `5432` y el contenedor en `5433` son servidores distintos. No es necesario reiniciar los volúmenes ni actualizar Prisma para corregir la conexión.

Con credenciales de Test Mode válidas se habilitan dos verificaciones adicionales: la redirección a Stripe y un flujo completo que crea una sesión real, obtiene sus importes desde Stripe, envía dos veces el mismo evento firmado de pago y confirma que exista una sola orden y que el carrito quede vacío. La simulación del evento evita introducir datos de tarjeta en un tercero, pero ejercita la validación de firma y toda la transacción local:

```bash
E2E_STRIPE_ENABLED=true npm run test:e2e
```

En PowerShell:

```powershell
$env:E2E_STRIPE_ENABLED = 'true'
npm run test:e2e
```

Los artefactos de una falla quedan en `test-results/` y el informe HTML en `playwright-report/`.

## Variables y producción

Los archivos `.env.example` de la raíz y del frontend documentan todas las variables y contienen valores locales no sensibles. Nunca se deben versionar `.env`, claves reales de Stripe ni secretos JWT. `JWT_EXPIRES_IN` exige una duración con unidad (`s`, `m`, `h`, `d` o `w`) de hasta 365 días; esa misma duración controla el JWT y `Max-Age` de la cookie. En producción, `JWT_SECRET` debe tener al menos 32 bytes. También se debe activar `COOKIE_SECURE`, restringir `FRONTEND_URL`, usar HTTPS y reemplazar las credenciales de PostgreSQL/MinIO. Los contenedores incluidos están pensados para evaluación y desarrollo local, no como topología de alta disponibilidad.

Si un puerto está ocupado, se puede cambiar el correspondiente `*_PORT` en `.env`. Al cambiar `FRONTEND_PORT`, también deben actualizarse `FRONTEND_URL`, las URLs de retorno de Stripe y `E2E_BASE_URL`. Al cambiar `POSTGRES_PORT` para desarrollo desde el host, debe actualizarse `DATABASE_URL`. Si el backend no llega a healthy, revisar primero `docker compose logs backend`; migraciones, conexión a PostgreSQL y variables de Stripe/MinIO se reportan allí.
