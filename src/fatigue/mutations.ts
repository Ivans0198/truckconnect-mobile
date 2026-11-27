import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";

import { api } from "@/api/client";

import {
  classifyFatigueActionError,
  FatigueActionFailed,
} from "./action-error";
import type { FatigueActionError } from "./action-error";
import type { FatigueAction } from "./fatigue-actions";
import {
  FATIGUE_EVENTS_KEY,
  FATIGUE_STATUS_KEY,
  FATIGUE_WEEK_KEY,
} from "./queries";
import type { FatigueStatus } from "./types";

const POST_BY_ACTION = {
  "start-day": () => api.POST("/fatigue/start-day"),
  "start-break": () => api.POST("/fatigue/start-break"),
  "end-break": () => api.POST("/fatigue/end-break"),
  "end-day": () => api.POST("/fatigue/end-day"),
} as const;

async function postFatigueAction(
  action: FatigueAction,
): Promise<FatigueStatus> {
  let result: Awaited<ReturnType<(typeof POST_BY_ACTION)[FatigueAction]>>;
  try {
    result = await POST_BY_ACTION[action]();
  } catch (thrown) {
    throw new FatigueActionFailed(classifyFatigueActionError({ thrown }));
  }
  if (result.data) return result.data;
  throw new FatigueActionFailed(
    classifyFatigueActionError({
      status: result.response.status,
      body: result.error,
    }),
  );
}

// Sin reintentos ni cola: el back fecha el evento al recibirlo, y mandarlo
// tarde falsearía el registro HVNL (research R3, FR-017).
export function useFatigueAction(
  action: FatigueAction,
): UseMutationResult<FatigueStatus, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => postFatigueAction(action),
    retry: 0,
    onSuccess: (status) => {
      queryClient.setQueryData(FATIGUE_STATUS_KEY, status);
      void queryClient.invalidateQueries({ queryKey: FATIGUE_EVENTS_KEY });
      void queryClient.invalidateQueries({ queryKey: FATIGUE_WEEK_KEY });
    },
    onError: (error) => {
      // Un rechazo suele significar que el estado cambió desde otro lugar.
      if (actionErrorOf(error)?.kind === "rejected") {
        void queryClient.invalidateQueries({ queryKey: FATIGUE_STATUS_KEY });
      }
    },
  });
}

export function actionErrorOf(error: Error | null): FatigueActionError | null {
  return error instanceof FatigueActionFailed ? error.error : null;
}
