import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";

type RenderResult = Awaited<ReturnType<typeof render>>;

// Sin reintentos: un test de error tiene que ver el error en el primer fallo.
export function renderWithQuery(ui: ReactElement): Promise<RenderResult> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}
