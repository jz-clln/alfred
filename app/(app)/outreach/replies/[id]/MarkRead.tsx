"use client";

import { useEffect } from "react";
import { markReplyRead } from "../actions";

// Marks the reply as read once you open it. Renders nothing.
export function MarkRead({ id, alreadyRead }: { id: string; alreadyRead: boolean }) {
  useEffect(() => {
    if (!alreadyRead) markReplyRead(id).catch(() => {});
  }, [id, alreadyRead]);
  return null;
}
