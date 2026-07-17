"use client";

import { useRouter } from "next/navigation";
import { ClientForm } from "./client-form";
import { PageHeader } from "@/components/page-header";

export function NewClientView() {
  const router = useRouter();

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <PageHeader
        backHref="/clients"
        backLabel="Back to clients"
        crumbs={[{ label: "Clients", href: "/clients" }, { label: "New" }]}
        title="New client"
        subtitle="Projects and tasks hang off clients."
      />

      <ClientForm
            client={null}
            onDone={() => router.push("/clients")}
            onCancel={() => router.push("/clients")}
          />
    </div>
  );
}
