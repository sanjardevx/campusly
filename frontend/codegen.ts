import type { CodegenConfig } from '@graphql-codegen/cli';

// Types for every GraphQL operation, made from the backend's schema file (no server needed).
// No hand-written interfaces: a renamed field on the server breaks the build here.
const config: CodegenConfig = {
  schema: '../backend/schema.gql',
  documents: ['apollo/**/*.ts', 'pages/**/*.tsx', 'libs/**/*.tsx'],
  ignoreNoDocuments: true,
  generates: {
    'libs/gql/': {
      preset: 'client',
      config: {
        // GraphQL enums as string unions ("ADMIN" | "TEACHER"), lighter than TS enums
        enumsAsTypes: true,
        // DateTime arrives as an ISO string in JSON
        scalars: { DateTime: 'string' },
        useTypeImports: true,
      },
      presetConfig: { fragmentMasking: false },
    },
  },
};

export default config;
