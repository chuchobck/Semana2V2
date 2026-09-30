import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { ProductosService } from './productos.service.js';
import { Producto } from './models/producto.model.js';

const CATALOGO: Producto[] = [
  { id: 1, nombre: 'Teclado mecánico', precio: 45.9 },
  { id: 3, nombre: 'Teclado inalámbrico hp', precio: 75.5 },
  { id: 4, nombre: 'MacBook Pro', precio: 3500 },
];

const respuesta = <T>(data: T) => of({ data } as AxiosResponse<T>);

const error404 = () =>
  new AxiosError('Not Found', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 404,
    data: {},
    statusText: 'Not Found',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

describe('ProductosService', () => {
  let http: { get: ReturnType<typeof vi.fn> };
  let service: ProductosService;

  beforeEach(() => {
    http = { get: vi.fn() };
    service = new ProductosService(http as unknown as HttpService);
  });

  it('findAll devuelve lo que responde la API', async () => {
    http.get.mockReturnValue(respuesta(CATALOGO));
    await expect(service.findAll()).resolves.toEqual(CATALOGO);
  });

  it('findOne pide /productos/:id', async () => {
    http.get.mockReturnValue(respuesta(CATALOGO[1]));
    await expect(service.findOne(3)).resolves.toEqual(CATALOGO[1]);
    expect(http.get).toHaveBeenCalledWith(expect.stringMatching(/\/3$/));
  });

  it('findOne devuelve null si la API responde 404', async () => {
    http.get.mockReturnValue(throwError(error404));
    await expect(service.findOne(2)).resolves.toBeNull();
  });

  it('findOne propaga otros errores (API caída)', async () => {
    http.get.mockReturnValue(throwError(() => new Error('ECONNREFUSED')));
    await expect(service.findOne(1)).rejects.toThrow('ECONNREFUSED');
  });

  it.each([
    [50, 1],
    [100, 2],
    [10, 0],
  ])(
    'findBaratos(%d) devuelve %d productos',
    async (precioMaximo, esperados) => {
      http.get.mockReturnValue(respuesta(CATALOGO));
      const baratos = await service.findBaratos(precioMaximo);
      expect(baratos).toHaveLength(esperados);
      expect(baratos.every((p) => p.precio <= precioMaximo)).toBe(true);
    },
  );
});
