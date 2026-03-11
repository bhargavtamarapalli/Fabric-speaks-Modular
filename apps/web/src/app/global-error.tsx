"use client";

import { ErrorPage } from "@/components/organisms/ErrorPage";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <ErrorPage variant="server-error" onRetry={() => reset()} />
      </body>
    </html>
  );
}
