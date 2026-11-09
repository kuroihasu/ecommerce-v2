import { Controller, Get } from '@nestjs/common';
import { Public } from '@nestjs/authentication';

// Lectura pública: no pide sesión.
@Public()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
