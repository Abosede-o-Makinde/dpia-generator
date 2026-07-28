import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { z } from 'zod';
import { CurrentUser, NoOrgContext, Public, type AuthPrincipal } from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { config } from '../../common/config';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { PasskeysService } from './passkeys.service';
import { SsoService } from './sso.service';
import {
  loginSchema,
  mfaConfirmSchema,
  mfaVerifySchema,
  refreshSchema,
  registerSchema,
  type LoginDto,
  type MfaConfirmDto,
  type MfaVerifyDto,
  type RefreshDto,
  type RegisterDto,
} from './dto';

const passkeyLoginOptionsSchema = z.object({ email: z.string().email() });
const passkeyLoginVerifySchema = z.object({
  email: z.string().email(),
  response: z.record(z.unknown()),
});
const passkeyRegisterVerifySchema = z.object({
  response: z.record(z.unknown()),
  label: z.string().max(80).optional(),
});

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly mfa: MfaService,
    private readonly passkeys: PasskeysService,
    private readonly sso: SsoService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @ApiOperation({ summary: 'Self-service signup (creates user + organisation)' })
  register(@Body(new ZodPipe(registerSchema)) dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Password login; returns tokens or an MFA challenge' })
  login(@Body(new ZodPipe(loginSchema)) dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('mfa/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Complete an MFA challenge (TOTP or recovery code)' })
  verifyMfa(@Body(new ZodPipe(mfaVerifySchema)) dto: MfaVerifyDto) {
    return this.auth.verifyMfa(dto.mfaToken, dto.code);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token (reuse detection revokes the family)' })
  refresh(@Body(new ZodPipe(refreshSchema)) dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Body(new ZodPipe(refreshSchema)) dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  // ── MFA management (authenticated) ────────────────────────────────────────

  @ApiBearerAuth()
  @NoOrgContext()
  @Post('mfa/enroll')
  @ApiOperation({ summary: 'Begin TOTP enrolment (returns otpauth:// URI)' })
  enrollMfa(@CurrentUser() user: AuthPrincipal) {
    return this.mfa.enroll(user.userId);
  }

  @ApiBearerAuth()
  @NoOrgContext()
  @Post('mfa/confirm')
  @ApiOperation({ summary: 'Activate MFA with a live code; returns recovery codes' })
  confirmMfa(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodPipe(mfaConfirmSchema)) dto: MfaConfirmDto,
  ) {
    return this.mfa.confirm(user.userId, dto.code);
  }

  @ApiBearerAuth()
  @NoOrgContext()
  @Post('mfa/disable')
  @HttpCode(204)
  disableMfa(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodPipe(mfaConfirmSchema)) dto: MfaConfirmDto,
  ) {
    return this.mfa.disable(user.userId, dto.code);
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @NoOrgContext()
  @Get('sessions')
  listSessions(@CurrentUser() user: AuthPrincipal) {
    return this.auth.listSessions(user.userId);
  }

  @ApiBearerAuth()
  @NoOrgContext()
  @Delete('sessions/:id')
  @HttpCode(204)
  revokeSession(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.auth.revokeSession(user.userId, id);
  }

  // ── Passkeys ──────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @NoOrgContext()
  @Post('passkeys/register/options')
  passkeyRegisterOptions(@CurrentUser() user: AuthPrincipal) {
    return this.passkeys.registrationOptions(user.userId);
  }

  @ApiBearerAuth()
  @NoOrgContext()
  @Post('passkeys/register/verify')
  passkeyRegisterVerify(
    @CurrentUser() user: AuthPrincipal,
    @Body(new ZodPipe(passkeyRegisterVerifySchema))
    dto: z.infer<typeof passkeyRegisterVerifySchema>,
  ) {
    return this.passkeys.verifyRegistration(user.userId, dto.response as never, dto.label);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('passkeys/login/options')
  @HttpCode(200)
  passkeyLoginOptions(@Body(new ZodPipe(passkeyLoginOptionsSchema)) dto: { email: string }) {
    return this.passkeys.authenticationOptions(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('passkeys/login/verify')
  @HttpCode(200)
  async passkeyLoginVerify(
    @Body(new ZodPipe(passkeyLoginVerifySchema))
    dto: z.infer<typeof passkeyLoginVerifySchema>,
  ) {
    const userId = await this.passkeys.verifyAuthentication(dto.email, dto.response as never);
    return this.auth.loginAsUser(userId);
  }

  // ── SSO (generic OIDC) ────────────────────────────────────────────────────

  @Public()
  @Get('sso/login')
  @ApiOperation({ summary: 'Start OIDC login — returns the IdP redirect URL' })
  ssoLogin() {
    return this.sso.loginUrl();
  }

  @Public()
  @Get('sso/callback')
  async ssoCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const userId = await this.sso.handleCallback(code, state);
    const result = await this.auth.loginAsUser(userId);
    // Hand tokens to the SPA via fragment (kept out of server logs & Referer).
    const fragment = new URLSearchParams({
      accessToken: result.tokens!.accessToken,
      refreshToken: result.tokens!.refreshToken,
    });
    res.redirect(`${config().APP_URL}/auth/sso#${fragment}`);
  }
}
