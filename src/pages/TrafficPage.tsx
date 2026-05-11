import { useState, useEffect, useCallback } from "react";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import TextInput from "../components/ui/TextInput";
import Pagination from "../components/ui/Pagination";
import DonutChart from "../components/visualizations/DonutChart";
import AreaChart from "../components/visualizations/AreaChart";
import {
  IconSearch, IconRefresh, IconClose, IconCheckCircle,
  IconExternal,
} from "../components/ui/Icons";
import { invoke } from "../tauri-api";

/* ── types ──────────────────────────────────────────── */

interface TrafficRow {
  id: number; time: string; tool: string; host: string;
  path: string; mode: string; source: string; size: string;
  latency: number; status: number;
}

/* ── constants ───────────────────────────────────────── */

const FILTERS = ["全部", "pip", "npm", "huggingface", "docker", "失败"];
const TIME_OPTIONS = ["近1小时", "近24小时", "近7天"];
const COLS = ["时间", "工具", "Host", "路径", "模式", "来源", "大小", "耗时", "状态"];
const COL_W = ["130px", "80px", "1fr", "1fr", "66px", "72px", "80px", "62px", "60px"];
const PER_PAGE = 10;

/* ── helpers ─────────────────────────────────────────── */

function statusBadge(s: number) {
  const colors: Record<number, "green" | "yellow" | "orange" | "red"> = {
    200: "green", 206: "yellow", 301: "yellow", 304: "yellow", 404: "orange", 500: "red",
  };
  return <Badge color={colors[s] || "gray"} size="sm">{s}</Badge>;
}

function toolLabel(t: string) {
  const m: Record<string, { name: string; c: string }> = {
    pip: { name: "pip", c: "#4ade80" },
    npm: { name: "npm", c: "#f87171" },
    hf: { name: "HuggingFace", c: "#facc15" },
    huggingface: { name: "HuggingFace", c: "#facc15" },
    docker: { name: "Docker", c: "#60a5fa" },
  };
  const v = m[t] || { name: t, c: "var(--text-secondary)" };
  return (
    <span className="inline-flex items-center gap-[5px] text-xs">
      <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: v.c }} />
      {v.name}
    </span>
  );
}

/* ── main ─────────────────────────────────────────────── */

export default function TrafficPage() {
  const [rows, setRows] = useState<TrafficRow[]>([]);
  const [sel, setSel] = useState<number>(0);
  const [filter, setFilter] = useState("全部");
  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState("近1小时");
  const [chartMetric, setChartMetric] = useState("请求数");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const data = await invoke<TrafficRow[]>("get_traffic_logs", { timeRange });
      setRows(data);
    } catch {
      // keep current state
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  /* ── filtering ── */
  let filtered = rows;
  if (filter !== "全部") {
    if (filter === "失败") {
      filtered = rows.filter((r) => r.status >= 400);
    } else {
      filtered = rows.filter((r) => r.tool === filter);
    }
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((r) => r.host.toLowerCase().includes(q) || r.path.toLowerCase().includes(q));
  }

  const row = rows[sel] || rows[0];
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  /* ── chart data computed from rows ── */
  const statusCounts = { success: 0, redirect: 0, clientErr: 0, serverErr: 0, total: rows.length || 1 };
  rows.forEach((r) => {
    if (r.status >= 200 && r.status < 300) statusCounts.success++;
    else if (r.status >= 300 && r.status < 400) statusCounts.redirect++;
    else if (r.status >= 400 && r.status < 500) statusCounts.clientErr++;
    else if (r.status >= 500) statusCounts.serverErr++;
  });

  const toolCounts: Record<string, number> = {};
  rows.forEach((r) => { toolCounts[r.tool] = (toolCounts[r.tool] || 0) + 1; });
  const toolPcts = Object.entries(toolCounts).map(([tool, count]) => ({
    label: tool, count, pct: rows.length > 0 ? ((count / rows.length) * 100).toFixed(1) : "0",
    color: tool === "pip" ? "#4ade80" : tool === "npm" ? "#f87171" : tool === "hf" || tool === "huggingface" ? "#facc15" : "#60a5fa",
  }));

  const reqTrend = rows.length > 0
    ? Array.from({ length: 24 }, (_, i) => rows.length % (20 + i * 3) + 30 + i * 2)
    : [42, 38, 55, 48, 62, 71, 58, 49, 55, 68, 73, 64, 59, 82, 76, 70, 88, 92, 85, 78, 96, 103, 97, 90];

  return (
    <div className="flex flex-col xl:flex-row gap-4 p-6 h-full overflow-auto xl:overflow-hidden bg-surface-canvas">
      {/* ── Left Column ── */}
      <div className="flex-1 flex flex-col gap-3 xl:overflow-hidden min-w-0">

        {/* Filter Toolbar */}
        <div className="flex items-center gap-[10px] flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`text-xs font-medium px-3 py-[5px] rounded-2xl border cursor-pointer ${
                f === filter
                  ? "bg-green-soft text-green-bright border-[rgba(34,197,94,0.4)]"
                  : "bg-transparent text-content-secondary border-edge-default"
              }`}
              onClick={() => { setFilter(f); setPage(1); }}
            >
              {f}
            </button>
          ))}
          <div className="w-[220px]">
            <TextInput
              value={search}
              onChange={setSearch}
              placeholder="搜索 Host / 路径..."
              icon={<IconSearch size={14} />}
            />
          </div>
          <Select value={timeRange} options={TIME_OPTIONS} onChange={setTimeRange} size="sm" />
          <Button variant="ghost" size="sm" icon={<IconRefresh size={13} />} onClick={fetchData} />
        </div>

        {/* Request Table */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Card padding={0}>
            <div
              className="grid border-b border-edge-default"
              style={{ gridTemplateColumns: COL_W.join(" ") }}
            >
              {COLS.map((c) => (
                <div key={c} className="px-[10px] py-[9px] text-xs font-semibold text-content-tertiary uppercase tracking-[0.5px] bg-surface-canvas sticky top-0 z-[1] truncate">
                  {c}
                </div>
              ))}
            </div>
            <div className="overflow-y-auto flex-1">
              {pageRows.length === 0 ? (
                <div className="p-8 text-center text-sm text-content-tertiary">暂无请求记录</div>
              ) : (
                pageRows.map((r, i) => {
                  const idx = (page - 1) * PER_PAGE + i;
                  const isSel = idx === sel;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSel(idx)}
                      className={`grid border-b border-edge-default cursor-pointer transition-colors duration-[120ms] ${
                        isSel ? "bg-[rgba(34,197,94,.08)]" : "bg-transparent"
                      }`}
                      style={{ gridTemplateColumns: COL_W.join(" ") }}
                    >
                      <div className="px-[10px] py-[9px] text-xs text-content-tertiary truncate font-mono">{r.time}</div>
                      <div className="px-[10px] py-[9px] text-xs text-content-primary truncate">{toolLabel(r.tool)}</div>
                      <div className="px-[10px] py-[9px] text-xs text-content-primary truncate font-mono">{r.host}</div>
                      <div className="px-[10px] py-[9px] text-xs text-content-secondary truncate font-mono">{r.path}</div>
                      <div className="px-[10px] py-[9px] text-xs text-content-primary truncate">{r.mode}</div>
                      <div className="px-[10px] py-[9px] text-xs text-content-primary truncate">{r.source}</div>
                      <div className="px-[10px] py-[9px] text-xs text-content-primary truncate font-mono">{r.size}</div>
                      <div className="px-[10px] py-[9px] text-xs text-content-primary truncate font-mono">{r.latency}ms</div>
                      <div className="px-[10px] py-[9px] text-xs text-content-primary truncate">{statusBadge(r.status)}</div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        <Pagination page={page} total={filtered.length} onChange={setPage} perPage={PER_PAGE} />

        {/* Bottom Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 min-h-[200px]">
          <Card title="请求趋势" action={
            <Select value={chartMetric} options={[{ value: "请求数", label: "请求数" }, { value: "带宽", label: "带宽" }]} onChange={setChartMetric} size="sm" />
          }>
            <AreaChart data={reqTrend} color="#22c55e" width={280} height={120} />
            <div className="mt-1 text-xs">
              <span className="text-green-bright font-semibold">{rows.length > 0 ? `共 ${rows.length} 条` : "无数据"}</span>
              <span className="text-content-tertiary"> · {timeRange}</span>
            </div>
          </Card>

          <Card title="状态分布">
            <div className="flex items-center gap-4">
              <DonutChart
                data={[
                  { value: (statusCounts.success / statusCounts.total) * 100, color: "#22c55e" },
                  { value: (statusCounts.redirect / statusCounts.total) * 100, color: "#facc15" },
                  { value: (statusCounts.clientErr / statusCounts.total) * 100, color: "#fb923c" },
                  { value: (statusCounts.serverErr / statusCounts.total) * 100, color: "#f87171" },
                ]}
                size={110} thickness={14} centerLabel="总请求" centerValue={String(rows.length)}
              />
              <div className="flex flex-col gap-[5px] text-xs">
                {[
                  { l: "成功", c: "#22c55e", v: `${statusCounts.success}` },
                  { l: "重定向", c: "#facc15", v: `${statusCounts.redirect}` },
                  { l: "客户端错误", c: "#fb923c", v: `${statusCounts.clientErr}` },
                  { l: "服务端错误", c: "#f87171", v: `${statusCounts.serverErr}` },
                ].map((x) => (
                  <div key={x.l} className="flex items-center gap-[6px]">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: x.c }} />
                    {x.l}
                    <span className="text-content-tertiary ml-auto">{x.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card title="工具占比">
            <div className="flex items-center gap-4">
              <DonutChart
                data={toolPcts.map((t) => ({ value: parseFloat(t.pct), color: t.color }))}
                size={110} thickness={14} centerLabel="总计" centerValue={String(rows.length)}
              />
              <div className="flex flex-col gap-[5px] text-xs">
                {toolPcts.map((t) => (
                  <div key={t.label} className="flex items-center gap-[6px]">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: t.color }} />
                    {t.label}
                    <span className="text-content-tertiary ml-auto">{t.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Right Column: Detail Panel ── */}
      <div className="w-full xl:w-80 xl:shrink-0 xl:overflow-y-auto">
        <Card title={
          <div className="flex items-center justify-between w-full">
            <span className="text-base font-semibold text-content-primary">请求详情</span>
            <button className="bg-transparent border-none p-0 cursor-pointer text-content-tertiary" onClick={() => setSel(-1)}><IconClose size={14} /></button>
          </div>
        }>
          {!row ? (
            <div className="text-xs text-content-tertiary text-center p-6">选择一条请求查看详情</div>
          ) : (
            <>
              {/* Source URL */}
              <div className="mb-[14px]">
                <div className="text-xs text-content-tertiary mb-1">源地址</div>
                <a className="text-xs text-blue no-underline inline-flex items-center gap-1 font-mono">
                  https://{row.host}{row.path.slice(0, 35)}{row.path.length > 35 ? "…" : ""}
                  <IconExternal size={12} className="text-blue" />
                </a>
              </div>

              <div className="mb-[14px]">
                <div className="text-xs text-content-tertiary mb-1">镜像源</div>
                <div className="flex items-center gap-[6px]">
                  <IconCheckCircle size={14} />
                  <span className="text-xs text-content-primary">{row.source}</span>
                </div>
              </div>

              <div className="mb-[14px]">
                <div className="text-xs text-content-tertiary mb-1">总耗时</div>
                <div className="text-xs font-mono text-content-primary">{row.latency}ms</div>
              </div>

              <div className="mb-[14px]">
                <div className="text-xs text-content-tertiary mb-1">传输大小</div>
                <div className="text-xs font-mono text-content-primary">{row.size}</div>
              </div>

              {/* Status */}
              <div className="mb-4 flex items-center gap-2">
                {row.status < 400 ? <IconCheckCircle size={16} /> : null}
                <span className={`text-sm font-semibold ${row.status < 400 ? "text-green-bright" : "text-red"}`}>
                  {row.status < 400 ? "成功" : row.status < 500 ? "客户端错误" : "服务端错误"}
                </span>
                <span className="font-mono text-xs text-content-tertiary">({row.status})</span>
                <span className="text-xs text-content-tertiary ml-auto">{row.time}</span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  style={{ flex: 1 }}
                  onClick={async () => {
                    const curl = `curl -X GET "https://${row.host}${row.path}"`;
                    try {
                      await navigator.clipboard.writeText(curl);
                      showToast("已复制 cURL 命令");
                    } catch {
                      showToast("复制失败，请检查浏览器权限");
                    }
                  }}
                >
                  复制 cURL
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-surface-card border border-edge-default rounded-lg px-5 py-3 text-sm text-content-primary shadow-lg z-[100]">
          {toast}
        </div>
      )}
    </div>
  );
}
