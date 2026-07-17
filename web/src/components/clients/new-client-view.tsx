"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientForm } from "./client-form";
import { BackButton } from "@/components/back-button";

export function NewClientView() {
  const router = useRouter();

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <div className="flex items-center gap-3">
        <BackButton href="/clients" label="Back to clients" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New client</h1>
          <p className="text-sm text-muted-foreground">
            Projects and tasks hang off clients.
          </p>
        </div>
      </div>

      <ClientForm
            client={null}
            onDone={() => router.push("/clients")}
            onCancel={() => router.push("/clients")}
          />
    </div>
  );
}
