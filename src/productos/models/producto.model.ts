import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType({ description: 'Producto del catálogo' })
export class Producto {
  @Field(() => Int)
  id: number;

  @Field()
  nombre: string;

  @Field(() => Float)
  precio: number;
}
