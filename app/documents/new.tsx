import { useLocalSearchParams } from "expo-router";

import { DocumentForm } from "@/compliance/document-form";
import { DOC_TYPES, type DocType } from "@/compliance/types";

function docTypeOf(value: string | string[] | undefined): DocType | undefined {
  return DOC_TYPES.find((docType) => docType === value);
}

// Un `type` que no es del contrato se ignora: el formulario pide elegir.
export default function NewDocumentScreen(): React.JSX.Element {
  const { type } = useLocalSearchParams<{ type?: string }>();
  return <DocumentForm initialType={docTypeOf(type)} />;
}
