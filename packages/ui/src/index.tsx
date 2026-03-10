import type { ReactNode } from "react";

export function Placeholder({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}
