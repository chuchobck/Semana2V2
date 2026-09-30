import { Test } from '@nestjs/testing';
import { ProductosResolver } from './productos.resolver.js';
import { ProductosService } from './productos.service.js';

describe('ProductosResolver', () => {
  const service = {
    findAll: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    findBaratos: vi.fn().mockResolvedValue([]),
  };
  let resolver: ProductosResolver;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductosResolver,
        { provide: ProductosService, useValue: service },
      ],
    }).compile();
    resolver = moduleRef.get(ProductosResolver);
  });

  it('delega cada query en el servicio', async () => {
    await resolver.productos();
    await resolver.productoPorId(4);
    await resolver.productosBaratos(100);
    expect(service.findAll).toHaveBeenCalled();
    expect(service.findOne).toHaveBeenCalledWith(4);
    expect(service.findBaratos).toHaveBeenCalledWith(100);
  });
});
