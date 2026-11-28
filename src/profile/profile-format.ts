const LICENCE_NAMES: Record<string, string> = {
  HR: "Heavy Rigid",
  HC: "Heavy Combination",
  MC: "Multi Combination",
};

export type EmergencyContact = { name: string; phone: string };

// "David Chen" → "DC"; un solo nombre da una sola letra.
export function initialsOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  const last = words[words.length - 1];
  if (!first || !last) return "";
  const letters = words.length === 1 ? first[0] : `${first[0]}${last[0]}`;
  return (letters ?? "").toUpperCase();
}

// "HC" → "Heavy Combination (HC)"; una clase desconocida se muestra tal cual.
export function licenceLabel(licenceClass: string | null): string | null {
  if (licenceClass === null) return null;
  const name = LICENCE_NAMES[licenceClass];
  return name ? `${name} (${licenceClass})` : licenceClass;
}

// El back lo guarda como objeto libre: solo se muestra si trae las dos cadenas.
export function emergencyContactOf(value: unknown): EmergencyContact | null {
  if (typeof value !== "object" || value === null) return null;
  const { name, phone } = value as Record<string, unknown>;
  if (typeof name !== "string" || typeof phone !== "string") return null;
  return { name, phone };
}

// "72629318504" → "72 629 318 504"; lo que no sean 11 dígitos se muestra tal cual.
export function formatAbn(abn: string): string {
  const digits = abn.replace(/\s/g, "");
  const match = /^(\d{2})(\d{3})(\d{3})(\d{3})$/.exec(digits);
  return match ? match.slice(1).join(" ") : abn;
}

// "+61400777888" → "+61 400 777 888" (móvil); "+61390001234" → "+61 3 9000 1234" (fijo).
// Lo que no sea un número australiano internacional se muestra tal cual.
export function formatAuPhone(phone: string): string {
  const compact = phone.replace(/\s/g, "");
  const mobile = /^\+61(4\d{2})(\d{3})(\d{3})$/.exec(compact);
  if (mobile) return `+61 ${mobile.slice(1).join(" ")}`;
  const landline = /^\+61([2378])(\d{4})(\d{4})$/.exec(compact);
  if (landline) return `+61 ${landline.slice(1).join(" ")}`;
  return phone;
}
