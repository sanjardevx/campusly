import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AppResolver } from './app.resolver';
import { ComponentsModule } from './components/components.module';
import { DatabaseModule } from './database/database.module';
import { Env, validateEnv } from './libs/config';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';
import { formatGraphqlError } from './libs/utils/graphql-error';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const isProduction =
          config.get('NODE_ENV', { infer: true }) === 'production';
        return {
          // Dev and tests write backend/schema.gql (sorted, so diffs stay small): the frontend's
          // codegen reads it. Production keeps the schema in memory and writes no files.
          autoSchemaFile: isProduction
            ? true
            : join(process.cwd(), 'schema.gql'),
          sortSchema: true,
          playground: false, // Apollo Sandbox is the default landing page in development
          introspection: !isProduction,
          formatError: (formatted, error) =>
            formatGraphqlError(formatted, error, isProduction),
        };
      },
    }),
    DatabaseModule,
    ComponentsModule,
  ],
  providers: [
    AppResolver,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
