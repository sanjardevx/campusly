import { Query, Resolver } from '@nestjs/graphql';
import { AppService } from './app.service';
import { Public } from './components/auth/decorators/auth.decorators';
import { Health } from './libs/dto/health/health';

@Resolver()
export class AppResolver {
  constructor(private readonly appService: AppService) {}

  // Used by deploy checks and the frontend skeleton page, so it is public.
  @Public()
  @Query(() => Health)
  public async health(): Promise<Health> {
    return this.appService.health();
  }
}
