import { focusManager } from "@tanstack/react-query";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";

// En React Native no hay foco de ventana: sin esto refetchOnWindowFocus no
// hace nada al volver de segundo plano. Devuelve la función que desconecta.
export function connectAppFocus(): () => void {
  const subscription = AppState.addEventListener(
    "change",
    (status: AppStateStatus) => focusManager.setFocused(status === "active"),
  );
  return () => subscription.remove();
}
