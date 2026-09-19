"use client";

import * as React from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select, FieldHint } from "@/components/ui/input";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { api } from "@/hooks/use-api";
import type { ScheduleDay, ScheduleSession, Speaker } from "@/types";

/**
 * Schedule studio — manage the day-by-day program (Day 1…N), each with its
 * sessions: title, timing, venue, track and assigned speakers. Powers the
 * public tabbed schedule component.
 */

interface DayDraft {
  id?: string;
  day: number;
  label: string;
  dateISO: string;
  note: string;
  status: "draft" | "published" | "archived";
  sessions: ScheduleSession[];
}

function toDraft(d: ScheduleDay): DayDraft {
  return {
    id: d.id,
    day: d.day,
    label: d.label,
    dateISO: d.dateISO ? d.dateISO.slice(0, 10) : "",
    note: d.note ?? "",
    status: d.status,
    sessions: d.sessions.map((s) => ({ ...s })),
  };
}

export default function AdminSchedulePage() {
  const [days, setDays] = React.useState<ScheduleDay[] | null>(null);
  const [speakers, setSpeakers] = React.useState<Speaker[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<DayDraft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<ScheduleDay | null>(null);
  const { toast } = useToast();

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const [sched, spk] = await Promise.all([
        api<{ items: ScheduleDay[] }>("/api/admin/schedule"),
        api<{ items: Speaker[] }>("/api/admin/speakers"),
      ]);
      setDays(sched.items);
      setSpeakers(spk.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load schedule");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function newDay(): DayDraft {
    const nextDay = (days?.reduce((m, d) => Math.max(m, d.day), 0) ?? 0) + 1;
    return { day: nextDay, label: `Day ${nextDay}`, dateISO: "", note: "", status: "published", sessions: [] };
  }

  function newSession(day: number): ScheduleSession {
    return {
      id: `s-${day}-${Date.now()}`,
      title: "",
      description: "",
      startTime: "09:00",
      endTime: "",
      venue: "",
      track: "",
      speakerIds: [],
    };
  }

  async function save() {
    if (!draft) return;
    if (draft.sessions.some((s) => s.title.trim().length < 2)) {
      toast({ kind: "error", title: "Sessions need titles", message: "Every session needs a title of at least 2 characters." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        day: draft.day,
        label: draft.label,
        dateISO: draft.dateISO ? new Date(`${draft.dateISO}T09:00:00`).toISOString() : "",
        note: draft.note,
        status: draft.status,
        sessions: draft.sessions.map((s) => ({ ...s, id: s.id || undefined })),
      };
      const url = draft.id ? `/api/admin/schedule/${draft.id}` : "/api/admin/schedule";
      await api(url, { method: draft.id ? "PATCH" : "POST", body: JSON.stringify(payload) });
      toast({ kind: "success", title: draft.id ? "Day updated" : "Day created", message: "The public schedule reflects the change immediately." });
      setDraft(null);
      await load();
    } catch (e) {
      toast({ kind: "error", title: "Save failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      await api(`/api/admin/schedule/${deleting.id}`, { method: "DELETE" });
      toast({ kind: "success", title: "Day removed" });
      setDeleting(null);
      await load();
    } catch (e) {
      toast({ kind: "error", title: "Delete failed", message: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  function patchSession(index: number, patch: Partial<ScheduleSession>) {
    setDraft((d) =>
      d
        ? { ...d, sessions: d.sessions.map((s, i) => (i === index ? { ...s, ...patch } : s)) }
        : d
    );
  }

  function moveSession(index: number, dir: -1 | 1) {
    setDraft((d) => {
      if (!d) return d;
      const next = [...d.sessions];
      const target = index + dir;
      if (target < 0 || target >= next.length) return d;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...d, sessions: next };
    });
  }

  const speakerById = React.useMemo(() => new Map(speakers.map((s) => [s.id, s])), [speakers]);

  return (
    <>
      <PageHeader
        title="Schedule"
        description="The day-by-day program — sessions, timing, venues and assigned speakers."
        action={
          <Button onClick={() => setDraft(newDay())}>
            <Plus /> New day
          </Button>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !days ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : days.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-7 w-7" />}
          title="No schedule days yet"
          message="Create Day 1 and start adding sessions — they power the tabbed schedule on the public site."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {days.map((day) => (
            <Card key={day.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-sans text-[9.5px] font-semibold uppercase tracking-[0.24em] text-gold-400">
                      {day.dateISO ? new Date(day.dateISO).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "No date set"}
                    </p>
                    <h2 className="mt-1.5 font-serif text-[1.5rem] text-ivory-50">{day.label}</h2>
                  </div>
                  <Badge variant={day.status === "published" ? "success" : "default"}>{day.status}</Badge>
                </div>

                <p className="mt-2 text-[12.5px] text-ivory-500">
                  {day.sessions.length} session{day.sessions.length === 1 ? "" : "s"}
                  {day.note ? ` · ${day.note}` : ""}
                </p>

                <ul className="mt-4 flex-1 space-y-2 border-t border-white/[0.06] pt-4">
                  {day.sessions.slice(0, 4).map((s) => (
                    <li key={s.id} className="flex items-baseline gap-3 text-[13px]">
                      <span className="shrink-0 font-mono text-[11.5px] text-gold-400">{s.startTime}</span>
                      <span className="truncate text-ivory-300">{s.title}</span>
                    </li>
                  ))}
                  {day.sessions.length > 4 && (
                    <li className="text-[12px] text-ivory-500">+{day.sessions.length - 4} more…</li>
                  )}
                  {day.sessions.length === 0 && <li className="text-[12.5px] text-ivory-500">No sessions yet.</li>}
                </ul>

                <div className="mt-5 flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setDraft(toDraft(day))}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(day)}>
                    <Trash2 className="h-4 w-4 text-danger" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* -------- Day editor -------- */}
      <Dialog
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? `Edit ${draft.label}` : "New schedule day"}
        description="Sessions render on the public day tabs in this order."
        wide
      >
        {draft && (
          <div className="grid max-h-[70vh] gap-5 overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Day number *</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={draft.day}
                  onChange={(e) => setDraft({ ...draft, day: Number(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Label</Label>
                <Input
                  value={draft.label}
                  placeholder={`Day ${draft.day}`}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={draft.dateISO}
                  onChange={(e) => setDraft({ ...draft, dateISO: e.target.value })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as DayDraft["status"] })}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Day note</Label>
                <Input
                  value={draft.note}
                  placeholder="Doors open 08:00 · Portfolio sign-ups at 10:00"
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.07] pt-4">
              <h3 className="font-serif text-[1.2rem] text-ivory-50">Sessions</h3>
              <Button variant="ghost" size="sm" onClick={() => setDraft({ ...draft, sessions: [...draft.sessions, newSession(draft.day)] })}>
                <Plus /> Add session
              </Button>
            </div>

            <div className="grid gap-4">
              {draft.sessions.map((s, i) => (
                <div key={s.id} className="rounded-sm border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ivory-500">
                      Session {i + 1}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => moveSession(i, -1)} disabled={i === 0} aria-label="Move up">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => moveSession(i, 1)} disabled={i === draft.sessions.length - 1} aria-label="Move down">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDraft({ ...draft, sessions: draft.sessions.filter((_, j) => j !== i) })}
                        aria-label="Remove session"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-danger" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label>Title *</Label>
                      <Input value={s.title} onChange={(e) => patchSession(i, { title: e.target.value })} placeholder="One Light, Endless Looks" />
                    </div>
                    <div>
                      <Label>Start time</Label>
                      <Input type="time" value={s.startTime} onChange={(e) => patchSession(i, { startTime: e.target.value })} />
                    </div>
                    <div>
                      <Label>End time</Label>
                      <Input type="time" value={s.endTime ?? ""} onChange={(e) => patchSession(i, { endTime: e.target.value })} />
                    </div>
                    <div>
                      <Label>Venue</Label>
                      <Input value={s.venue ?? ""} onChange={(e) => patchSession(i, { venue: e.target.value })} placeholder="Main Stage" />
                    </div>
                    <div>
                      <Label>Track</Label>
                      <Input value={s.track ?? ""} onChange={(e) => patchSession(i, { track: e.target.value })} placeholder="Keynote / Workshop" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        rows={2}
                        className="!min-h-[64px]"
                        value={s.description ?? ""}
                        onChange={(e) => patchSession(i, { description: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Speakers</Label>
                      {speakers.length === 0 ? (
                        <FieldHint>No speakers exist yet — create speakers first.</FieldHint>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {speakers.map((sp) => {
                            const checked = s.speakerIds.includes(sp.id);
                            return (
                              <button
                                key={sp.id}
                                type="button"
                                onClick={() =>
                                  patchSession(i, {
                                    speakerIds: checked
                                      ? s.speakerIds.filter((id) => id !== sp.id)
                                      : [...s.speakerIds, sp.id],
                                  })
                                }
                                className={
                                  "rounded-full border px-3.5 py-1.5 font-sans text-[11.5px] font-semibold transition-colors " +
                                  (checked
                                    ? "border-gold-500/60 bg-gold-500/15 text-gold-200"
                                    : "border-white/12 text-ivory-400 hover:border-gold-500/40 hover:text-gold-200")
                                }
                                aria-pressed={checked}
                              >
                                {sp.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {draft.sessions.length === 0 && (
                <p className="rounded-sm border border-dashed border-white/12 p-6 text-center text-[13px] text-ivory-500">
                  No sessions on this day yet.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-white/[0.07] pt-5">
              <Button variant="ghost" onClick={() => setDraft(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} loading={saving}>
                {draft.id ? "Save day" : "Create day"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={saving}
        title={`Delete ${deleting?.label}?`}
        message="All sessions on this day are removed from the public schedule. This cannot be undone."
        confirmLabel="Delete day"
      />
    </>
  );
}
