import React, { useState } from "react";

// 型別宣告
type Priority = "high" | "medium" | "low";
type Task = {
  id: number;
  title: string;
  owner?: string;
  priority: Priority;
  startDate?: string;
  dueDate?: string;
  progress: number;
  column: string;
  subtasks: { title: string; done: boolean }[];
};
type Column = { id: string; name: string };

// 工具函式
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const formatYMD = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// 初始資料
const initialColumns: Column[] = [
  { id: "todo", name: "待辦" },
  { id: "doing", name: "進行中" },
  { id: "done", name: "已完成" }
];
const initialTasks: Task[] = [
  { id: 1, title: "設計首頁 Wireframe", owner: "Alice", priority: "high", startDate: "2025-10-27", dueDate: "2025-10-29", progress: 60, column: "doing", subtasks: [] },
  { id: 2, title: "API 規格討論", owner: "Bob", priority: "medium", startDate: "2025-10-27", dueDate: "2025-10-27", progress: 20, column: "todo", subtasks: [] }
];

// 優先標籤元件
function PriorityBadge({ p }: { p: Priority }) {
  const style =
    p === "high"
      ? { background: "#fee", color: "#e00" }
      : p === "medium"
      ? { background: "#ffe4b5", color: "#e68a00" }
      : { background: "#e0f7ea", color: "#227c70" };
  return (
    <span style={{ ...style, fontSize: 13, borderRadius: 6, padding: "2px 8px", marginRight: 6 }}>
      優先：{{ high: "高", medium: "中", low: "低" }[p]}
    </span>
  );
}

// App 主介面
function App() {
  const [tasks] = useState<Task[]>(initialTasks);
  const [columns] = useState<Column[]>(initialColumns);

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", background: "#fff", borderRadius: 10, boxShadow: "0 0 4px #ccc", padding: 25 }}>
      <h2>團隊任務追蹤 App</h2>

      {/* 任務看板 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {columns.map(col => (
          <div key={col.id} style={{ background: "#f6f6f7", borderRadius: 10, padding: 12 }}>
            <b>{col.name}</b>
            {tasks.filter(t => t.column === col.id).map(t => (
              <div key={t.id} style={{ borderBottom: "1px solid #eee", padding: "8px 0" }}>
                <PriorityBadge p={t.priority} />
                <span><b>{t.title}</b></span>
                <br />
                <span>負責：{t.owner} 進度：{t.progress}%</span>
                <br />
                <span>期間：{t.startDate ?? "未定義"} ~ {t.dueDate ?? "未定義"}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 月曆 */}
      <div style={{ marginTop: 40 }}>
        <h3>本月任務月曆（簡易）</h3>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              {["日", "一", "二", "三", "四", "五", "六"].map(day => (
                <th key={day} style={{ border: "1px solid #e0e0e0", padding: 6, background: "#f0f0f0" }}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(() => {
              const today = new Date();
              const year = today.getFullYear(), month = today.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              let rows = [], row = [], cell = 0;

              for (let i = 0; i < firstDay; i++, cell++) row.push(<td key={`empty-${cell}`}></td>);
              for (let d = 1; d <= daysInMonth; d++, cell++) {
                const dateStr = `${year}-${pad2(month + 1)}-${pad2(d)}`;
                // 修正型別問題：增加 startDate/dueDate 判斷
                const tlist = tasks.filter(
                  t => t.startDate && t.dueDate && t.startDate <= dateStr && t.dueDate >= dateStr
                );
                row.push(
                  <td key={d} style={{ border: "1px solid #e0e0e0", height: 50, verticalAlign: "top" }}>
                    <b>{d}</b>
                    {tlist.map(t => (
                      <div style={{ fontSize: 11, background: "#ddf", color: "#068", borderRadius: 6, margin: "2px 0", padding: "0 6px" }}>{t.title}</div>
                    ))}
                  </td>
                );
                if (cell % 7 === 6 || d === daysInMonth) { rows.push(<tr>{row}</tr>); row = []; }
              }
              return rows;
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
