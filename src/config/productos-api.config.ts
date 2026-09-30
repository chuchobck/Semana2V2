/**
 * URL base de la API REST de productos que consume el servidor GraphQL.
 *
 * Se puede cambiar sin tocar código con la variable de entorno PRODUCTOS_API_URL.
 * Por defecto apunta a la API propia desplegada en Render.
 */
export const PRODUCTOS_API_URL =
  process.env.PRODUCTOS_API_URL ??
  'https://practica2-1-6kvj.onrender.com/api/v1/productos';

/** Tiempo máximo de espera por petición (Render en plan gratis tarda en "despertar"). */
export const PRODUCTOS_API_TIMEOUT_MS = Number(
  process.env.PRODUCTOS_API_TIMEOUT_MS ?? 60_000,
);
