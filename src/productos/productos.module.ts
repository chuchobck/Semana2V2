import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PRODUCTOS_API_TIMEOUT_MS } from '../config/productos-api.config.js';
import { ProductosResolver } from './productos.resolver.js';
import { ProductosService } from './productos.service.js';

@Module({
  imports: [HttpModule.register({ timeout: PRODUCTOS_API_TIMEOUT_MS })],
  providers: [ProductosResolver, ProductosService],
})
export class ProductosModule {}
