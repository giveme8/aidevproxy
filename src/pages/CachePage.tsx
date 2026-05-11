import React, { useState, useEffect, useCallback } from "react";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import TextInput from "../components/ui/TextInput";
import Toggle from "../components/ui/Toggle";
import Pagination from "../components/ui/Pagination";
import StatCard from "../components/ui/StatCard";
import ProgressBar from "../components/visualizations/ProgressBar";
import AreaChart from "../components/visualizations/AreaChart";
import {
  IconSearch, IconRefresh, IconTrash, IconFolder,
  IconPip, IconNpm, IconHuggingface, IconDocker,
} from "../components/ui/Icons";
import { invoke } from "../tauri-api";

/* ── types ──────────────────────────────────────────── */

interface CacheEntry {
  name: string; type: string; source: string;
  size_bytes: number; last_used: string; sha256: string; status: string;
}

interface CacheConfig {
  max_size_gb: number; auto_clean: boolean; clean_policy: string;
  clean_threshold_pct: number; min_retention_days: number; cache_dir: string;
}

interface ProxyStats {
  total_requests: number; total_bytes_saved: number;
  total_bytes_transferred: number; mirror_hits: number;
  p2p_hits: number; cache_size_bytes: number;
}

/* ── helpers ─────────────────────────────────────────── */

function fmtBytes(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + " GB";
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + " MB";
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + " KB";
  return bytes + " B";
}

const PER_PAGE = 5;

/* ── main ─────────────────────────────────────────────── */

export default function CachePage() {
  const [entries, setEntries] = useState<CacheEntry[]>([]);
  const [stats, setStats] = useState<ProxyStats | null>(null);
  const [cacheConfig, setCacheConfig] = useState<CacheConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("全部");
  const [sourceFilter, setSourceFilter] = useState("全部");
  const [selectedRow, setSelectedRow] = useState<CacheEntry | null>(null);
  const [page, setPage] = useState(1);
  const [autoClean, setAutoClean] = useState(true);
  const [cleanThreshold, setCleanThreshold] = useState("90%");
  const [cleanPriority, setCleanPriority] = useState("LRU");
  const [minRetention, setMinRetention] = useState("7天");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [e, s, c] = await Promise.all([
        invoke<CacheEntry[]>("get_cache_entries"),
        invoke<ProxyStats>("get_stats"),
        invoke<CacheConfig>("get_cache_config"),
      ]);
      setEntries(e);
      setStats(s);
      setCacheConfig(c);
      if (c) {
        setAutoClean(c.auto_clean);
        setCleanThreshold(`${c.clean_threshold_pct}%`);
        setCleanPriority(c.clean_policy);
        setMinRetention(`${c.min_retention_days}天`);
      }
    } catch {
      // keep current state
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClearCache = async () => {
    try {
      await invoke("clear_cache");
      showToast("缓存已清理");
      await fetchData();
    } catch { showToast("清理失败"); }
  };

  const handleReindex = async () => {
    try {
      await invoke("reindex_cache");
      showToast("索引重建完成");
      await fetchData();
    } catch { showToast("重建索引失败"); }
  };

  const handleOpenDir = async () => {
    try {
      await invoke("open_cache_dir");
      showToast("已打开缓存目录");
    } catch { showToast("打开目录失败"); }
  };

  const handleSaveConfig = async () => {
    try {
      await invoke("update_cache_config", {
        config: {
          auto_clean: autoClean,
          clean_threshold_pct: parseInt(cleanThreshold),
          clean_policy: cleanPriority,
          min_retention_days: parseInt(minRetention),
        },
      });
      showToast("缓存配置已保存");
    } catch { showToast("保存失败"); }
  };

  const filtered = entries.filter((e) => {
    if (searchTerm && !e.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (typeFilter !== "全部" && e.type !== typeFilter) return false;
    if (sourceFilter !== "全部" && e.source !== sourceFilter) return false;
    return true;
  });

  const cacheHitRate = stats && stats.total_requests > 0
    ? Math.round(((stats.mirror_hits + stats.p2p_hits) / stats.total_requests) * 100)
    : 0;

  const cacheSizeBytes = stats?.cache_size_bytes ?? 0;
  const maxSizeBytes = (cacheConfig?.max_size_gb ?? 100) * 1e9;
  const usagePct = maxSizeBytes > 0 ? Math.round((cacheSizeBytes / maxSizeBytes) * 100) : 0;

  const typeStats = entries.reduce((acc, e) => {
    const key = e.source;
    if (!acc[key]) acc[key] = { count: 0, size: 0 };
    acc[key].count++;
    acc[key].size += e.size_bytes;
    return acc;
  }, {} as Record<string, { count: number; size: number }>);

  // Real share-of-cache: each source's bytes as a percent of the sum across
  // tracked sources. Falls back to 0 when no entries.
  const totalTracked =
    (typeStats["HuggingFace"]?.size ?? 0) +
    (typeStats["PyPI"]?.size ?? 0) +
    (typeStats["npm"]?.size ?? 0) +
    (typeStats["Docker Hub"]?.size ?? 0);
  const pctOf = (n: number) =>
    totalTracked > 0 ? Math.round((n / totalTracked) * 100) : 0;

  const cacheTypeCards = [
    { icon: <IconHuggingface size={28} />, type: "HuggingFace", size: fmtBytes(typeStats["HuggingFace"]?.size ?? 0), files: typeStats["HuggingFace"]?.count ?? 0, pct: pctOf(typeStats["HuggingFace"]?.size ?? 0), color: "#facc15" },
    { icon: <IconPip size={28} />, type: "PyPI", size: fmtBytes(typeStats["PyPI"]?.size ?? 0), files: typeStats["PyPI"]?.count ?? 0, pct: pctOf(typeStats["PyPI"]?.size ?? 0), color: "#60a5fa" },
    { icon: <IconNpm size={28} />, type: "npm", size: fmtBytes(typeStats["npm"]?.size ?? 0), files: typeStats["npm"]?.count ?? 0, pct: pctOf(typeStats["npm"]?.size ?? 0), color: "#f87171" },
    { icon: <IconDocker size={28} />, type: "Docker", size: fmtBytes(typeStats["Docker Hub"]?.size ?? 0), files: typeStats["Docker Hub"]?.count ?? 0, pct: pctOf(typeStats["Docker Hub"]?.size ?? 0), color: "#4ade80" },
  ];

  const columns = ["名称", "类型", "来源", "大小", "最后使用", "SHA-256", "状态"];
  // No timeseries source available yet — only render the chart when real data
  // arrives from the backend (none in this build).
  const areaData: number[] = [];
  const areaLabels: string[] = [];

  return (
    <div className="bg-surface-canvas text-content-primary h-full overflow-auto p-6">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start">
        {/* LEFT COLUMN */}
        <div className="min-w-0">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
            <Card>
              <div className="text-xs text-content-secondary mb-[10px]">缓存用量</div>
              <div className="text-2xl font-bold font-mono mb-[6px]">
                {fmtBytes(cacheSizeBytes)} <span className="text-sm text-content-tertiary font-medium">/ {fmtBytes(maxSizeBytes)}</span>
              </div>
              <ProgressBar value={usagePct} max={100} height={6} color="#22c55e" />
              <div className="mt-2 text-xs text-content-tertiary font-mono">
                {cacheConfig?.cache_dir ?? "—"}
              </div>
            </Card>
            <StatCard label="命中率" value={`${cacheHitRate}%`} sub={stats ? `共 ${stats.total_requests.toLocaleString()} 次请求` : undefined} />
            <StatCard label="节省带宽" value={fmtBytes(stats?.total_bytes_saved ?? 0)} sub={stats && stats.total_bytes_transferred > 0 ? `传输 ${fmtBytes(stats.total_bytes_transferred)}` : undefined} />
            <StatCard label="缓存条目" value={String(entries.length)} sub={entries.length > 0 ? `命中率 ${cacheHitRate}%` : "暂无缓存"} />
          </div>

          {/* Cache Type Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
            {cacheTypeCards.map((c) => (
              <Card key={c.type} padding={14}>
                <div className="flex items-center gap-2 mb-2">
                  {c.icon}
                  <div>
                    <div className="text-xs font-semibold text-content-primary">{c.type}</div>
                    <div className="text-xs text-content-tertiary">{c.size} / {c.files} files</div>
                  </div>
                </div>
                <ProgressBar value={c.pct} max={100} height={4} color={c.color} />
              </Card>
            ))}
          </div>

          {/* Cache Files Table */}
          <Card title="缓存文件" action={<div className="text-xs text-content-tertiary">{filtered.length} 项</div>}>
            <div className="flex gap-2 items-center flex-wrap mb-3">
              <TextInput value={searchTerm} onChange={setSearchTerm} placeholder="搜索文件..." icon={<IconSearch size={14} />} style={{ width: 180 }} />
              <Select value={typeFilter} options={["全部", "模型", "包", "镜像层"]} onChange={setTypeFilter} size="sm" />
              <Select value={sourceFilter} options={["全部", "HuggingFace", "PyPI", "npm", "Docker Hub"]} onChange={setSourceFilter} size="sm" />
              <Button size="sm" variant="ghost" icon={<IconRefresh size={12} />} onClick={fetchData}>刷新</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr>{columns.map((c) => <th key={c} className="text-left text-xs font-semibold text-content-tertiary px-3 py-2 border-b border-edge-default uppercase tracking-[0.5px]">{c}</th>)}</tr></thead>
                <tbody>
                  {filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((e) => {
                    const isSel = selectedRow?.sha256 === e.sha256;
                    return (
                      <tr key={e.sha256} onClick={() => setSelectedRow(e)} className={`cursor-pointer transition-colors duration-150 ${isSel ? "bg-[rgba(34,197,94,0.06)]" : ""}`}>
                        <td className="px-3 py-2 text-sm border-b border-[rgba(42,45,53,0.4)] align-middle"><span className="font-medium">{e.name}</span></td>
                        <td className="px-3 py-2 text-sm border-b border-[rgba(42,45,53,0.4)] align-middle"><Badge size="sm" color={e.type === "模型" ? "purple" : e.type === "包" ? "blue" : "green"}>{e.type}</Badge></td>
                        <td className="px-3 py-2 text-sm border-b border-[rgba(42,45,53,0.4)] align-middle"><span className="text-xs text-content-secondary">{e.source}</span></td>
                        <td className="px-3 py-2 text-sm border-b border-[rgba(42,45,53,0.4)] align-middle"><span className="font-mono text-xs">{fmtBytes(e.size_bytes)}</span></td>
                        <td className="px-3 py-2 text-sm border-b border-[rgba(42,45,53,0.4)] align-middle"><span className="text-xs text-content-secondary">{e.last_used}</span></td>
                        <td className="px-3 py-2 text-sm border-b border-[rgba(42,45,53,0.4)] align-middle"><span className="font-mono text-xs text-content-tertiary">{e.sha256.slice(0, 16)}...</span></td>
                        <td className="px-3 py-2 text-sm border-b border-[rgba(42,45,53,0.4)] align-middle"><Badge size="sm" color={e.status === "活跃" ? "green" : e.status === "过期" ? "orange" : "red"}>{e.status}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <Pagination page={page} total={filtered.length} onChange={setPage} perPage={PER_PAGE} />
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-4">
          {/* Cache Management Actions */}
          <Card title="缓存管理">
            <div>
              {[
                { icon: <IconTrash size={16} />, title: "清理缓存", desc: "释放空间，删除不要的缓存", variant: "danger" as const, onClick: handleClearCache },
                { icon: <IconRefresh size={16} />, title: "重新索引", desc: "扫描并重建缓存索引", variant: "ghost" as const, onClick: handleReindex },
                { icon: <IconFolder size={16} />, title: "打开缓存目录", desc: "在文件管理器中打开缓存目录", variant: "ghost" as const, onClick: handleOpenDir },
              ].map((a, i, arr) => (
                <button key={i} className={`flex items-start gap-[10px] py-[10px] bg-transparent border-0 cursor-pointer w-full text-left ${i === arr.length - 1 ? "" : "border-b border-edge-default"}`} onClick={a.onClick}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-canvas text-content-secondary shrink-0">
                    {a.icon}
                  </div>
                  <div>
                    <div className={`text-sm font-semibold ${a.variant === "danger" ? "text-red" : "text-content-primary"}`}>{a.title}</div>
                    <div className="text-xs text-content-tertiary mt-0.5">{a.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Usage Trend */}
          <Card title="用量趋势" action={<span className="text-xs text-content-tertiary font-normal">当前 {fmtBytes(cacheSizeBytes)}</span>}>
            {areaData.length > 0 ? (
              <AreaChart data={areaData} width={280} height={120} xLabels={areaLabels} color="#22c55e" />
            ) : (
              <div className="text-xs text-content-tertiary text-center py-6">暂无时序数据</div>
            )}
          </Card>

          {/* Auto Clean Policy */}
          <Card title="自动清理策略" action={<Toggle value={autoClean} onChange={setAutoClean} size="sm" />}>
            <div className={`flex flex-col gap-3 ${autoClean ? "" : "opacity-40"}`}>
              <div className="flex justify-between items-center">
                <span className="text-xs text-content-secondary">清理阈值</span>
                <Select value={cleanThreshold} options={["70%", "80%", "90%", "95%"]} onChange={setCleanThreshold} size="sm" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-content-secondary">优先清理</span>
                <Select value={cleanPriority} options={["LRU", "LFU", "FIFO", "按大小"]} onChange={setCleanPriority} size="sm" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-content-secondary">最小保留时间</span>
                <Select value={minRetention} options={["1天", "3天", "7天", "14天", "30天"]} onChange={setMinRetention} size="sm" />
              </div>
              <Button variant="primary" size="sm" onClick={handleSaveConfig}>保存策略</Button>
            </div>
          </Card>

          {/* Retention Policy */}
          <Card title="保留策略">
            <div className="flex flex-col gap-[10px]">
              {[
                { label: "关键模型", value: "永久保留", color: "#4ade80" },
                { label: "最近使用的项目", value: `${minRetention}`, color: "#60a5fa" },
                { label: "其他项目", value: "7 天", color: "#94a3b8" },
              ].map((r) => (
                <div key={r.label} className="flex justify-between items-center">
                  <div className="flex items-center gap-[6px]">
                    <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: r.color }} />
                    <span className="text-xs text-content-secondary">{r.label}</span>
                  </div>
                  <span className="text-xs font-mono text-content-primary font-medium">{r.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Item Preview */}
          <Card title="条目预览">
            {selectedRow ? (
              <div>
                <div className="flex items-center gap-2 mb-[14px]">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(34,197,94,0.1)] flex items-center justify-center text-green-bright">
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
                  </div>
                  <div className="text-sm font-semibold text-content-primary break-all">{selectedRow.name}</div>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-[6px] text-xs">
                  {[
                    ["类型", selectedRow.type],
                    ["来源", selectedRow.source],
                    ["大小", `${fmtBytes(selectedRow.size_bytes)}`],
                    ["最后使用", selectedRow.last_used],
                    ["SHA-256", <span className="font-mono text-xs text-content-tertiary" key="sha">{selectedRow.sha256.slice(0, 20)}...</span>],
                    ["位置", <span className="font-mono text-xs text-content-secondary" key="loc">~/Library/Caches/aidevproxy/{selectedRow.name.split("/").pop()}</span>],
                  ].map(([label, value]) => (
                    <React.Fragment key={label as string}>
                      <div className="text-content-tertiary">{label}</div>
                      <div className="text-content-primary break-all">{value}</div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-content-tertiary text-center py-6">
                选择一个缓存条目查看详情
              </div>
            )}
          </Card>
        </div>
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
