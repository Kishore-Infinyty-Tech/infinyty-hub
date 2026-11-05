import { Wrench } from "lucide-react";
import { Card, Empty, PageHeader } from "./ui";

/** The page frame Dev B's screens drop into. The shell, header and role checks come from Dev A's layout. */
export function DevBSlot({ title, subtitle, contract }: { title: string; subtitle: string; contract: string[] }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <Empty
          icon={<Wrench className="h-7 w-7" />}
          title="Built by the workflow track"
          hint="This screen is owned by Dev B and renders inside this shell. It will read and write these tables:"
          action={<ul className="mt-1 flex flex-wrap justify-center gap-2">{contract.map((c) => <li key={c} className="rounded-full bg-indigo-50 px-3 py-1 font-mono text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-100">{c}</li>)}</ul>}
        />
      </Card>
    </>
  );
}
