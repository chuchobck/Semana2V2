import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { PRODUCTOS_API_URL } from '../config/productos-api.config.js';
import { Producto } from './models/producto.model.js';

/**
 * Acceso a datos: habla con la API REST. El resolver no sabe de HTTP,
 * solo pide productos a este servicio.
 */
@Injectable()
export class ProductosService {
  constructor(private readonly http: HttpService) {}

  async findAll(): Promise<Producto[]> {
    const { data } = await firstValueFrom(this.http.get<Producto[]>(PRODUCTOS_API_URL));
    return data;
  }

  /** Devuelve null si la API responde 404 (el id no existe). */
  async findOne(id: number): Promise<Producto | null> {
    try {
      const { data } = await firstValueFrom(this.http.get<Producto>(`${PRODUCTOS_API_URL}/${id}`));
      return data;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async findBaratos(precioMaximo: number): Promise<Producto[]> {
    const productos = await this.findAll();
    return productos.filter((p) => p.precio <= precioMaximo);
  }
}
