import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, NoOrgContext, type AuthPrincipal } from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { PrismaService } from '../../common/prisma/prisma.service';

const updateMeSchema = z.object({
  displayName: z.string().min(1).max(120),
});

@ApiTags('users')
@ApiBearerAuth()
@Controller({ path: 'me', version: '1' })
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @NoOrgContext()
  @Get()
  async me(@CurrentUser() principal: AuthPrincipal) {
    const user = await this.prisma.system.user.findUniqueOrThrow({
      where: { id: principal.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        credentials: { select: { id: true, label: true, createdAt: true, lastUsedAt: true } },
        memberships: {
          select: {
            role: true,
            organisation: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    return user;
  }

  @NoOrgContext()
  @Patch()
  updateMe(
    @CurrentUser() principal: AuthPrincipal,
    @Body(new ZodPipe(updateMeSchema)) dto: z.infer<typeof updateMeSchema>,
  ) {
    return this.prisma.system.user.update({
      where: { id: principal.userId },
      data: { displayName: dto.displayName },
      select: { id: true, email: true, displayName: true },
    });
  }
}
