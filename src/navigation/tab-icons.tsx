import Svg, { Path } from "react-native-svg";

export type TabIconName = "home" | "fatigue" | "docs" | "profile";

type TabIconProps = { name: TabIconName; color: string; size: number };

// Paths del mockup 10_driver_home.html (Heroicons). Home va relleno en un
// viewBox de 20; los otros tres van de contorno en uno de 24.
const OUTLINE_PATHS = {
  fatigue: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  docs: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  profile:
    "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
} as const;

const HOME_PATH =
  "M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z";

const OUTLINE_STROKE_WIDTH = 1.5;

export function TabIcon({
  name,
  color,
  size,
}: TabIconProps): React.JSX.Element {
  if (name === "home") {
    return (
      <Svg width={size} height={size} viewBox="0 0 20 20" fill={color}>
        <Path d={HOME_PATH} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={OUTLINE_PATHS[name]}
        stroke={color}
        strokeWidth={OUTLINE_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
