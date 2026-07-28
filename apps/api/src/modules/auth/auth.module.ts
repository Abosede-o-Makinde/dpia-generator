import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { config } from '../../common/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { PasskeysService } from './passkeys.service';
import { SsoService } from './sso.service';
import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({ secret: config().JWT_ACCESS_SECRET }),
    }),
  ],
  controllers: [AuthController, TokensController],
  providers: [AuthService, MfaService, PasskeysService, SsoService, TokensService],
  exports: [AuthService],
})
export class AuthModule {}
