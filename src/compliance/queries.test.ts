import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { createElement, type ReactNode } from "react";

import {
  approvedIn8Days,
  complianceDocument,
  documentsPage,
} from "@/test/compliance-fixtures";
import { apiUrl, server } from "@/test/server";

import {
  COMPLIANCE_DOCUMENTS_KEY,
  DOCUMENTS_PAGE_LIMIT,
  fetchComplianceDocuments,
  useComplianceAttention,
} from "./queries";

function wrapper(): ({ children }: { children: ReactNode }) => ReactNode {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe("fetchComplianceDocuments", () => {
  it("asks for page 1 with the maximum page size", async () => {
    let searchParams: URLSearchParams | undefined;
    server.use(
      http.get(apiUrl("/compliance/documents"), ({ request }) => {
        searchParams = new URL(request.url).searchParams;
        return HttpResponse.json(documentsPage([]));
      }),
    );

    await fetchComplianceDocuments();

    expect(DOCUMENTS_PAGE_LIMIT).toBe(100);
    expect(searchParams?.get("page")).toBe("1");
    expect(searchParams?.get("limit")).toBe("100");
  });

  it("returns the documents of the page", async () => {
    const document = complianceDocument({ id: "doc-a" });
    server.use(
      http.get(apiUrl("/compliance/documents"), () =>
        HttpResponse.json(documentsPage([document])),
      ),
    );

    await expect(fetchComplianceDocuments()).resolves.toEqual([document]);
  });

  it.each([401, 403, 429, 500])("throws on a %s", async (status) => {
    server.use(
      http.get(
        apiUrl("/compliance/documents"),
        () => new HttpResponse(null, { status }),
      ),
    );

    await expect(fetchComplianceDocuments()).rejects.toThrow(String(status));
  });

  it("throws a named error instead of cutting the list when there is more than one page", async () => {
    server.use(
      http.get(apiUrl("/compliance/documents"), () =>
        HttpResponse.json({
          ...documentsPage([complianceDocument({ id: "doc-a" })]),
          total: 150,
          totalPages: 2,
        }),
      ),
    );

    await expect(fetchComplianceDocuments()).rejects.toMatchObject({
      name: "DocumentsPageOverflowError",
    });
  });
});

describe("useComplianceAttention", () => {
  it("is undefined while loading and the summary once the data arrives", async () => {
    server.use(
      http.get(apiUrl("/compliance/documents"), () =>
        HttpResponse.json(documentsPage([approvedIn8Days])),
      ),
    );

    const { result } = await renderHook(() => useComplianceAttention(), {
      wrapper: wrapper(),
    });

    expect(result.current).toBeUndefined();
    await waitFor(() => expect(result.current).toBeDefined());
    expect(result.current?.cards).toHaveLength(1);
    expect(result.current?.attentionCount).toBe(1);
  });

  it("stays undefined after a failure", async () => {
    server.use(
      http.get(
        apiUrl("/compliance/documents"),
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = await renderHook(() => useComplianceAttention(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children),
    });

    await waitFor(() =>
      expect(client.getQueryState(COMPLIANCE_DOCUMENTS_KEY)?.status).toBe(
        "error",
      ),
    );
    expect(result.current).toBeUndefined();
  });
});
