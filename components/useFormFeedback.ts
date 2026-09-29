"use client";

import { useEffect, type RefObject } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import { useCloseDialog } from "@/components/ui/form-dialog";
import type { ActionState } from "@/lib/action-state";

// One place for what every form did by hand: toast the result, and on
// success reset the form, run extra cleanup, and close the surrounding dialog.
export function useFormFeedback(
  state: ActionState,
  formRef: RefObject<HTMLFormElement>,
  onSuccess?: () => void
) {
  const { showToast } = useToast();
  const close = useCloseDialog();

  useEffect(() => {
    if (!state.message) return;
    showToast(state.message, state.success ? "success" : "error");
    if (state.success) {
      formRef.current?.reset();
      onSuccess?.();
      close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
