// Tipos que comparte la autenticación: el usuario que queda en la petición y,
// como no usamos refresh tokens, que `TokenService.issue()` entrega solo el access token.
export type AuthUser = { id: string; email: string; name: string | null };

declare module '@nestjs/authentication' {
  interface AuthenticationTypes {
    user: AuthUser;
    refreshTokens: false;
  }
}
