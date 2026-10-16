import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../../../generated/prisma/client';
import type { Env } from '../libs/config';
import { errorReason } from '../libs/utils/error-reason';

// Sensitive columns are left out of EVERY query result (like Nestar's `select: false`).
// Code that really needs one asks for it explicitly, e.g. login:
//   this.prismaService.user.findUnique({ where: { loginId }, omit: { passwordHash: false } })
export const SENSITIVE_OMIT = {
  user: {
    passwordHash: true,
    tempPasswordUsesLeft: true,
    tempPasswordExpiresAt: true,
    telegramChatId: true,
  },
} satisfies Prisma.GlobalOmitConfig;

// Replaces Nestar's Mongoose connection: inject PrismaService and call
// this.prismaService.user.findMany(...) instead of this.memberModel.find(...)
@Injectable()
// The generic makes TypeScript know the omitted fields too: `user.passwordHash` is a compile error
export class PrismaService
  extends PrismaClient<{ adapter: PrismaPg; omit: typeof SENSITIVE_OMIT }>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('Database');
  private readonly target: string;

  constructor(config: ConfigService<Env, true>) {
    const url = config.get('DATABASE_URL', { infer: true });
    super({
      // Prisma 7 talks to Postgres through a driver adapter (node-postgres)
      adapter: new PrismaPg({ connectionString: url }),
      omit: SENSITIVE_OMIT,
    });
    // host:port/db only — never log the password from the URL
    const { host, pathname } = new URL(url);
    this.target = `${host}${pathname}`;
  }

  // Like Nestar's "MongoDB is connected": shows the DB state on every start.
  // The API keeps running if the DB is down; `health` then reports "degraded".
  async onModuleInit() {
    try {
      await this.$queryRaw`SELECT 1`;
      this.logger.log(`Postgres is connected (${this.target})`);
    } catch (err) {
      this.logger.error(
        `Postgres is NOT connected (${this.target}): ${errorReason(err)}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
