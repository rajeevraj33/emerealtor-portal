// CRM analytics for agents (own leads) and brokerage admins (team-wide).
// Pure presentational — computes everything from the Lead rows passed in.

type Lead = { status: string; sourcePage: string | null; createdAt: Date | string; type: string; assignedAgentId: string | null };

const STATUS_ORDER = ["new", "contacted", "qualified", "viewing", "won", "lost"];
const STATUS_TONE: Record<string, string> = { new: "bg-blue-500", contacted: "bg-amber-500", qualified: "bg-violet-500", viewing: "bg-cyan-500", won: "bg-emerald-500", lost: "bg-gray-400" };

export default function CrmReports({ leads, agents }: { leads: Lead[]; agents?: { id: string; name: string }[] }) {
  const total = leads.length;
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const newThisWeek = leads.filter((l) => +new Date(l.createdAt) >= weekAgo).length;
  const won = leads.filter((l) => l.status === "won").length;
  const conv = total ? Math.round((won / total) * 100) : 0;

  const byStatus: Record<string, number> = {};
  leads.forEach((l) => { byStatus[l.status] = (byStatus[l.status] ?? 0) + 1; });
  const statuses = [...STATUS_ORDER.filter((s) => s in byStatus), ...Object.keys(byStatus).filter((s) => !STATUS_ORDER.includes(s))];
  const maxStatus = Math.max(1, ...Object.values(byStatus));

  const bySource: Record<string, number> = {};
  leads.forEach((l) => { const s = (l.sourcePage || "Direct").replace(/^\//, "") || "Direct"; bySource[s] = (bySource[s] ?? 0) + 1; });
  const sources = Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxSource = Math.max(1, ...sources.map((s) => s[1]));

  // last 8 weeks volume
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = now - (7 - i) * 7 * 86400000;
    const start = end - 7 * 86400000;
    return leads.filter((l) => { const t = +new Date(l.createdAt); return t >= start && t < end; }).length;
  });
  const maxWeek = Math.max(1, ...weeks);

  const board = agents
    ? agents.map((ag) => ({ name: ag.name, count: leads.filter((l) => l.assignedAgentId === ag.id).length })).sort((a, b) => b.count - a.count).slice(0, 8)
    : [];

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Total leads" value={total} />
        <Kpi label="New (7 days)" value={newThisWeek} tone="text-blue-600" />
        <Kpi label="Won" value={won} tone="text-emerald-600" />
        <Kpi label="Conversion" value={`${conv}%`} tone="text-accent" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Lead volume — last 8 weeks">
          <div className="flex items-end gap-1.5 h-28">
            {weeks.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                <div className="w-full rounded-t bg-brand" style={{ height: `${(w / maxWeek) * 100}%`, minHeight: w ? 4 : 0 }} title={`${w} leads`} />
                <span className="text-[10px] text-gray-400">{i === 7 ? "now" : `-${7 - i}w`}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Pipeline by status">
          <div className="space-y-2">
            {statuses.map((s) => (
              <div key={s} className="flex items-center gap-2 text-sm">
                <span className="w-20 shrink-0 capitalize text-gray-600">{s}</span>
                <div className="flex-1 bg-gray-100 rounded h-4 overflow-hidden">
                  <div className={`h-full rounded ${STATUS_TONE[s] ?? "bg-gray-400"}`} style={{ width: `${(byStatus[s] / maxStatus) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-gray-700 font-medium">{byStatus[s]}</span>
              </div>
            ))}
            {!statuses.length && <p className="text-sm text-gray-400">No leads yet.</p>}
          </div>
        </Card>

        <Card title="Lead sources">
          <div className="space-y-2">
            {sources.map(([s, n]) => (
              <div key={s} className="flex items-center gap-2 text-sm">
                <span className="w-28 shrink-0 truncate text-gray-600">{s}</span>
                <div className="flex-1 bg-gray-100 rounded h-4 overflow-hidden"><div className="h-full rounded bg-accent" style={{ width: `${(n / maxSource) * 100}%` }} /></div>
                <span className="w-8 text-right text-gray-700 font-medium">{n}</span>
              </div>
            ))}
            {!sources.length && <p className="text-sm text-gray-400">No sources yet.</p>}
          </div>
        </Card>

        {agents && (
          <Card title="Agent leaderboard">
            <ol className="space-y-1.5 text-sm">
              {board.map((b, i) => (
                <li key={b.name} className="flex items-center justify-between">
                  <span className="text-gray-700"><span className="text-gray-400 mr-2">{i + 1}.</span>{b.name}</span>
                  <span className="font-semibold text-gray-900">{b.count}</span>
                </li>
              ))}
              {!board.length && <p className="text-sm text-gray-400">No agents yet.</p>}
            </ol>
          </Card>
        )}
      </div>
    </section>
  );
}

function Kpi({ label, value, tone = "text-gray-900" }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-xl bg-white ring-1 ring-black/5 p-4">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white ring-1 ring-black/5 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}
