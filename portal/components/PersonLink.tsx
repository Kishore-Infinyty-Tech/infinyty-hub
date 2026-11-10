import Link from "next/link";
import type { ReactNode } from "react";

/** A name (or any content) that opens that person's public profile. Use it wherever a person is shown. */
export function PersonLink({ id, children, className = "" }: { id: number | null | undefined; children: ReactNode; className?: string }) {
  if (!id) return <>{children}</>;
  return (
    <Link href={`/people/${id}`} onClick={(e) => e.stopPropagation()} className={`rounded-sm underline-offset-2 transition-colors hover:text-indigo-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${className}`}>
      {children}
    </Link>
  );
}
