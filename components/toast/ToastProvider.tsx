"use client";

import type { ReactNode } from "react";
import { Toaster, toast } from "sonner";

// Same API as before, so every form keeps calling useToast().showToast().
// Sonner adds swipe to dismiss, pause on hover, stacking and aria-live.
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      {/* mobileOffset keeps toasts above the phone tab bar. */}
      <Toaster
        position="bottom-right"
        mobileOffset={{ bottom: 80, left: 16, right: 16 }}
        toastOptions={{
          classNames: {
            toast: "!rounded-2xl !border-0 !bg-ink !text-paper !shadow-lg !font-sans",
          },
        }}
      />
    </>
  );
}

export function useToast() {
  return {
    showToast: (message: string, type: "success" | "error" = "success") =>
      type === "error" ? toast.error(message) : toast.success(message),
  };
}
