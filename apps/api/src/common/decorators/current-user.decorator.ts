import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Mengambil user hasil autentikasi JWT dari request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
