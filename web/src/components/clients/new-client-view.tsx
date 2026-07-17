"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClientForm } from "./client-form";

export function NewClientView() {
  const router = useRouter();

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      <div className="flex items-center gap-3">
        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label="Back to clients"
        >
          <Link href="/clients">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New client</h1>
          <p className="text-sm text-muted-foreground">
            Projects and tasks hang off clients.
          </p>
        </div>
      </div>

      <Card>
        <CardContent>
          <ClientForm
            client={null}
            onDone={() => router.push("/clients")}
            onCancel={() => router.push("/clients")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
