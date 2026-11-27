import { TitleScreen } from "@/navigation/title-screen";

// Aparte de la ruta para que las historias de E5 le sumen la campana de
// notificaciones sin tocar app/(tabs)/index.tsx (que decide E2).
export function HomeHeader(): React.JSX.Element {
  return <TitleScreen title="Home" />;
}
