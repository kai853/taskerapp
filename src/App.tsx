import React, { useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  XSquare,
  Trash2,
  Download,
  MousePointerClick,
  LayoutGrid,
  BarChart3,
  Clock,
  SortAsc,
  Calendar as CalendarIcon,
} from "lucide-react";

/**
 * Project Task Tracker — 完整修正版 (2025-10-28)
 * 
 * 功能：Overview(+月曆)、Board(多選/移欄位)、Progress、Timeline(拖曳/縮放)、
 * Dashboard、Quick Add、一鍵匯出 JSON、ICS 同步、LocalStorage
 * 
 * 所有 JSX 標籤、型別、props 已完全修正，可直接使用
 */

// ===================== Types =====================
export type Priority = "high" | "medium" | "low";
export type Attachment = {
  name: string;
  url: string;
  size?: number;
  type?: string;
  addedAt: string;
  author?: string;
};
export type Comment = { id: string; author?: string; text: string; createdAt: string };
export type Task = {
  id: number;
  title: string;
  owner?: string;
  priority: Priority;
  startDate?: string;
  dueDate?: string;
  progress: number;
  column: string;
  subtasks: { title: string; done: boolean }[];
  attachments?: Attachment[];
  comments?: Comment[];
};
export type Column = { id: string; name: string };

// ===================== Utilities =====================
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
export const formatYMD = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const parseYMD = (s?: string) => {
  if (!s) return new Date();
  const ymd = s.match(/^\d{4}-\d{2}-\d{2}$/);
  if (ymd) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const md = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (md) {
    const y = new Date().getFullYear();
    return new Date(y, Number(md[1]) - 1, Number(md[2]));
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? new Date() : dt;
};

function enumerateDaysInclusive(start: Date, end: Date): string[] {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const out: string[] = [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) out.push(formatYMD(d));
  return out;
}

// ===================== Quick Add Parser =====================
export function parseQuickInput(input: string): Partial<Task> {
  let text = input.trim();
  let owner: string | undefined;
  let priority: Priority = "medium";
  let startDate: string | undefined;
  let dueDate: string | undefined;

  const tok = (src: string, re: RegExp) => {
    const m = src.match(re);
    return m ? { token: m[1], whole: m[0] } : null;
  };
  const at = tok(text, /@([^\s@#/:;,，。]+)/);
  if (at) {
    owner = at.token;
    text = text.replace(at.whole, "").trim();
  }
  const give = tok(text, /給\s*([^\s@#/:;,，。]+)/);
  if (give) {
    owner = give.token;
    text = text.replace(give.whole, "").trim();
  }
  if (/緊急|urgent|high/i.test(text)) {
    priority = "high";
    text = text.replace(/緊急|urgent|high/gi, "").trim();
  }
  if (/低優先|low/i.test(text)) {
    priority = "low";
    text = text.replace(/低優先|low/gi, "").trim();
  }
  const now = new Date();
  const rel = (d: number) => formatYMD(new Date(now.getFullYear(), now.getMonth(), now.getDate() + d));
  if (/明天|tomorrow/i.test(text)) {
    startDate = rel(1);
    dueDate = startDate;
    text = text.replace(/明天|tomorrow/gi, "").trim();
  }
  if (/後天/.test(text)) {
    startDate = rel(2);
    dueDate = startDate;
    text = text.replace(/後天/g, "").trim();
  }
  if (/今天|today/i.test(text)) {
    startDate = rel(0);
    dueDate = startDate;
    text = text.replace(/今天|today/gi, "").trim();
  }
  const r1 = text.match(/(\d{1,2}\/\d{1,2})\s*[-~–]\s*(\d{1,2}\/\d{1,2})/);
  if (r1) {
    startDate = formatYMD(parseYMD(r1[1]));
    dueDate = formatYMD(parseYMD(r1[2]));
    text = text.replace(r1[0], "").trim();
  }
  const r2 = text.match(/(\d{4}-\d{2}-\d{2})\s*[-~–]\s*(\d{4}-\d{2}-\d{2})/);
  if (r2) {
    startDate = formatYMD(parseYMD(r2[1]));
    dueDate = formatYMD(parseYMD(r2[2]));
    text = text.replace(r2[0], "").trim();
  }
  const ymd = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (ymd) {
    const d = formatYMD(parseYMD(ymd[0]));
    startDate = d;
    dueDate = d;
    text = text.replace(ymd[0], "").trim();
  }
  const md = text.match(/\b\d{1,2}\/\d{1,2}\b/);
  if (md) {
    const d = formatYMD(parseYMD(md[0]));
    startDate = d;
    dueDate = d;
    text = text.replace(md[0], "").trim();
  }
  return { title: text || "未命名任務", owner, priority, startDate, dueDate };
}

// ===================== Fixtures =====================
export const initialColumns: Column[] = [
  { id: "todo", name: "待辦" },
  { id: "doing", name: "進行中" },
  { id: "done", name: "已完成" },
];
export const initialTasks: Task[] = [
  {
    id: 1,
    title: "設計首頁 Wireframe",
    owner: "Alice",
    priority: "high",
    startDate: formatYMD(new Date()),
    dueDate: formatYMD(new Date()),
    progress: 60,
    column: "doing",
    subtasks: [],
  },
  {
    id: 2,
    title: "API 規格討論",
    owner: "Bob",
    priority: "medium",
    startDate: formatYMD(new Date()),
    dueDate: formatYMD(new Date()),
    progress: 20,
    column: "todo",
    subtasks: [],
  },
  {
    id: 3,
    title: "登入錯誤修復",
    owner: "Carol",
    priority: "high",
    startDate: formatYMD(new Date()),
    dueDate: formatYMD(new Date()),
    progress: 0,
    column: "todo",
    subtasks: [],
  },
  {
    id: 4,
    title: "單元測試覆蓋率 > 80%",
    owner: "Dave",
    priority: "low",
    startDate: formatYMD(new Date()),
    dueDate: formatYMD(new Date()),
    progress: 100,
    column: "done",
    subtasks: [],
  },
];

// ===================== Small UI =====================
const priorityBadge = (p: Priority) => (
  <span
    className={
      `text-xs px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ` +
      (p === "high"
        ? "bg-red-100 text-red-700 border-red-200"
        : p === "low"
        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
        : "bg-amber-100 text-amber-700 border-amber-200")
    }
  >
    優先：{{ high: "高", medium: "中", low: "低" }[p]}
  </span>
);

const IconBtn = ({
  onClick,
  title,
  children,
  disabled,
  active,
  warn,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
  warn?: boolean;
}) => (
  <button
    onClick={onClick}
    title={title}
    aria-label={title}
    disabled={disabled}
    className={`px-2 py-1 rounded-lg border text-sm transition ` +
      (warn ? "border-red-500 text-red-500 " : "border-gray-300 text-gray-900 ") +
      (active ? "bg-gray-900 text-white " : "bg-white ") +
      (disabled ? "opacity-50 cursor-not-allowed " : "hover:bg-gray-50 ")}
  >
    {children}
  </button>
);

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="p-3 rounded-lg border bg-white">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-lg font-semibold">{value}</div>
  </div>
);

// ===== Month Calendar =====
function CalendarView({ tasks }: { tasks: Task[] }) {
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const start = new Date(year, month, 1);
  const startDay = start.getDay();
  const first = new Date(year, month, 1 - startDay);
  const days = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      const s = t.startDate ? parseYMD(t.startDate) : (t.dueDate ? parseYMD(t.dueDate) : null);
      const e = t.dueDate ? parseYMD(t.dueDate) : (t.startDate ? parseYMD(t.startDate) : null);
      if (!s || !e) return;
      enumerateDaysInclusive(s, e).forEach((k) => {
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(t);
      });
    });
    return map;
  }, [tasks]);
  const label = `${year}-${pad2(month + 1)}`;
  return (
    <div className="p-3 rounded-lg border bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">月曆</div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 rounded border border-gray-300" onClick={() => setAnchor(new Date(year, month - 1, 1))}>
            ←
          </button>
          <span className="text-sm text-gray-700">{label}</span>
          <button className="px-2 py-1 rounded border border-gray-300" onClick={() => setAnchor(new Date(year, month + 1, 1))}>
            →
          </button>
          <button
            className="px-2 py-1 rounded border border-gray-300"
            onClick={() => {
              const d = new Date();
              setAnchor(new Date(d.getFullYear(), d.getMonth(), 1));
            }}
          >
            今天
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-xs text-gray-500 mb-1">
        {["日", "一", "二", "三", "四", "五", "六"].map((w) => (
          <div key={w} className="px-2 py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded">
        {days.map((d, i) => {
          const ymd = formatYMD(d);
          const inMonth = d.getMonth() === month;
          const list = tasksByDate.get(ymd) || [];
          return (
            <div key={i} className={`bg-white p-2 min-h-[78px] ${inMonth ? "opacity-100" : "opacity-60"}`}>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-700">{d.getDate()}</span>
                {list.length > 0 && (
                  <span className="text-[10px] px-1 rounded-full bg-blue-100 text-blue-700">{list.length}</span>
                )}
              </div>
              <div className="mt-1 space-y-1">
                {list.slice(0, 2).map((t) => (
                  <div
                    key={t.id}
                    className={`text-[11px] truncate px-1 py-0.5 rounded ${
                      t.priority === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}
                    title={t.title}
                  >
                    {t.title}
                  </div>
                ))}
                {list.length > 2 && <div className="text-[11px] text-gray-500">+{list.length - 2} 更多</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Overview({ tasks }: { tasks: Task[] }) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.progress === 100 || t.column === "done").length;
  const high = tasks.filter((t) => t.priority === "high").length;
  const today = new Date();
  const todayYMD = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const overdue = tasks.filter((t) => t.dueDate && parseYMD(t.dueDate) < todayYMD && t.column !== "done").length;
  const nextDue = [...tasks]
    .filter((t) => t.dueDate && t.column !== "done")
    .sort((a, b) => +parseYMD(a.dueDate!) - +parseYMD(b.dueDate!))
    .slice(0, 5);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat label="總任務" value={total} />
      <Stat label="已完成" value={done} />
      <Stat label="高優先" value={high} />
      <Stat label="逾期" value={overdue} />
      <div className="col-span-2 md:col-span-4 p-3 rounded-lg border bg-white">
        <div className="text-sm font-medium mb-2">近期到期</div>
        <div className="space-y-1">
          {nextDue.length === 0 && <div className="text-xs text-gray-500">— 無 —</div>}
          {nextDue.map((t) => (
            <div key={t.id} className="text-sm flex justify-between">
              <span className="truncate max-w-[60%]">{t.title}</span>
              <span className="text-gray-500 text-xs">{t.dueDate}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="col-span-2 md:col-span-4">
        <CalendarView tasks={tasks} />
      </div>
    </div>
  );
}

function ProgressView({ tasks }: { tasks: Task[] }) {
  const avg = tasks.length ? Math.round(tasks.reduce((a, t) => a + t.progress, 0) / tasks.length) : 0;
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-600">平均進度</div>
        <div className="flex-1 h-2 bg-gray-200 rounded-full">
          <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${avg}%` }} />
        </div>
        <div className="text-sm font-semibold w-10 text-right">{avg}%</div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {tasks.map((t) => (
          <div key={t.id} className="bg-white border rounded-xl p-3">
            <div className="flex justify-between text-sm">
              <div className="font-medium truncate max-w-[60%]" title={t.title}>
                {t.title}
              </div>
              <div className="text-gray-500">{t.dueDate || "—"}</div>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full">
              <div className={`h-2 rounded-full ${t.progress === 100 ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${t.progress}%` }} />
            </div>
            <div className="mt-1 text-xs text-gray-500">{t.progress}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ tasks, columns }: { tasks: Task[]; columns: Column[] }) {
  const byCol = columns.map((c) => ({ id: c.id, name: c.name, count: tasks.filter((t) => t.column === c.id).length }));
  const byPri = [
    { p: "high", n: tasks.filter((t) => t.priority === "high").length },
    { p: "medium", n: tasks.filter((t) => t.priority === "medium").length },
    { p: "low", n: tasks.filter((t) => t.priority === "low").length }
  ];
  const completion = tasks.length ? Math.round(((tasks.filter((t) => t.progress === 100 || t.column === "done").length) / tasks.length) * 100) : 0;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="bg-white rounded-xl p-3 border">
        <div className="font-semibold mb-2">依欄位</div>
        <div className="space-y-1 text-sm">
          {byCol.map((x) => (
            <div key={x.id} className="flex justify-between">
              <span>{x.name}</span>
              <span className="text-gray-500">{x.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl p-3 border">
        <div className="font-semibold mb-2">依優先級</div>
        <div className="space-y-1 text-sm">
          {byPri.map((x) => (
            <div key={x.p} className="flex justify-between">
              <span>{x.p}</span>
              <span className="text-gray-500">{x.n}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl p-3 border">
        <div className="font-semibold mb-2">完成率</div>
        <div className="h-2 bg-gray-200 rounded-full">
          <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${completion}%` }} />
        </div>
        <div className="mt-1 text-sm text-gray-600">{completion}%</div>
      </div>
    </div>
  );
}

// ===== Timeline (拖曳移動/縮放日期) =====
function TimelineEx({
  tasks,
  dayWidth = 24,
  onSelect,
  onAdjustDates,
}: {
  tasks: Task[];
  dayWidth?: number;
  onSelect?: (t: Task) => void;
  onAdjustDates?: (id: number, action: { type: "move" | "resize-start" | "resize-end"; delta: number }) => void;
}) {
  const [drag, setDrag] = useState<{
    id: number;
    startX: number;
    lastDelta: number;
    type: "move" | "resize-start" | "resize-end";
  } | null>(null);

  const minDate = useMemo(() => {
    const dates = tasks.flatMap((t) => [t.startDate, t.dueDate].filter(Boolean) as string[]);
    return dates.length ? dates.map(parseYMD).reduce((a, b) => (a < b ? a : b)) : new Date();
  }, [tasks]);
  const maxDate = useMemo(() => {
    const dates = tasks.flatMap((t) => [t.startDate, t.dueDate].filter(Boolean) as string[]);
    return dates.length ? dates.map(parseYMD).reduce((a, b) => (a > b ? a : b)) : new Date();
  }, [tasks]);

  const days = Math.max(1, Math.ceil((+maxDate - +minDate) / (1000 * 60 * 60 * 24)) + 1);
  const startDrag = (
    e: React.MouseEvent,
    id: number,
    type: "move" | "resize-start" | "resize-end"
  ) => {
    e.stopPropagation();
    setDrag({ id, startX: e.clientX, lastDelta: 0, type });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag) return;
    const deltaPx = e.clientX - drag.startX;
    const deltaDays = Math.round(deltaPx / dayWidth);
    if (deltaDays !== drag.lastDelta) setDrag({ ...drag, lastDelta: deltaDays });
  };
  const finishDrag = () => {
    if (!drag) return;
    if (drag.lastDelta !== 0) onAdjustDates?.(drag.id, { type: drag.type, delta: drag.lastDelta });
    setDrag(null);
  };

  return (
    <div className="relative overflow-x-auto select-none" onMouseMove={onMouseMove} onMouseUp={finishDrag} onMouseLeave={finishDrag}>
      <div className="min-w-[600px]">
        <div className="flex text-xs text-gray-500 mb-2">
          {Array.from({ length: days }).map((_, i) => (
            <div key={i} style={{ width: dayWidth }} className="text-center">
              {new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate() + i).getDate()}
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {tasks.map((t) => {
            const s = t.startDate ? parseYMD(t.startDate) : minDate;
            const e = t.dueDate ? parseYMD(t.dueDate) : s;
            const offset = Math.max(0, Math.floor((+s - +minDate) / (1000 * 60 * 60 * 24)));
            const span = Math.max(1, Math.floor((+e - +s) / (1000 * 60 * 60 * 24)) + 1);
            const isDragging = drag?.id === t.id;
            const dx = isDragging && drag?.type === "move" ? drag!.lastDelta * dayWidth : 0;
            const dwLeft = isDragging && drag?.type === "resize-start" ? drag!.lastDelta * dayWidth : 0;
            const dwRight = isDragging && drag?.type === "resize-end" ? drag!.lastDelta * dayWidth : 0;
            const left = offset * dayWidth + dx + dwLeft;
            const width = span * dayWidth - dwLeft + dwRight;
            return (
              <div key={t.id} className="flex items-center gap-2">
                <div className="text-xs w-40 truncate" title={t.title}>
                  {t.title}
                </div>
                <div className="relative h-6 flex-1">
                  <div className="absolute left-0 top-2 right-0 h-px bg-gray-200" />
                  <div
                    className={`absolute top-0 h-6 rounded ${t.priority === "high" ? "bg-red-300" : "bg-blue-300"} cursor-grab active:cursor-grabbing shadow`}
                    style={{ left, width }}
                    onMouseDown={(e) => startDrag(e, t.id, "move")}
                    onClick={() => onSelect?.(t)}
                    title="拖曳以整段調整日期"
                  >
                    <div
                      onMouseDown={(e) => startDrag(e, t.id, "resize-start")}
                      className="absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-black/10 rounded-l"
                      title="調整開始日"
                    />
                    <div
                      onMouseDown={(e) => startDrag(e, t.id, "resize-end")}
                      className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-black/10 rounded-r"
                      title="調整截止日"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===================== Task Modal =====================
function TaskModal({
  task,
  columns,
  onClose,
  onSave,
  onDelete,
  currentUser,
  onSyncCalendar,
}: {
  task: Task;
  columns: Column[];
  onClose: () => void;
  onSave: (t: Task) => void;
  onDelete: (id: number) => void;
  currentUser: string;
  onSyncCalendar: (t: Task) => Promise<void>;
}) {
  const [local, setLocal] = useState<Task>(task);
  const [newSub, setNewSub] = useState("");
  const [newCom, setNewCom] = useState("");

  useEffect(() => {
    setLocal(task);
  }, [task]);

  const onFiles = (fs: FileList | null) => {
    if (!fs?.length) return;
    const arr = Array.from(fs).map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
      size: f.size,
      type: f.type,
      addedAt: new Date().toISOString(),
      author: currentUser,
    }));
    setLocal((p) => ({ ...p, attachments: [...(p.attachments || []), ...arr] }));
  };
  const rmAtt = (i: number) =>
    setLocal((p) => {
      const a = [...(p.attachments || [])];
      a.splice(i, 1);
      return { ...p, attachments: a };
    });
  const addSub = () => {
    if (!newSub.trim()) return;
    setLocal((p) => ({ ...p, subtasks: [...(p.subtasks || []), { title: newSub.trim(), done: false }] }));
    setNewSub("");
  };
  const addCom = () => {
    if (!newCom.trim()) return;
    setLocal((p) => ({
      ...p,
      comments: [
        ...(p.comments || []),
        { id: Math.random().toString(36).slice(2), text: newCom.trim(), createdAt: new Date().toISOString(), author: currentUser },
      ],
    }));
    setNewCom("");
  };
  const delCom = (id: string) => setLocal((p) => ({ ...p, comments: (p.comments || []).filter((c) => c.id !== id) }));
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(local, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `task-${local.id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="flex items-center gap-2">
      <span className="w-14 text-gray-600">{label}</span>
      {children}
    </label>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-3xl p-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <input
              value={local.title}
              onChange={(e) => setLocal({ ...local, title: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg w-96"
            />
            {priorityBadge(local.priority)}
          </div>
          <div className="flex items-center gap-2">
            <IconBtn onClick={exportJSON} title="匯出">
              <Download size={14} />
            </IconBtn>
            <IconBtn onClick={() => onSyncCalendar(local)} title="同步到行事曆">
              <CalendarIcon size={14} />
            </IconBtn>
            <button onClick={onClose} className="px-2 py-1">
              ✕
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="負責人">
            <input
              value={local.owner || ""}
              onChange={(e) => setLocal({ ...local, owner: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg flex-1"
            />
          </Field>
          <Field label="優先級">
            <select
              value={local.priority}
              onChange={(e) => setLocal({ ...local, priority: e.target.value as Priority })}
              className="px-3 py-2 border border-gray-300 rounded-lg flex-1"
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </Field>
          <Field label="開始">
            <input
              type="date"
              value={local.startDate || ""}
              onChange={(e) => setLocal({ ...local, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg flex-1"
            />
          </Field>
          <Field label="截止">
            <input
              type="date"
              value={local.dueDate || ""}
              onChange={(e) => setLocal({ ...local, dueDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg flex-1"
            />
          </Field>
          <Field label="欄位">
            <select
              value={local.column}
              onChange={(e) => setLocal({ ...local, column: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg flex-1"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="進度">
            <input
              type="number"
              min={0}
              max={100}
              value={local.progress}
              onChange={(e) => setLocal({ ...local, progress: Math.max(0, Math.min(100, Number(e.target.value))) })}
              className="px-3 py-2 border border-gray-300 rounded-lg w-28"
            />
            <span className="text-xs text-gray-500">%</span>
          </Field>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-3">
            <div className="font-medium text-sm mb-2">子任務</div>
            <div className="space-y-2">
              {(local.subtasks || []).map((s, i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={s.done}
                    onChange={(e) => {
                      const arr = [...local.subtasks];
                      arr[i] = { ...arr[i], done: e.target.checked };
                      setLocal({ ...local, subtasks: arr });
                    }}
                  />
                  <input
                    value={s.title}
                    onChange={(e) => {
                      const arr = [...local.subtasks];
                      arr[i] = { ...arr[i], title: e.target.value };
                      setLocal({ ...local, subtasks: arr });
                    }}
                    className="px-2 py-1 border border-gray-200 rounded flex-1"
                  />
                </label>
              ))}
              <div className="flex gap-2">
                <input
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                  placeholder="新增子任務"
                  className="px-2 py-1 border border-gray-300 rounded flex-1"
                />
                <IconBtn onClick={addSub} title="加入子任務">
                  <CheckSquare size={14} />
                </IconBtn>
              </div>
            </div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="font-medium text-sm mb-2">附件</div>
            <input type="file" multiple onChange={(e) => onFiles(e.target.files)} />
            <ul className="mt-2 space-y-2">
              {(local.attachments || []).map((a, i) => (
                <li key={i} className="text-sm flex items-center justify-between gap-2">
                  <a href={a.url} target="_blank" rel="noreferrer" className="truncate underline">
                    {a.name}
                  </a>
                  <button className="text-xs text-red-600" onClick={() => rmAtt(i)}>
                    移除
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 border rounded-lg p-3">
          <div className="font-medium text-sm mb-2">留言</div>
          <div className="space-y-2">
            {(local.comments || []).map((c) => (
              <div key={c.id} className="text-sm border rounded p-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    {c.author || "匿名"} · {new Date(c.createdAt).toLocaleString()}
                  </div>
                  <div>{c.text}</div>
                </div>
                <button className="text-xs text-red-600" onClick={() => delCom(c.id)}>
                  刪除
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={newCom}
                onChange={(e) => setNewCom(e.target.value)}
                placeholder="新增留言"
                className="px-2 py-1 border border-gray-300 rounded flex-1"
              />
              <IconBtn onClick={addCom} title="送出留言">
                <CheckSquare size={14} />
              </IconBtn>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-500">ID: {local.id}</div>
          <div className="flex gap-2">
            <IconBtn onClick={() => onDelete(local.id)} warn title="刪除此任務">
              <Trash2 size={14} />
            </IconBtn>
            <IconBtn onClick={() => onSave(local)} title="儲存變更">
              <CheckSquare size={14} />
            </IconBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== Board =====================
function Board({
  tasks,
  columns,
  onOpen,
  onMove,
  selectMode,
  selected,
  toggleSelected,
}: {
  tasks: Task[];
  columns: Column[];
  onOpen: (t: Task) => void;
  onMove: (id: number, col: string) => void;
  selectMode: boolean;
  selected: Set<number>;
  toggleSelected: (id: number) => void;
}) {
  return (
    <div className="grid md:grid-cols-3 gap-3">
      {columns.map((c) => (
        <div key={c.id} className="bg-white rounded-xl border p-3">
          <div className="font-semibold mb-2">{c.name}</div>
          <div className="space-y-2">
            {tasks
              .filter((t) => t.column === c.id)
              .map((t) => (
                <div key={t.id} className="border rounded-lg p-2 relative">
                  {selectMode && (
                    <input
                      type="checkbox"
                      className="absolute top-2 right-2"
                      checked={selected.has(t.id)}
                      onChange={() => toggleSelected(t.id)}
                    />
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <button className="text-left font-medium truncate max-w-[60%]" title={t.title} onClick={() => onOpen(t)}>
                      {t.title}
                    </button>
                    {priorityBadge(t.priority)}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
                    <span>{t.owner || "—"}</span>
                    <span>Due: {t.dueDate || "—"}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      value={t.column}
                      onChange={(e) => onMove(t.id, e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs"
                    >
                      {columns.map((cc) => (
                        <option key={cc.id} value={cc.id}>
                          移到：{cc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===================== App =====================
export default function TaskTrackerApp() {
  const [columns] = useState<Column[]>(initialColumns);
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const raw = localStorage.getItem("tasks_v3");
      return raw ? (JSON.parse(raw) as Task[]) : initialTasks;
    } catch {
      return initialTasks;
    }
  });
  const [view, setView] = useState<"overview" | "board" | "progress" | "timeline" | "dashboard">("overview");
  const [modal, setModal] = useState<Task | null>(null);
  const [qAdd, setQAdd] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const currentUser = "You";

  // persist
  useEffect(() => {
    localStorage.setItem("tasks_v3", JSON.stringify(tasks));
  }, [tasks]);

  // helpers
  const addTaskFromQuick = () => {
    if (!qAdd.trim()) return;
    const parts = parseQuickInput(qAdd);
    const maxId = tasks.reduce((m, t) => Math.max(m, t.id), 0) + 1;
    const t: Task = {
      id: maxId,
      title: parts.title || "未命名任務",
      owner: parts.owner,
      priority: parts.priority || "medium",
      startDate: parts.startDate,
      dueDate: parts.dueDate,
      progress: 0,
      column: "todo",
      subtasks: [],
      attachments: [],
      comments: [],
    };
    setTasks((p) => [t, ...p]);
    setQAdd("");
  };

  const onMove = (id: number, col: string) => setTasks((list) => list.map((t) => (t.id === id ? { ...t, column: col } : t)));
  const onSaveTask = (t: Task) => {
    setTasks((list) => list.map((x) => (x.id === t.id ? t : x)));
    setModal(null);
  };
  const onDeleteTask = (id: number) => {
    setTasks((list) => list.filter((x) => x.id !== id));
    setModal(null);
  };

  const toggleSelected = (id: number) => {
    setSelected((s) => {
      const ns = new Set(s);
      if (ns.has(id)) ns.delete(id);
      else ns.add(id);
      return ns;
    });
  };
  const clearSelection = () => setSelected(new Set());

  const deleteSelected = () => {
    if (!selected.size) return;
    setTasks((list) => list.filter((t) => !selected.has(t.id)));
    clearSelection();
  };
  const downloadSelected = () => {
    if (!selected.size) return;
    const arr = tasks.filter((t) => selected.has(t.id));
    const blob = new Blob([JSON.stringify(arr, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks-selected-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onAdjustDates = (id: number, action: { type: "move" | "resize-start" | "resize-end"; delta: number }) => {
    setTasks((list) =>
      list.map((t) => {
        if (t.id !== id) return t;
        const s = parseYMD(t.startDate);
        const e = parseYMD(t.dueDate || t.startDate);
        if (action.type === "move") {
          const ns = new Date(s);
          ns.setDate(ns.getDate() + action.delta);
          const ne = new Date(e);
          ne.setDate(ne.getDate() + action.delta);
          return { ...t, startDate: formatYMD(ns), dueDate: formatYMD(ne) };
        }
        if (action.type === "resize-start") {
          const ns = new Date(s);
          ns.setDate(ns.getDate() + action.delta);
          return { ...t, startDate: formatYMD(ns) };
        }
        if (action.type === "resize-end") {
          const ne = new Date(e);
          ne.setDate(ne.getDate() + action.delta);
          return { ...t, dueDate: formatYMD(ne) };
        }
        return t;
      })
    );
  };

  const onSyncCalendar = async (t: Task) => {
    const toICSDate = (d: Date) => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
    const parseOrToday = (s?: string) => (s ? parseYMD(s) : new Date());
    const s = parseOrToday(t.startDate || t.dueDate);
    const e0 = parseOrToday(t.dueDate || t.startDate);
    const e = new Date(e0.getFullYear(), e0.getMonth(), e0.getDate() + 1);

    const uid = `${t.id}-${Date.now()}@task-tracker.local`;
    const now = new Date();
    const dtstamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}T${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}Z`;

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Task Tracker//ICS Export//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${toICSDate(new Date(s.getFullYear(), s.getMonth(), s.getDate()))}`,
      `DTEND;VALUE=DATE:${toICSDate(e)}`,
      `SUMMARY:${t.title.replace(/\n/g, " ")}`,
      t.owner ? `ORGANIZER;CN=${t.owner}:MAILTO:no-reply@example.com` : null,
      `DESCRIPTION:Owner=${t.owner || ""}\\nPriority=${t.priority}\\nProgress=${t.progress}%`,
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .filter(Boolean)
      .join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `task-${t.id}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="sticky top-0 z-40 -mx-4 px-4 py-2 bg-white/90 backdrop-blur border-b flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <IconBtn onClick={() => setView("overview")} active={view === "overview"} title="Overview">
            <LayoutGrid size={16} />
          </IconBtn>
          <IconBtn onClick={() => setView("board")} active={view === "board"} title="Board">
            <MousePointerClick size={16} />
          </IconBtn>
          <IconBtn onClick={() => setView("progress")} active={view === "progress"} title="Progress">
            <BarChart3 size={16} />
          </IconBtn>
          <IconBtn onClick={() => setView("timeline")} active={view === "timeline"} title="Timeline">
            <Clock size={16} />
          </IconBtn>
          <IconBtn onClick={() => setView("dashboard")} active={view === "dashboard"} title="Dashboard">
            <BarChart3 size={16} />
          </IconBtn>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={qAdd}
            onChange={(e) => setQAdd(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTaskFromQuick()}
            placeholder="快速新增：任務 @負責人 10/27 緊急"
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm w-80"
          />
          <IconBtn onClick={addTaskFromQuick} title="新增任務">
            +
          </IconBtn>
          {view === "board" && (
            <>
              <IconBtn onClick={() => setSelectMode(!selectMode)} active={selectMode} title="多選模式">
                <CheckSquare size={14} />
              </IconBtn>
              {selectMode && (
                <>
                  <IconBtn onClick={deleteSelected} warn title="刪除選取">
                    <Trash2 size={14} />
                  </IconBtn>
                  <IconBtn onClick={downloadSelected} title="匯出選取">
                    <Download size={14} />
                  </IconBtn>
                  <IconBtn onClick={clearSelection} title="清除選取">
                    <XSquare size={14} />
                  </IconBtn>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-4">
        {view === "overview" && <Overview tasks={tasks} />}
        {view === "board" && (
          <Board
            tasks={tasks}
            columns={columns}
            onOpen={setModal}
            onMove={onMove}
            selectMode={selectMode}
            selected={selected}
            toggleSelected={toggleSelected}
          />
        )}
        {view === "progress" && <ProgressView tasks={tasks} />}
        {view === "timeline" && <TimelineEx tasks={tasks} onSelect={setModal} onAdjustDates={onAdjustDates} />}
        {view === "dashboard" && <Dashboard tasks={tasks} columns={columns} />}
      </div>

      {modal && (
        <TaskModal
          task={modal}
          columns={columns}
          onClose={() => setModal(null)}
          onSave={onSaveTask}
          onDelete={onDeleteTask}
          currentUser={currentUser}
          onSyncCalendar={onSyncCalendar}
        />
      )}
    </div>
  );
}