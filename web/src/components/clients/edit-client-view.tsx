"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2 } from "lucide-react";
import { HeaderChip, PageHeader } from "@/components/page-header";
import { api } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientForm, type ClientRow } from "./client-form";
import { BackButton } from "@/components/back-button";

export function EditClientView({ clientId }: { clientId: string }) {
  const router = useRouter();

  const clientQuery = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => api<ClientRow>(`/api/v1/clients/${clientId}`),
  });

  if (clientQuery.isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-5">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const client = clientQuery.data?.data;
  if (!client) {
    return (
      <div className="grid justify-items-center gap-3 py-20 text-center">
        <p className="font-medium">Client not found</p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/clients">
            <ArrowLeft /> Back to clients
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <PageHeader
        backHref="/clients"
        backLabel="Back to clients"
        crumbs={[
          { label: "Clients", href: "/clients" },
          { label: client.name },
          { label: "Edit" },
        ]}
        title={`Edit ${client.name}`}
        chips={
          client.companyName ? (
            <HeaderChip icon={Building2}>{client.companyName}</HeaderChip>
          ) : undefined
        }
      />

      <ClientForm
            client={client}
            onDone={() => router.push("/clients")}
            onCancel={() => router.push("/clients")}
          />
    </div>
  );
}
