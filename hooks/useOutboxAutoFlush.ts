import { useEffect } from "react";
import { processOutboxOnce } from "../utils/outboxProcessor";

export function useOutboxAutoFlush() {
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await processOutboxOnce();
      } catch {}
    })();

    const id = setInterval(async () => {
      if (!alive) return;
      try {
        await processOutboxOnce();
      } catch {}
    }, 8000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
}
