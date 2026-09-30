import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { Producto } from './models/producto.model.js';

@Resolver(() => Producto)
export class ProductosResolver {
  private readonly catalogo: Producto[] = [
    { id: 1, nombre: 'Teclado mecánico', precio: 45.9 },
    { id: 3, nombre: 'Teclado inalámbrico hp', precio: 75.5 },
    { id: 4, nombre: 'MacBook Pro', precio: 3500 },
  ];

  @Query(() => [Producto])
  productos(): Producto[] {
    return this.catalogo;
  }

  @Query(() => Producto, { nullable: true })
  productoPorId(@Args('id', { type: () => Int }) id: number): Producto | undefined {
    return this.catalogo.find((p) => p.id === id);
  }
}
