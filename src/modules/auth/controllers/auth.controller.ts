import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';
import { AuthService } from '../services/auth.service';

class GenerateTokenDto {
  @IsString()
  sub: string;

  @IsIn(['client', 'courier', 'store', 'admin'])
  role: 'client' | 'courier' | 'store' | 'admin';
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('token')
  @ApiOperation({ summary: 'Gerar token JWT (dev/test only)' })
  generateToken(@Body() dto: GenerateTokenDto) {
    const token = this.authService.generateToken(dto);
    return { access_token: token };
  }
}