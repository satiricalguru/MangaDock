"use client";

import { useEffect } from "react";
import { syncToAccount } from "@/lib/track";

export default function SyncOnLogin({ userId }: { userId: number | null }) {
  useEffect(() => {
    if (userId) syncToAccount(userId);
  }, [userId]);
  return null;
}
