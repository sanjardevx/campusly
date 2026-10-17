import { Query, Resolver } from '@nestjs/graphql';
import { PrismaService } from './database/prisma.service';
import { RedisService } from './database/redis.service';
import { Health } from './libs/dto/health/health';

@Resolver()
export class AppResolver {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  // Used by monitoring, deploy checks and the frontend skeleton page. Public (guards come on day 3).
  @Query(() => Health)
  public async health(): Promise<Health> {
    const [migration, redis] = await Promise.all([
      this.latestMigration(),
      this.redisService
        .ping()
        .then((reply) => reply === 'PONG')
        .catch(() => false),
    ]);
    // The migration query also proves the DB connection works
    const postgres = migration !== undefined;
    return {
      status: postgres && redis ? 'ok' : 'degraded',
      postgres,
      redis,
      migration: migration ?? null,
    };
  }

  /** Name of the latest applied migration; null = none applied, undefined = DB unreachable */
  private async latestMigration(): Promise<string | null | undefined> {
    try {
      const rows = await this.prismaService.$queryRaw<
        { migration_name: string }[]
      >`SELECT migration_name FROM _prisma_migrations
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
        ORDER BY finished_at DESC LIMIT 1`;
      return rows[0]?.migration_name ?? null;
    } catch {
      return undefined;
    }
  }
}
