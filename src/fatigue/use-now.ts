import { useEffect, useState } from "react";

const TICK_MS = 60_000;

// La cuenta regresiva del break se recalcula cada minuto aunque el back no
// haya cambiado nada.
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}
