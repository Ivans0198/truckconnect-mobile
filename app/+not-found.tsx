import { Redirect } from "expo-router";

import { useSessionStore } from "@/auth/session-store";

// Una ruta interna abierta sin sesión no existe para el router (Stack.Protected
// la oculta): aquí cae, y de aquí va al login. Con sesión, una ruta
// desconocida vuelve a Home.
export default function NotFoundRedirect(): React.JSX.Element {
  const isSignedIn = useSessionStore((s) => s.session.status === "signedIn");
  return <Redirect href={isSignedIn ? "/" : "/sign-in"} />;
}
