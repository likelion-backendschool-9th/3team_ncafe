"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const channelName = "ncafe_auth_sync";
const storageKey = "ncafe_auth_change";

export function SessionSync({ sessionKey }: { sessionKey: string }) {
  const router = useRouter();
  const previousSession = useRef(sessionKey);
  const channel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    let refreshTimer: number | undefined;
    let activeChannel: BroadcastChannel | null = null;

    function refreshSession() {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = undefined;
        router.refresh();
      }, 50);
    }

    function receiveBroadcast(event: MessageEvent<unknown>) {
      if (typeof event.data === "string") refreshSession();
    }

    function receiveStorage(event: StorageEvent) {
      if (event.key === storageKey && event.newValue !== null) refreshSession();
    }

    function refreshVisibleSession() {
      if (document.visibilityState === "visible") refreshSession();
    }

    try {
      if ("BroadcastChannel" in window) {
        activeChannel = new BroadcastChannel(channelName);
        activeChannel.addEventListener("message", receiveBroadcast);
        channel.current = activeChannel;
      }
    } catch {
      // Storage events and focus checks also work when the channel is unavailable.
    }

    window.addEventListener("storage", receiveStorage);
    window.addEventListener("focus", refreshSession);
    window.addEventListener("pageshow", refreshSession);
    window.addEventListener("popstate", refreshSession);
    document.addEventListener("visibilitychange", refreshVisibleSession);

    return () => {
      window.clearTimeout(refreshTimer);
      window.removeEventListener("storage", receiveStorage);
      window.removeEventListener("focus", refreshSession);
      window.removeEventListener("pageshow", refreshSession);
      window.removeEventListener("popstate", refreshSession);
      document.removeEventListener("visibilitychange", refreshVisibleSession);
      activeChannel?.close();
      if (channel.current === activeChannel) channel.current = null;
    };
  }, [router]);

  useEffect(() => {
    if (previousSession.current === sessionKey) return;
    previousSession.current = sessionKey;
    const nonce = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

    // Only an opaque change notification crosses tabs; identity stays in the rendered props.
    try {
      channel.current?.postMessage(nonce);
    } catch {
      // Focus checks remain available if browser messaging is restricted.
    }
    try {
      window.localStorage.setItem(storageKey, nonce);
    } catch {
      // Private browsing may prevent storage access; the channel and focus checks remain.
    }
  }, [sessionKey]);

  return null;
}
