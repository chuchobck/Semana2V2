import { Resolver, Query, Args, Int, Float } from '@nestjs/graphql';
import { Producto } from './models/producto.model.js';
import { ProductosService } from './productos.service.js';

@Resolver(() => Producto)
export class ProductosResolver {
  constructor(private readonly productosService: ProductosService) {}

  @Query(() => [Producto])
  productos(): Promise<Producto[]> {
    return this.productosService.findAll();
  }

  @Query(() => Producto, { nullable: true })
  productoPorId(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<Producto | null> {
    return this.productosService.findOne(id);
  }

  @Query(() => [Producto])
  productosBaratos(
    @Args('precioMaximo', { type: () => Float }) precioMaximo: number,
  ): Promise<Producto[]> {
    return this.productosService.findBaratos(precioMaximo);
  }
}
