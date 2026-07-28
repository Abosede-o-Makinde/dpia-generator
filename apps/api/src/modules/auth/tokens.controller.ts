import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentOrg,
  CurrentUser,
  type AuthPrincipal,
  type OrgContext,
} from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { TokensService } from './tokens.service';
import { createTokenSchema, type CreateTokenDto } from './dto';

@ApiTags('api-tokens')
@ApiBearerAuth()
@Controller({ path: 'tokens', version: '1' })
export class TokensController {
  constructor(private readonly tokens: TokensService) {}

  @Post()
  create(
    @CurrentUser() user: AuthPrincipal,
    @CurrentOrg() org: OrgContext,
    @Body(new ZodPipe(createTokenSchema)) dto: CreateTokenDto,
  ) {
    return this.tokens.create(org.orgId, user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthPrincipal, @CurrentOrg() org: OrgContext) {
    return this.tokens.list(org.orgId, user.userId);
  }

  @Delete(':id')
  @HttpCode(204)
  revoke(
    @CurrentUser() user: AuthPrincipal,
    @CurrentOrg() org: OrgContext,
    @Param('id') id: string,
  ) {
    return this.tokens.revoke(org.orgId, user.userId, id);
  }
}
