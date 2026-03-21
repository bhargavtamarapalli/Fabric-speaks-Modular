"use client";

import { ErrorPage } from "@/components/organisms/ErrorPage";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log the error (error is used in useEffect in child component)
  void error;
  return (
    <html>
      <body>
        <ErrorPage variant="server-error" onRetry={() => reset()} />
      </body>
    </html>
  );
}
