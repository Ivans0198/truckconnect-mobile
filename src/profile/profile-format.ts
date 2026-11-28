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
