import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';
import { Public } from './components/auth/decorators/auth.decorators';
import { Health } from './libs/dto/health/health';

// REST, not GraphQL: an uptime monitor (UptimeRobot) can only send a plain GET.
// 503 when Postgres or Redis is down, so the monitor marks the API as down.
@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  public async health(
    @Res({ passthrough: true }) res: Response,
  ): Promise<Health> {
    const health = await this.appService.health();
    if (health.status !== 'ok') res.status(503);
    return health;
  }
}
