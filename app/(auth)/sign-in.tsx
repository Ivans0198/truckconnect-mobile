import { SignInScreen } from "@/auth/sign-in-screen";

// El guard de app/_layout.tsx cambia de grupo cuando la sesión pasa a
// signedIn, así que el router llega a "/" sin navegar a mano.
export default function SignInRoute(): React.JSX.Element {
  return <SignInScreen />;
}
