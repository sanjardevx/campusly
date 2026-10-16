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

  // Used by monitoring and the frontend skeleton page. Public (guards come on day 3).
  @Query(() => Health)
  public async health(): Promise<Health> {
    const [postgres, redis] = await Promise.all([
      this.prismaService.$queryRaw`SELECT 1`
        .then(() => true)
        .catch(() => false),
      this.redisService
        .ping()
        .then((reply) => reply === 'PONG')
        .catch(() => false),
    ]);
    return { status: postgres && redis ? 'ok' : 'degraded', postgres, redis };
  }
}
