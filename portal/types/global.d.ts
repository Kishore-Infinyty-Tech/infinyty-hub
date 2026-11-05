import type * as React from "react";

declare global {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  type RouteContext<_T extends string = string> = { params: Promise<Record<string, string | string[]>> };
  type PageProps<_T extends string = string> = {
    params: Promise<Record<string, string | string[]>>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  };
  type LayoutProps<_T extends string = string> = {
    children: React.ReactNode;
    params: Promise<Record<string, string | string[]>>;
  };
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

export {};
