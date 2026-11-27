import Svg, { Path } from "react-native-svg";

import type { DocType } from "./types";

// Paths de docs/mockups/13_driver_compliance.html (Heroicons). Los rellenos
// van en un viewBox de 20; los de contorno, en uno de 24.
const FILLED_PATHS = {
  alert:
    "M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z",
  check:
    "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z",
  exclamation:
    "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z",
} as const;

const OUTLINE_PATHS = {
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  upload: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
  info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  licence:
    "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2",
  vehicle:
    "M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM3 17h2v-7h12v7h2M3 10v7a2 2 0 002 2h0M19 10v7a2 2 0 01-2 2h0M3 10l3-4h12l3 4",
  liability:
    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  trailer:
    "M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1",
  document:
    "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
} as const;

export type ComplianceIconName =
  keyof typeof FILLED_PATHS | keyof typeof OUTLINE_PATHS;

export const DOC_TYPE_ICONS: Record<DocType, ComplianceIconName> = {
  DRIVER_LICENCE: "licence",
  VEHICLE_REGO: "vehicle",
  PUBLIC_LIABILITY: "liability",
  TRAILER_REGO: "trailer",
  DANGEROUS_GOODS: "document",
};

const OUTLINE_STROKE_WIDTH = 1.75;

// Decorativo: el estado siempre va también en texto.
export function ComplianceIcon({
  name,
  color,
  size,
}: {
  name: ComplianceIconName;
  color: string;
  size: number;
}): React.JSX.Element {
  if (name in FILLED_PATHS) {
    return (
      <Svg width={size} height={size} viewBox="0 0 20 20" fill={color}>
        <Path d={FILLED_PATHS[name as keyof typeof FILLED_PATHS]} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={OUTLINE_PATHS[name as keyof typeof OUTLINE_PATHS]}
        stroke={color}
        strokeWidth={OUTLINE_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
