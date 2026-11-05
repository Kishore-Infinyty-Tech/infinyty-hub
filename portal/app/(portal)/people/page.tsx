"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, KeyRound, Mail, Pencil, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { api, useSession } from "@/lib/session";
import { ROLE_LABEL, timeAgo } from "@/lib/format";
import type { Role } from "@/lib/types";
import { Avatar } from "@/components/fx/effects";
import { Badge, Button, Card, Empty, ErrorNote, Field, Input, Modal, PageHeader, Select, Skeleton, Tabs, useToast } from "@/components/ui";

interface Person {
  id: number; name: string; email: string; role: Role; title: string | null; department: string | null;
  manager_id: number | null; avatar_url: string | null; manager_name: string | null; has_login: boolean; last_login_at: string | null; reports: number;
}

const ROLE_STYLE: Record<Role, string> = {
  founder: "bg-amber-50 text-amber-700 ring-amber-200",
  hr_admin: "bg-violet-50 text-violet-700 ring-violet-200",
  manager: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  employee: "bg-slate-100 text-slate-600 ring-slate-200",
};
const MANAGER_ROLES: Role[] = ["founder", "hr_admin", "manager"];

/** Shown once after creating an account or resetting a password. */
function Credentials({ email, password, onDone }: { email: string; password: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `Email: ${email}\nTemporary password: ${password}`;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-inset ring-emerald-200">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white"><Check className="h-5 w-5" /></span>
        <p className="text-sm text-emerald-900">Account ready. Share these details with the person. The password is shown <b>only now</b>, and they can change it on their Profile page.</p>
      </div>
      <div className="rounded-2xl bg-slate-50 p-4 font-mono text-sm text-slate-800 ring-1 ring-slate-200">
        <p><span className="text-slate-400">Email </span>{email}</p>
        <p className="mt-1"><span className="text-slate-400">Password </span><b>{password}</b></p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => { navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }); }}>
          {copied ? <><Check className="h-4 w-4" />Copied</> : <><Copy className="h-4 w-4" />Copy details</>}
        </Button>
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}

function PersonForm({ mode, people, assignable, person, onClose, onSaved }: { mode: "add" | "edit"; people: Person[]; assignable: Role[]; person?: Person; onClose: () => void; onSaved: () => void }) {
  const { user } = useSession();
  const isManagerCreator = user?.role === "manager";
  const [name, setName] = useState(person?.name ?? "");
  const [email, setEmail] = useState(person?.email ?? "");
  const [role, setRole] = useState<Role>(person?.role ?? assignable[assignable.length - 1] ?? "employee");
  const [title, setTitle] = useState(person?.title ?? "");
  const [dept, setDept] = useState(person?.department ?? "");
  const [managerId, setManagerId] = useState<string>(person?.manager_id ? String(person.manager_id) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);

  const managers = people.filter((p) => MANAGER_ROLES.includes(p.role) && p.id !== person?.id);
  const roleChoices = person && !assignable.includes(person.role) ? [person.role, ...assignable] : assignable;
  const editingSelf = person?.id === user?.id;

  const save = async () => {
    setBusy(true); setError("");
    try {
      if (mode === "add") {
        const r = await api<{ temp_password: string; email: string }>("/api/people", { method: "POST", json: { name, email, role, title, department: dept, manager_id: managerId || null } });
        setCreds({ email: r.email, password: r.temp_password });
      } else {
        await api(`/api/people/${person!.id}`, { method: "PATCH", json: { name, role, title, department: dept, manager_id: managerId || null } });
        onSaved(); onClose();
      }
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save"); } finally { setBusy(false); }
  };

  const reset = async () => {
    setBusy(true); setError("");
    try {
      const r = await api<{ temp_password: string }>(`/api/people/${person!.id}`, { method: "PATCH", json: { reset_password: true } });
      setCreds({ email: person!.email, password: r.temp_password });
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not reset"); } finally { setBusy(false); }
  };

  return (
    <Modal open title={creds ? "Account ready" : mode === "add" ? "Add a person" : `Edit ${person!.name}`} onClose={onClose}
      footer={creds ? undefined : (
        <>
          {mode === "edit" && <Button variant="secondary" onClick={reset} loading={busy} className="mr-auto"><KeyRound className="h-4 w-4" />Reset password</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy} disabled={name.trim().length < 2 || (mode === "add" && !email.trim())}>{mode === "add" ? "Create account" : "Save changes"}</Button>
        </>
      )}>
      {creds ? <Credentials email={creds.email} password={creds.password} onDone={onClose} /> : (
        <>
          {error && <ErrorNote message={error} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" autoFocus /></Field>
            <Field label="Work email" hint={mode === "edit" ? "Email is their login and cannot be changed here." : undefined}><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={mode === "edit"} placeholder="priya@company.com" /></Field>
            <Field label="Role" hint={editingSelf ? "You cannot change your own role." : undefined}>
              <Select value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={editingSelf}>
                {roleChoices.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </Select>
            </Field>
            {isManagerCreator ? (
              <Field label="Reports to"><Input value={`${user?.name} (you)`} disabled /></Field>
            ) : (
              <Field label={role === "employee" ? "Reports to (required)" : "Reports to"}>
                <Select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
                  <option value="">{role === "employee" ? "Choose a manager…" : "No one"}</option>
                  {managers.map((m) => <option key={m.id} value={m.id}>{m.name} · {ROLE_LABEL[m.role]}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Job title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Finance Executive" /></Field>
            <Field label="Department"><Input value={dept} onChange={(e) => setDept(e.target.value)} placeholder="Finance" /></Field>
          </div>
          {mode === "add" && <p className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3.5 py-2.5 text-xs text-indigo-800 ring-1 ring-inset ring-indigo-100"><ShieldCheck className="h-4 w-4 shrink-0" />A temporary password is generated for you after you create the account.</p>}
        </>
      )}
    </Modal>
  );
}

export default function PeoplePage() {
  const { user } = useSession();
  const toast = useToast();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [assignable, setAssignable] = useState<Role[]>([]);
  const [tab, setTab] = useState<"all" | Role>("all");
  const [text, setText] = useState("");
  const [form, setForm] = useState<{ mode: "add" | "edit"; person?: Person } | null>(null);

  const load = useCallback(() => {
    api<{ people: Person[]; assignable: Role[] }>("/api/people").then((r) => { setPeople(r.people); setAssignable(r.assignable); }).catch((e) => { setPeople([]); toast(e.message, "error"); });
  }, [toast]);
  useEffect(load, [load]);

  const canEdit = user?.role === "founder" || user?.role === "hr_admin";
  const shown = useMemo(() => {
    const n = text.trim().toLowerCase();
    return (people ?? []).filter((p) => (tab === "all" || p.role === tab) && (!n || `${p.name} ${p.email} ${p.title ?? ""} ${p.department ?? ""}`.toLowerCase().includes(n)));
  }, [people, tab, text]);
  const count = (r: Role) => (people ?? []).filter((p) => p.role === r).length;

  if (user?.role === "employee") return <Card><Empty icon={<Users className="h-7 w-7" />} title="Managers, HR and the Founder only" hint="Ask your manager if you need an account changed." /></Card>;

  return (
    <>
      <PageHeader
        title="People"
        subtitle={people ? `${people.length} people · you can add ${assignable.map((r) => ROLE_LABEL[r].toLowerCase() + "s").join(", ")}` : "Loading…"}
        actions={
          <>
            <div className="relative w-56 max-w-full"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Find a person…" className="pl-10" /></div>
            <Button onClick={() => setForm({ mode: "add" })}><UserPlus className="h-4 w-4" />Add person</Button>
          </>
        }
      />
      <div className="glass mb-6 rounded-2xl pb-3">
        <Tabs value={tab} onChange={setTab} tabs={[
          { id: "all", label: "Everyone", count: people?.length },
          { id: "founder", label: "Founders", count: count("founder") },
          { id: "hr_admin", label: "HR", count: count("hr_admin") },
          { id: "manager", label: "Managers", count: count("manager") },
          { id: "employee", label: "Employees", count: count("employee") },
        ]} />
      </div>

      {!people ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-44 rounded-3xl" />)}</div>
      ) : shown.length === 0 ? (
        <Card><Empty icon={<Users className="h-7 w-7" />} title="No one matches" hint="Try another word or tab." /></Card>
      ) : (
        <div className="stagger grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <article key={p.id} className={`glass hover-lift group flex h-full flex-col rounded-3xl p-5 ${p.id === user?.id ? "ring-2 ring-indigo-200" : ""}`}>
              <div className="flex items-start gap-3.5">
                <Avatar name={p.name} src={p.avatar_url} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold leading-tight text-slate-900">{p.name}</p>
                  <p className="mt-0.5 truncate text-sm text-slate-600">{p.title ?? "—"}</p>
                  <p className="truncate text-xs text-slate-400">{p.department ?? "—"}</p>
                </div>
                {canEdit && (p.role !== "founder" || user?.role === "founder") && (
                  <button onClick={() => setForm({ mode: "edit", person: p })} aria-label={`Edit ${p.name}`} className="-mr-1 -mt-1 rounded-xl p-2 text-slate-300 opacity-0 transition-all hover:bg-indigo-50 hover:text-indigo-600 focus:opacity-100 group-hover:opacity-100"><Pencil className="h-4 w-4" /></button>
                )}
              </div>

              <dl className="mt-4 space-y-2 border-t border-slate-200/60 pt-4 text-[13px]">
                <div className="flex items-center gap-2.5"><Mail className="h-4 w-4 shrink-0 text-slate-400" /><dd className="truncate text-slate-600">{p.email}</dd></div>
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 shrink-0 text-slate-400" />
                  <dd className="min-w-0 flex-1 truncate text-slate-600">{p.manager_name ? <>Reports to <b className="font-semibold text-slate-800">{p.manager_name}</b></> : <span className="text-slate-500">Top of the organisation</span>}</dd>
                  <span className="shrink-0 text-xs font-medium text-slate-400">{p.reports} {p.reports === 1 ? "report" : "reports"}</span>
                </div>
              </dl>

              <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                <span className="flex items-center gap-1.5">
                  <Badge className={ROLE_STYLE[p.role]}>{ROLE_LABEL[p.role]}</Badge>
                  {p.id === user?.id && <Badge className="bg-indigo-600 text-white ring-indigo-600">You</Badge>}
                </span>
                {p.has_login
                  ? <Badge className="whitespace-nowrap bg-emerald-50 text-emerald-700 ring-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{p.last_login_at ? `Active ${timeAgo(p.last_login_at)}` : "Invited"}</Badge>
                  : <Badge className="whitespace-nowrap bg-slate-100 text-slate-500 ring-slate-200">No login</Badge>}
              </div>
            </article>
          ))}
        </div>
      )}

      {form && people && <PersonForm mode={form.mode} person={form.person} people={people} assignable={assignable} onClose={() => setForm(null)} onSaved={load} />}
    </>
  );
}
