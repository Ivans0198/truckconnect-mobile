import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";

import { api } from "@/api/client";

import { summarizeDocuments } from "./attention";
import type { ComplianceDocument, ComplianceSummary } from "./types";

export const COMPLIANCE_DOCUMENTS_KEY = ["compliance", "documents"] as const;
// El máximo que acepta el contrato: un conductor tiene pocos documentos.
export const DOCUMENTS_PAGE_LIMIT = 100;

export class DocumentsPageOverflowError extends Error {
  constructor(totalPages: number) {
    super(
      `The documents do not fit in one page of ${DOCUMENTS_PAGE_LIMIT} (${totalPages} pages)`,
    );
    this.name = "DocumentsPageOverflowError";
  }
}

// Lanza ante un no-2xx, y con más de una página lanza en vez de mostrar una
// lista cortada (research R3).
export async function fetchComplianceDocuments(): Promise<
  ComplianceDocument[]
> {
  const { data, response } = await api.GET("/compliance/documents", {
    params: { query: { page: 1, limit: DOCUMENTS_PAGE_LIMIT } },
  });
  if (!data) {
    throw new Error(`GET /compliance/documents failed with ${response.status}`);
  }
  if (data.totalPages > 1)
    throw new DocumentsPageOverflowError(data.totalPages);
  return data.items;
}

export function useComplianceDocuments(): UseQueryResult<ComplianceDocument[]> {
  return useQuery({
    queryKey: COMPLIANCE_DOCUMENTS_KEY,
    queryFn: fetchComplianceDocuments,
  });
}

// El resumen de atención, o undefined mientras carga o si la lectura falló:
// quien lo usa (el banner, la insignia) simplemente no muestra nada.
export function useComplianceAttention(): ComplianceSummary | undefined {
  const { data } = useComplianceDocuments();
  return useMemo(
    () => (data ? summarizeDocuments(data, new Date()) : undefined),
    [data],
  );
}
