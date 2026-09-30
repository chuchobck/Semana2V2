import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { join } from 'path';

/**
 * Configuración del servidor GraphQL (Apollo).
 *
 * - autoSchemaFile: genera schema.gql en la raíz del proyecto (no en src/,
 *   para que el modo watch no recompile en bucle).
 * - introspection + landing page: mantienen Apollo Sandbox disponible también
 *   en producción (Render pone NODE_ENV=production y Apollo lo apagaría).
 */
export const graphqlConfig: ApolloDriverConfig = {
  driver: ApolloDriver,
  autoSchemaFile: join(process.cwd(), 'schema.gql'),
  sortSchema: true,
  introspection: true,
  playground: false,
  plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })],
};
