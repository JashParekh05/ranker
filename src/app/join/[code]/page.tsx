"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { store } from "@/lib/store";
import { addJoined } from "@/lib/joined";
import { Button, Card } from "@/components/ui";

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "notfound">("loading");

  useEffect(() => {
    let active = true;
    store.getGroupChatByCode(String(code)).then((gc) => {
      if (!active) return;
      if (gc) {
        addJoined(gc.id);
        router.replace(`/gc/${gc.id}`);
      } else setStatus("notfound");
    });
    return () => {
      active = false;
    };
  }, [code, router]);

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <Card className="max-w-sm p-8 text-center">
        {status === "loading" ? (
          <>
            <div className="mb-2 font-display text-xl font-700 text-ink">
              Joining…
            </div>
            <div className="text-sm text-muted">
              Looking up group{" "}
              <span className="font-mono tracking-widest text-brand-200">
                {String(code).toUpperCase()}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="mb-2 font-display text-xl font-700 text-ink">
              No group with that code
            </div>
            <p className="mb-4 text-sm text-muted">
              Double-check the code, or head to the home page.
            </p>
            <Button onClick={() => router.replace("/")}>Go home</Button>
          </>
        )}
      </Card>
    </main>
  );
}
