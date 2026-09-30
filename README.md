# Servidor GraphQL con NestJS — Práctica Semana 4

Servidor **GraphQL** hecho con **NestJS** (`@nestjs/graphql` + Apollo) que expone un catálogo de productos. Los datos **no** están en este servidor: los pide a una **API REST real** desplegada en Render, a través de `HttpService`.

```
Cliente (Apollo Sandbox)  ──GraphQL──▶  Este servidor NestJS  ──HTTP GET──▶  API REST en Render
      query { productos { nombre } }        ProductosResolver                /api/v1/productos
                                            └─ ProductosService
```

- API REST propia (por defecto): <https://practica2-1-6kvj.onrender.com/api/v1/productos>
- API REST del curso (alternativa): <https://nestjs-productos-api.onrender.com/api/v1/productos>

La guía original de la práctica está en [web-practica-v2.html](web-practica-v2.html).

---

## Índice

1. [Inicio rápido](#1-inicio-rápido)
2. [Estructura del proyecto](#2-estructura-del-proyecto)
3. [La práctica paso a paso](#3-la-práctica-paso-a-paso)
4. [Diferencias con la guía y por qué](#4-diferencias-con-la-guía-y-por-qué)
5. [Pruebas](#5-pruebas)
6. [Desplegar en Render](#6-desplegar-en-render)
7. [Bitácora (Paso 8)](#7-bitácora-paso-8)
8. [Solución de problemas](#8-solución-de-problemas)
9. [Declaración de uso de IA](#9-declaración-de-uso-de-ia)

---

## 1. Inicio rápido

Requisitos: **Node.js 22 o superior** (`node --version`).

```bash
npm install          # instala dependencias (versiones fijadas)
npm run start:dev    # arranca en modo desarrollo (recarga al guardar)
```

Abre **<http://localhost:3000/graphql>**: se carga **Apollo Sandbox**. Pega esta query y pulsa *Run*:

```graphql
query {
  productos {
    id
    nombre
    precio
  }
}
```

Todas las consultas de la práctica están en [docs/consultas.graphql](docs/consultas.graphql).

### Scripts disponibles

| Comando              | Qué hace                                               |
| -------------------- | ------------------------------------------------------ |
| `npm run start:dev`  | Desarrollo con recarga automática                      |
| `npm run build`      | Compila TypeScript a `dist/`                           |
| `npm run start:prod` | Ejecuta la versión compilada (`node dist/main`)        |
| `npm test`           | Pruebas unitarias (Vitest)                             |
| `npm run test:e2e`   | Prueba end-to-end                                      |
| `npm run lint`       | Revisión de estilo (oxlint)                            |
| `npm run format`     | Formatea el código (Prettier)                          |

### Elegir qué API REST consumir

La URL se lee de la variable de entorno `PRODUCTOS_API_URL` (ver [.env.example](.env.example)). Si no la defines, se usa **tu API** de Render.

```powershell
# PowerShell: usar la API del curso en lugar de la tuya
$env:PRODUCTOS_API_URL = "https://nestjs-productos-api.onrender.com/api/v1/productos"
npm run start:dev
```

| API            | Productos que devuelve                                       |
| -------------- | ------------------------------------------------------------ |
| Tuya (defecto) | id 1 y id 2 → "Teclado mecánico", 49.99                      |
| Del curso      | id 1 (Teclado mecánico, 45.9), id 3 (Teclado inalámbrico hp, 75.5), id 4 (MacBook Pro, 3500) |

> Los resultados "esperados" de la guía (ids 1, 3 y 4; `50` → 1 producto, `100` → 2) corresponden a la **API del curso**. Con tu API los datos son otros, pero el servidor GraphQL funciona igual.

> Render (plan gratis) "duerme" la API tras un rato sin uso. La primera petición puede tardar hasta ~50 s; por eso el timeout está en 60 s.

---

## 2. Estructura del proyecto

```
PracticaSemana2/
├── src/
│   ├── main.ts                          # Punto de entrada: crea la app y escucha en PORT (3000)
│   ├── app.module.ts                    # Módulo raíz: registra GraphQL y ProductosModule
│   ├── app.controller.ts / app.service.ts   # Ruta GET / ("Hello World!") que genera Nest
│   ├── config/
│   │   ├── graphql.config.ts            # Configuración de Apollo (schema.gql, Sandbox)
│   │   └── productos-api.config.ts      # URL y timeout de la API REST (variables de entorno)
│   └── productos/                       # Módulo de dominio "productos"
│       ├── models/
│       │   └── producto.model.ts        # @ObjectType Producto → tipo GraphQL
│       ├── productos.module.ts          # Agrupa HttpModule + service + resolver
│       ├── productos.service.ts         # Acceso a datos: llama a la API REST
│       ├── productos.resolver.ts        # Capa GraphQL: define las queries
│       ├── productos.service.spec.ts    # Pruebas del servicio
│       └── productos.resolver.spec.ts   # Pruebas del resolver
├── test/app.e2e-spec.ts                 # Prueba end-to-end
├── docs/consultas.graphql               # Todas las queries de la práctica
├── schema.gql                           # Esquema SDL AUTOGENERADO (no editar)
├── .env.example                         # Variables de entorno de ejemplo
├── .npmrc                               # Compatibilidad npm 10 / npm 11 (ver sección 4)
├── render.yaml                          # Blueprint para desplegar en Render
└── package.json
```

### Cómo encajan las piezas

| Capa         | Archivo                  | Responsabilidad                                                       |
| ------------ | ------------------------ | --------------------------------------------------------------------- |
| Modelo       | `producto.model.ts`      | Forma de los datos. Los decoradores generan `type Producto` en GraphQL |
| Resolver     | `productos.resolver.ts`  | Qué queries existen y qué argumentos reciben. No sabe nada de HTTP    |
| Servicio     | `productos.service.ts`   | De dónde salen los datos (API REST). No sabe nada de GraphQL          |
| Módulo       | `productos.module.ts`    | Declara qué se inyecta: `HttpModule`, `ProductosService`, resolver    |
| Configuración| `config/*.ts`            | Valores que cambian según el entorno (URL, timeout, Sandbox)          |

Si mañana los productos vinieran de una base de datos, solo cambiaría `productos.service.ts`; el resolver y las queries seguirían igual.

---

## 3. La práctica paso a paso

Cada bloque dice **qué pide la guía**, **qué se hizo** y **cómo se verificó**. El historial de git sigue el mismo orden (`git log --oneline`).

### Paso 0 — Verificar el entorno

```bash
node --version   # v22.20.0  ✔ (se necesita 22+)
npm --version    # 10.9.3
```

### Paso 1 — Crear el proyecto e instalar dependencias fijadas

```bash
npx @nestjs/cli@12.0.8 new nestjs-productos-graphql --directory . --package-manager npm
npm i --save-exact @nestjs/graphql@14.0.3 @nestjs/apollo@14.0.3 @apollo/server@5.5.1 @as-integrations/express5@1.1.2 graphql@16.14.2
```

- Se usó `npx` en lugar de `npm i -g` para no instalar el CLI de forma global; el resultado es el mismo.
- `--directory .` genera el proyecto en esta misma carpeta.
- `--save-exact` guarda `"14.0.3"` en vez de `"^14.0.3"`, para que nadie instale otra versión por accidente.
- **`@as-integrations/express5` es obligatorio**: sin él el proyecto compila pero al arrancar falla con `The "@as-integrations/express5" package is missing`.
- El proyecto es **ESM** (`"type": "module"` en `package.json`). Por eso todos los imports locales terminan en `.js` (ver Paso 2).

### Paso 2 — Definir el tipo y el resolver

NestJS usa el enfoque **code-first**: escribes clases TypeScript con decoradores y Nest genera el esquema GraphQL.

[src/productos/models/producto.model.ts](src/productos/models/producto.model.ts):

```ts
@ObjectType({ description: 'Producto del catálogo' })
export class Producto {
  @Field(() => Int)   id: number;
  @Field()            nombre: string;
  @Field(() => Float) precio: number;
}
```

| Decorador        | Qué genera en GraphQL                          |
| ---------------- | ---------------------------------------------- |
| `@ObjectType()`  | `type Producto { ... }`                        |
| `@Field(() => Int)` | `id: Int!` (sin `() => Int` sería `Float`)  |
| `@Field()`       | `nombre: String!` (lo deduce de `string`)      |
| `@Resolver()`    | Clase que resuelve campos de `Producto`        |
| `@Query()`       | Un campo dentro de `type Query { ... }`        |
| `@Args()`        | Un argumento de ese campo                      |

La primera versión del resolver tenía los datos **en memoria** en un arreglo `catalogo` (ids 1, 3 y 4, igual que la API del curso).

Los dos errores típicos de este paso, que se evitaron:

1. **Import sin `.js`** → `TS2307: Cannot find module`. Con `module: nodenext` hay que escribir `'./models/producto.model.js'` aunque el archivo sea `.ts`.
2. **Atributo y método con el mismo nombre** (`productos` y `productos()`) → `TS2300: Duplicate identifier`. Por eso el arreglo se llamó `catalogo`.

### Paso 3 — Registrar GraphQL en AppModule

Se registró `GraphQLModule.forRoot<ApolloDriverConfig>({ driver: ApolloDriver, autoSchemaFile: ... })`.

- `autoSchemaFile` escribe el esquema en **`schema.gql`, en la raíz**. Si se guardara en `src/`, el modo watch lo detectaría como cambio y recompilaría sin parar.
- El resolver va en `providers` (no en `controllers`) porque Nest lo crea por **inyección de dependencias**, como un servicio. Los `controllers` son para rutas HTTP REST.

Verificación: `npm run start:dev` muestra `Nest application successfully started` y aparece `schema.gql`.

### Paso 4 — Probar con Apollo Sandbox

En `http://localhost:3000/graphql`:

```graphql
query { productos { id nombre precio } }
query { productoPorId(id: 3) { id nombre precio } }
```

Resultado con datos en memoria:

```json
{ "data": { "productos": [
  { "id": 1, "nombre": "Teclado mecánico", "precio": 45.9 },
  { "id": 3, "nombre": "Teclado inalámbrico hp", "precio": 75.5 },
  { "id": 4, "nombre": "MacBook Pro", "precio": 3500 } ] } }
```

`productoPorId(id: 2)` → `null`, porque el campo se declaró `nullable: true`.

### Paso 5 — La ventaja frente a REST (overfetching)

```graphql
query { productos { nombre } }
```

La respuesta trae **solo `nombre`**, sin `id` ni `precio`. Además se puede pedir la lista y un detalle **en la misma petición**:

```graphql
query {
  productos { nombre }
  productoPorId(id: 4) { nombre }
}
```

En REST eso son dos peticiones (`GET /productos` y `GET /productos/4`) y cada una devuelve el objeto completo.

> Commit: `feat: servidor GraphQL con NestJS y datos en memoria (pasos 1-5)`

### Paso 6 — Conectar el resolver a la API REST real

```bash
npm i --save-exact @nestjs/axios@12.0.1 axios@1.20.0
```

Aquí el proyecto se **modularizó** (la guía lo mete todo en el resolver y en `AppModule`):

1. **[productos.service.ts](src/productos/productos.service.ts)** recibe `HttpService` por inyección y hace las peticiones:

   ```ts
   async findAll(): Promise<Producto[]> {
     const { data } = await firstValueFrom(this.http.get<Producto[]>(PRODUCTOS_API_URL));
     return data;
   }
   ```

   `HttpService` devuelve un **Observable** (RxJS); `firstValueFrom` lo convierte en **Promise** para poder usar `await`.

2. **`findOne` devuelve `null` cuando la API responde 404.** Con el código de la guía, pedir un id que no existe da un `INTERNAL_SERVER_ERROR`. Como el campo es `nullable`, lo correcto en GraphQL es responder `null`. Cualquier otro error (por ejemplo, la API caída) sí se propaga.

3. **[productos.resolver.ts](src/productos/productos.resolver.ts)** ya no tiene datos, solo delega en el servicio:

   ```ts
   @Query(() => [Producto])
   productos(): Promise<Producto[]> {
     return this.productosService.findAll();
   }
   ```

4. **[productos.module.ts](src/productos/productos.module.ts)** registra `HttpModule.register({ timeout })` en `imports`. Si faltara, la app compilaría pero al arrancar fallaría con `UnknownDependenciesException: Nest can't resolve dependencies of the ProductosService (?)`.

5. **[app.module.ts](src/app.module.ts)** solo importa `GraphQLModule` y `ProductosModule`.

Verificación:

| Prueba                                           | Resultado                                           |
| ------------------------------------------------ | --------------------------------------------------- |
| Log de arranque                                  | `ProductosModule dependencies initialized` ✔        |
| `productos` con la API del curso                 | ids 1, 3, 4 (igual que el Paso 4, pero desde internet) ✔ |
| `productos` con tu API                           | ids 1 y 2 ✔                                         |
| `productoPorId(id: 3)` con tu API (no existe)    | `null` ✔                                            |
| API apagada (URL que no responde)                | `errors: [... ECONNREFUSED ...]` ✔: los datos ya no salen de memoria |

> Commit: `feat: conectar resolver a la API REST con HttpService en un ProductosModule (paso 6)`

### Paso 7 — Reto: `productosBaratos(precioMaximo)`

Se añadió `Float` al import y esta query al resolver:

```ts
@Query(() => [Producto])
productosBaratos(
  @Args('precioMaximo', { type: () => Float }) precioMaximo: number,
): Promise<Producto[]> {
  return this.productosService.findBaratos(precioMaximo);
}
```

La lógica del filtro vive en el servicio (`findBaratos` = `findAll` + `filter(p => p.precio <= precioMaximo)`). En `schema.gql` aparece:

```graphql
productosBaratos(precioMaximo: Float!): [Producto!]!
```

| Query                                  | API del curso             | Tu API                |
| -------------------------------------- | ------------------------- | --------------------- |
| `productosBaratos(precioMaximo: 50)`   | 1 (Teclado mecánico 45.9) ✔ | 2 (ambos 49.99)     |
| `productosBaratos(precioMaximo: 100)`  | 2 ✔                       | 2                     |

### Paso 8 — Documentar y subir

- Bitácora: ver la [sección 7](#7-bitácora-paso-8).
- Commit final con el reto, las pruebas, este README y el despliegue.

```bash
git add .
git commit -m "feat: servidor GraphQL con NestJS sobre la API de productos"
```

---

## 4. Diferencias con la guía y por qué

| La guía dice                                           | Qué se hizo                                                            | Motivo                                                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `app.module.ts` con `ObserveModule` / `createObserveModule` | Se omitió                                                        | El proyecto que generó `nest new` (CLI 12.0.8) **no** incluye `@nestjs/observe` y `main.ts` no usa `ObserveInstrument`. Copiarlo habría dado `Cannot find module '@nestjs/observe'`. |
| Todo en el resolver + `AppModule`                      | `ProductosModule` + `ProductosService` + resolver                      | Separar responsabilidades: esto es la estructura modular estándar de NestJS                      |
| URL de la API fija en el código                        | Variable de entorno `PRODUCTOS_API_URL` (por defecto, tu API)          | Cambiar entre tu API y la del curso sin tocar código                                             |
| 404 → `INTERNAL_SERVER_ERROR`                          | 404 → `null`                                                           | El campo es `nullable`: "no existe" no es un error del servidor                                  |
| `HttpModule.register({})`                              | `HttpModule.register({ timeout: 60000 })`                              | Render tarda en despertar; sin timeout una petición podría quedarse colgada                      |
| `npm i -g @nestjs/cli`                                 | `npx @nestjs/cli@12.0.8`                                               | No hace falta instalar nada global                                                               |
| —                                                      | Archivo **`.npmrc`** con `legacy-peer-deps=true`                       | Ver abajo                                                                                        |
| —                                                      | Sandbox activo también en producción (`config/graphql.config.ts`)      | Con `NODE_ENV=production` (Render) Apollo desactiva Sandbox e introspección                       |

### Por qué existe `.npmrc`

La guía se probó con **npm 11**; este equipo tiene **npm 10.9.3**. Con npm 10, `nest new` falló al instalar:

```
npm error Cannot read properties of null (reading 'edgesOut')
```

Es un bug de npm 10 al resolver las dependencias *peer* opcionales de Vitest (la herramienta de tests). Además, un `package-lock.json` creado con npm 11 no le sirve a `npm ci` de npm 10 (`Missing: typescript@5.9.3 from lock file`).

`legacy-peer-deps=true` le dice a npm que no instale *peer dependencies* por su cuenta. No se pierde nada, porque todas las que usa el proyecto (`graphql`, `@apollo/server`, `@as-integrations/express5`, `axios`, `rxjs`…) ya están declaradas en `package.json`. Se comprobó que `npm install` y `npm ci` funcionan con **npm 10 y con npm 11**.

---

## 5. Pruebas

```bash
npm test          # 9 pruebas unitarias
npm run test:e2e  # prueba end-to-end de GET /
```

- **[productos.service.spec.ts](src/productos/productos.service.spec.ts)**: simula `HttpService` (sin internet) y comprueba que `findAll` devuelve lo que responde la API, que `findOne` llama a `/productos/:id`, que un 404 da `null`, que otros errores se propagan y que `findBaratos` filtra bien (`50` → 1, `100` → 2, `10` → 0).
- **[productos.resolver.spec.ts](src/productos/productos.resolver.spec.ts)**: comprueba que cada query delega en el método correcto del servicio.

---

## 6. Desplegar en Render

El repositorio incluye [render.yaml](render.yaml).

1. Sube el repo a GitHub:
   ```bash
   git remote add origin https://github.com/<tu-usuario>/nestjs-productos-graphql.git
   git push -u origin master
   ```
2. En Render: **New → Blueprint** → elige el repositorio. O, a mano, **New → Web Service** con:
   - Build Command: `npm ci --include=dev && npm run build`
   - Start Command: `npm run start:prod`
   - Variable de entorno: `PRODUCTOS_API_URL` = `https://practica2-1-6kvj.onrender.com/api/v1/productos`
3. Render asigna `PORT` solo (`main.ts` ya usa `process.env.PORT ?? 3000`).
4. Abre `https://<tu-servicio>.onrender.com/graphql` y aparecerá Apollo Sandbox.

`--include=dev` hace falta porque `nest build` usa el CLI y TypeScript, que son dependencias de desarrollo.

---

## 7. Bitácora (Paso 8)

**¿Cuántas llamadas REST para "todos los productos, solo nombres, más el detalle de uno"?**

| Enfoque  | Peticiones | Qué se recibe                                                                 |
| -------- | ---------- | ----------------------------------------------------------------------------- |
| REST     | **2**: `GET /api/v1/productos` + `GET /api/v1/productos/4` | Objetos completos (`id`, `nombre`, `precio`) aunque solo se quería `nombre` |
| GraphQL  | **1**      | Exactamente los campos pedidos                                                 |

```graphql
query {
  productos { nombre }
  productoPorId(id: 4) { nombre }
}
```

(Internamente este servidor sí hace 2 peticiones a la API REST, pero eso ocurre servidor a servidor. El cliente hace una sola petición y recibe solo lo que pidió.)

**¿Qué cambió en el Paso 6?** Antes el resolver devolvía el arreglo `catalogo` en memoria; ahora `ProductosService` pide los datos a la API con `HttpService`. **Las queries no cambiaron**: la forma del esquema es la misma, solo cambió de dónde salen los datos. Esa es la idea de los resolvers: el cliente no sabe (ni le importa) si los datos vienen de memoria, de una base de datos o de otra API.

---

## 8. Solución de problemas

| Síntoma                                                         | Causa / solución                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm error Cannot read properties of null (reading 'edgesOut')` | Falta el archivo `.npmrc` o se borró. Vuelve a crearlo con `legacy-peer-deps=true`    |
| `The "@as-integrations/express5" package is missing`            | `npm i --save-exact @as-integrations/express5@1.1.2`                                  |
| `TS2307: Cannot find module './...'`                            | Falta `.js` al final del import                                                       |
| `UnknownDependenciesException ... HttpService`                  | `HttpModule.register(...)` no está en `imports` de `ProductosModule`                  |
| La query tarda ~50 s la primera vez                             | La API de Render estaba dormida; las siguientes van rápido                            |
| `productoPorId` devuelve `null`                                 | Ese id no existe en la API que estás usando (tuya: 1, 2 · curso: 1, 3, 4)             |
| El puerto 3000 está ocupado                                     | `$env:PORT = 3001; npm run start:dev`                                                 |

---

## 9. Declaración de uso de IA

- Herramienta(s): Claude Code (Claude Opus 5.5)
- Nivel de uso: 3 (implementación asistida con revisión)
- Qué se le pidió: seguir la guía `web-practica-v2.html` paso a paso, modularizar el proyecto (módulo/servicio/resolver), conectarlo a la API propia de Render, escribir pruebas y este README.
- Qué se modificó/verificó manualmente: _completa aquí qué revisaste tú (por ejemplo: ejecuté cada query en Apollo Sandbox, comparé resultados con la API del curso y con la mía)._
