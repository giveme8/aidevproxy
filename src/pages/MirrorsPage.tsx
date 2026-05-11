import { useState, useEffect, useCallback } from "react";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Toggle from "../components/ui/Toggle";
import Select from "../components/ui/Select";
import TextInput from "../components/ui/TextInput";
import Tabs from "../components/ui/Tabs";
import DonutChart from "../components/visualizations/DonutChart";
import AreaChart from "../components/visualizations/AreaChart";
import {
  IconSpeedo, IconPlus, IconRefresh, IconTrash,
  IconChevronLeft, IconChevronRight, IconStar,
} from "../components/ui/Icons";
import { invoke } from "../tauri-api";

/* ── types ────────────────────────────────────────────── */

interface Mirror {
  id: string; name: string; url: string; latency: number; healthy: boolean;
  health_text: string; priority: number; enabled: boolean; last_test: string;
  protocol: string; recommended?: boolean;
  ecosystem?: string;
  fallback_enabled?: boolean;
  max_failures?: number;
  health_check_enabled?: boolean;
  check_interval?: string;
}

/* ── helpers ──────────────────────────────────────────── */

const latencyTextClass = (ms: number): string =>
  ms === 0 ? "text-red" : ms < 300 ? "text-green-bright" : ms < 800 ? "text-yellow" : "text-red";

const latencyBgClass = (ms: number): string =>
  ms === 0 ? "bg-red" : ms < 300 ? "bg-green-bright" : ms < 800 ? "bg-yellow" : "bg-red";

const latencyPct = (ms: number): string =>
  ms === 0 ? "100" : String(Math.min(100, (ms / 3000) * 100));

const TABS = [
  { id: "pypi", label: "PyPI" },
  { id: "npm", label: "npm" },
  { id: "hf", label: "HuggingFace" },
  { id: "conda", label: "Conda" },
  { id: "docker", label: "Docker" },
  { id: "crates", label: "crates.io" },
];

const PER_PAGE = 6;

/* ── main ─────────────────────────────────────────────── */

export default function MirrorsPage() {
  const [mirrors, setMirrors] = useState<Mirror[]>([]);
  const [activeTab, setActiveTab] = useState("pypi");
  const [selectedMirror, setSelectedMirror] = useState<Mirror | null>(null);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingUrl, setEditingUrl] = useState("");
  const [editingProtocol, setEditingProtocol] = useState("HTTPS");
  const [editingPriority, setEditingPriority] = useState("1");
  const [editingFallback, setEditingFallback] = useState(false);
  const [editingMaxFail, setEditingMaxFail] = useState("3");
  const [editingHealthCheck, setEditingHealthCheck] = useState(false);
  const [editingInterval, setEditingInterval] = useState("30秒");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // Pure list refresh. Initial selection is set by the `[activeTab, mirrors]`
  // effect below, and refresh-driven right-panel sync happens in handleRefresh.
  // Keeping zero deps here is what breaks the prior fetch loop — putting
  // selectedMirror in deps plus a setSelectedMirror call inside re-triggers
  // useEffect on every fetch, spamming get_mirrors.
  const fetchData = useCallback(async () => {
    try {
      const m = await invoke<Mirror[]>("get_mirrors");
      setMirrors(m);
    } catch {
      // keep current state
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    // Probe only what the user is currently looking at — full list refresh
    // would block the UI behind 14 sequential HTTP timeouts on slow networks.
    const visible = mirrors.filter((m) => !m.ecosystem || m.ecosystem === activeTab);
    const ids = visible.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((m) => m.id);
    if (ids.length === 0) {
      await fetchData();
      showToast("已刷新");
      return;
    }
    setIsRefreshing(true);
    try {
      const fresh = await invoke<Mirror[]>("probe_mirrors", { ids });
      // Merge probed rows into the existing list, keeping unrelated rows intact.
      setMirrors((prev) => {
        const byId = new Map(fresh.map((m) => [m.id, m]));
        const merged = prev.map((m) => byId.get(m.id) ?? m);
        if (selectedMirror) {
          const updated = byId.get(selectedMirror.id);
          if (updated) setSelectedMirror(updated);
        }
        return merged;
      });
      showToast("已刷新");
    } catch {
      showToast("刷新失败");
    } finally {
      setIsRefreshing(false);
    }
  }, [mirrors, activeTab, page, selectedMirror, fetchData, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When the ecosystem tab switches, re-anchor the editor to the first mirror
  // in the new tab so the right-panel form never displays values from a mirror
  // that the user can no longer see in the table.
  useEffect(() => {
    const first = mirrors.find((m) => !m.ecosystem || m.ecosystem === activeTab);
    if (!first) {
      setSelectedMirror(null);
      return;
    }
    if (!selectedMirror || (selectedMirror.ecosystem && selectedMirror.ecosystem !== activeTab)) {
      setSelectedMirror(first);
      syncEditFields(first);
    }
    setPage(1);
    // syncEditFields is stable (defined inline above) and intentionally
    // excluded from deps to avoid re-running on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, mirrors]);

  const syncEditFields = (m: Mirror) => {
    setEditingName(m.name);
    setEditingUrl(m.url);
    setEditingProtocol(m.protocol);
    setEditingPriority(String(m.priority));
    setEditingFallback(m.fallback_enabled ?? false);
    setEditingMaxFail(String(m.max_failures ?? 3));
    setEditingHealthCheck(m.health_check_enabled ?? false);
    setEditingInterval(m.check_interval ?? "30秒");
  };

  const handleSelect = (m: Mirror) => {
    setSelectedMirror(m);
    syncEditFields(m);
  };

  const handleSpeedTest = async () => {
    try {
      await invoke("test_mirror_speed");
      showToast("镜像测速完成");
      await fetchData();
    } catch { showToast("测速失败"); }
  };

  const handleAddMirror = async () => {
    try {
      await invoke("add_mirror", {
        args: {
          name: "新镜像",
          url: "https://example.com/simple",
          protocol: "HTTPS",
          ecosystem: activeTab,
        },
      });
      showToast("镜像已添加");
      await fetchData();
    } catch { showToast("添加失败"); }
  };

  const handleRemove = async () => {
    if (!selectedMirror) return;
    try {
      await invoke("remove_mirror", { id: selectedMirror.id });
      showToast(`已删除 ${selectedMirror.name}`);
      await fetchData();
    } catch { showToast("删除失败"); }
  };

  const handleToggle = async (m: Mirror) => {
    try {
      await invoke("update_mirror", {
        args: { id: m.id, enabled: !m.enabled },
      });
      await fetchData();
    } catch { showToast("更新失败"); }
  };

  const handleSave = async () => {
    if (!selectedMirror) return;
    try {
      await invoke("update_mirror", {
        args: {
          id: selectedMirror.id,
          name: editingName,
          url: editingUrl,
          protocol: editingProtocol,
          priority: parseInt(editingPriority),
          fallback_enabled: editingFallback,
          max_failures: parseInt(editingMaxFail) || 1,
          health_check_enabled: editingHealthCheck,
          check_interval: editingInterval,
        },
      });
      showToast("镜像配置已保存");
      await fetchData();
    } catch { showToast("保存失败"); }
  };

  /* ── computed ── */
  // Filter by active ecosystem tab. Mirrors without an `ecosystem` field
  // pass through unfiltered, so older entries still render until they are
  // migrated.
  const visibleMirrors = mirrors.filter(
    (m) => !m.ecosystem || m.ecosystem === activeTab,
  );
  const totalPages = Math.max(1, Math.ceil(visibleMirrors.length / PER_PAGE));
  const pageMirrors = visibleMirrors.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Look up from the live mirrors array so the right panel stays in sync
  // after toggles / refreshes (selectedMirror state may be stale).
  const displayMirror = selectedMirror
    ? visibleMirrors.find((m) => m.id === selectedMirror.id) ?? visibleMirrors[0]
    : visibleMirrors[0];

  // Two-state health: 正常 (healthy) / 异常 (unhealthy, incl. timeout & unreachable).
  const healthyCount = visibleMirrors.filter((m) => m.healthy).length;
  const abnormalCount = visibleMirrors.filter((m) => !m.healthy).length;

  const statusDist = visibleMirrors.length > 0
    ? [
      { value: (healthyCount / visibleMirrors.length) * 100, color: "#4ade80" },
      { value: (abnormalCount / visibleMirrors.length) * 100, color: "#ef4444" },
    ]
    : [{ value: 100, color: "#94a3b8" }];

  const DONUT_STATUS_LEGEND = [
    { label: "正常", pct: visibleMirrors.length > 0 ? `${Math.round((healthyCount / visibleMirrors.length) * 100)}%` : "0%", colorClass: "bg-green-bright" },
    { label: "异常", pct: visibleMirrors.length > 0 ? `${Math.round((abnormalCount / visibleMirrors.length) * 100)}%` : "0%", colorClass: "bg-red" },
  ];

  // Snapshot of current latencies per visible mirror — not a time series,
  // labeled accordingly below.
  // Only healthy mirrors contribute to the latency chart / leaderboard.
  const latencyMirrors = visibleMirrors.filter((m) => m.healthy && m.latency > 0);
  const latencySnapshot = latencyMirrors.map((m) => m.latency);
  const latencySnapshotLabels = latencyMirrors.map((m) => m.name);

  /* ── shared class strings ── */
  const thClass = "text-left py-[7px] px-3 text-xs font-semibold text-content-tertiary border-b border-edge-default whitespace-nowrap";
  const tdClass = "py-[7px] px-3 text-xs border-b border-b-[rgba(42,45,53,0.4)] align-middle";
  const secClass = "text-xs font-semibold text-content-tertiary uppercase tracking-[0.8px] mb-[10px] border-b border-edge-default pb-2";
  const rowClass = "flex justify-between items-center py-[7px] text-xs";
  const lblClass = "text-content-tertiary";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 p-6 h-full overflow-auto font-sans bg-surface-canvas text-content-primary">
      {/* LEFT */}
      <div className="flex flex-col gap-4 min-w-0">
        <div>
          <h2 className="text-2xl font-bold text-content-primary mb-[6px]">镜像管理</h2>
          <p className="text-sm text-content-tertiary m-0">管理和优化各生态镜像源，提升下载速度与稳定性</p>
        </div>

        <Tabs items={TABS} active={activeTab} onChange={setActiveTab} />

        <div className="flex gap-2 items-center flex-wrap">
          <Button variant="primary" size="sm" icon={<IconSpeedo size={12} />} onClick={handleSpeedTest}>测速</Button>
          <Button variant="secondary" size="sm" icon={<IconPlus size={12} />} onClick={handleAddMirror}>添加镜像</Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<IconStar size={12} />}
            onClick={async () => {
              if (!selectedMirror) { showToast("请先选择一个镜像"); return; }
              try {
                await invoke("update_mirror", { args: { id: selectedMirror.id, priority: 1 } });
                showToast(`已将 ${selectedMirror.name} 设为优先`);
                await fetchData();
              } catch { showToast("操作失败"); }
            }}
          >
            设为优先
          </Button>
          <Button variant="ghost" size="sm" icon={<IconTrash size={12} />} onClick={handleRemove}>禁用</Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<IconRefresh size={12} className={isRefreshing ? "animate-spin" : undefined} />}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? "刷新中…" : "刷新"}
          </Button>
        </div>

        <Card title={`${activeTab.toUpperCase()} 镜像源`} action={<span className="text-xs text-content-tertiary">{visibleMirrors.length} 项</span>}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr>{["", "名称", "URL", "延迟", "健康状态", "优先级", "启用", "最近测速"].map((h) => <th key={h} className={thClass}>{h}</th>)}</tr></thead>
              <tbody>
                {pageMirrors.length === 0 ? (
                  <tr><td colSpan={8} className="p-6 text-xs text-center text-content-tertiary border-b border-b-[rgba(42,45,53,0.4)]">暂无镜像源</td></tr>
                ) : (
                  pageMirrors.map((m) => {
                    const sel = displayMirror?.id === m.id;
                    return (
                      <tr key={m.id} onClick={() => handleSelect(m)} className={`cursor-pointer transition-colors duration-150 ${sel ? "bg-[rgba(34,197,94,0.06)]" : ""}`}>
                        <td className={tdClass}>
                          <input type="radio" checked={sel} readOnly className="accent-green" />
                        </td>
                        <td className={`${tdClass} font-sans`}>
                          <span className="font-medium text-content-primary">{m.name}</span>
                          {m.recommended && <Badge color="green" size="sm">推荐</Badge>}
                        </td>
                        <td className={`${tdClass} font-mono text-xs text-content-secondary max-w-[200px] truncate`}>{m.url}</td>
                        <td className={tdClass}>
                          {!m.enabled ? (
                            <span className="text-xs text-content-tertiary">—</span>
                          ) : !m.healthy ? (
                            <span className="text-xs text-content-tertiary">—</span>
                          ) : (
                            <div className="flex items-center gap-[6px]">
                              <span className={`font-mono text-xs font-semibold min-w-9 ${latencyTextClass(m.latency)}`}>
                                {m.latency === 0 ? "超时" : `${m.latency}ms`}
                              </span>
                              <div className="w-[50px] h-1 rounded-[2px] bg-[#1d2926] shrink-0">
                                <div className={`h-1 rounded-[2px] ${latencyBgClass(m.latency)}`} style={{ width: `${Math.min(100, ((m.latency || 0) / 3000) * 100)}%` }} />
                              </div>
                            </div>
                          )}
                        </td>
                        <td className={`${tdClass} font-sans`}>
                          {!m.enabled ? (
                            <span className="text-xs text-content-tertiary">—</span>
                          ) : (
                            <span className="inline-flex items-center gap-[6px]">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${m.healthy ? "bg-green-bright shadow-[0_0_5px_#4ade80]" : "bg-red shadow-[0_0_5px_#ef4444]"}`} />
                              <span className={m.healthy ? "text-green-bright" : "text-red"}>{m.healthy ? "正常" : "异常"}</span>
                            </span>
                          )}
                        </td>
                        <td className={tdClass}><Badge size="sm" color={m.priority <= 2 ? "green" : m.priority <= 5 ? "yellow" : "gray"}>{`#${m.priority}`}</Badge></td>
                        <td className={tdClass}>
                          <Toggle value={m.enabled} onChange={() => handleToggle(m)} size="sm" />
                        </td>
                        <td className={`${tdClass} font-sans text-xs text-content-secondary`}>{m.last_test}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-center items-center gap-3 mt-3 text-xs text-content-tertiary">
            <Button variant="ghost" size="sm" icon={<IconChevronLeft size={12} />} onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} />
            <span className="font-mono">{page} / {totalPages}</span>
            <Button variant="ghost" size="sm" icon={<IconChevronRight size={12} />} onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} />
          </div>
        </Card>

        {/* Bottom Charts */}
        <div className="grid grid-cols-2 gap-4">
          <Card title={`镜像延迟排行 (${activeTab.toUpperCase()})`}>
            <div className="flex flex-col gap-2">
              {latencyMirrors.sort((a, b) => a.latency - b.latency).map((m, i) => (
                <div key={m.id} className="flex items-center gap-[10px]">
                  <span className="text-xs font-mono font-semibold text-content-tertiary min-w-[14px]">{i + 1}</span>
                  <span className="text-xs text-content-primary flex-1 truncate">{m.name}</span>
                  <div className="flex-1 h-[6px] rounded-sm bg-[#1d2926] min-w-[60px]">
                    <div className={`h-[6px] rounded-sm ${latencyBgClass(m.latency)} transition-[width] duration-300`} style={{ width: latencyPct(m.latency) + "%" }} />
                  </div>
                  <span className={`text-xs font-mono font-semibold min-w-[34px] ${latencyTextClass(m.latency)}`}>{m.latency}ms</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title={`镜像状态概览 (${activeTab.toUpperCase()})`}>
            <div className="flex gap-4 items-center">
              <DonutChart data={statusDist} size={100} thickness={14} centerLabel={`${visibleMirrors.length}个镜像`} centerValue="" />
              <div className="flex flex-col gap-1">
                {DONUT_STATUS_LEGEND.map((l) => (
                  <div key={l.label} className="flex items-center gap-[6px] text-xs">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${l.colorClass}`} />
                    <span className="text-content-primary font-medium">{l.label}</span>
                    <span className="text-content-tertiary font-mono">{l.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex flex-col gap-4">
        <Card>
          {!displayMirror ? (
            <div className="text-xs text-content-tertiary text-center p-6">选择一个镜像查看详情</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-content-primary">{displayMirror.name}</span>
                  {displayMirror.enabled ? <Badge color="green" size="sm">启用中</Badge> : <Badge color="red" size="sm">已禁用</Badge>}
                </div>
              </div>

              <div className={secClass}>基本配置</div>
              <div className="flex flex-col gap-[10px]">
                <div className={rowClass}>
                  <span className={lblClass}>名称</span>
                  <TextInput value={editingName} onChange={setEditingName} className="w-[170px]" />
                </div>
                <div className={rowClass}>
                  <span className={lblClass}>URL</span>
                  <TextInput value={editingUrl} onChange={setEditingUrl} className="w-[170px]" />
                </div>
                <div className={rowClass}>
                  <span className={lblClass}>协议</span>
                  <Select value={editingProtocol} options={["HTTPS", "HTTP"]} onChange={setEditingProtocol} size="sm" />
                </div>
                <div className={rowClass}>
                  <span className={lblClass}>优先级</span>
                  <TextInput value={editingPriority} onChange={setEditingPriority} className="w-[60px]" />
                </div>
                <Button variant="primary" size="sm" onClick={handleSave}>保存更改</Button>
              </div>

              <div className={`${secClass} mt-[14px]`}>回退策略</div>
              <div className="flex flex-col gap-[10px]">
                <div className={rowClass}>
                  <span className={lblClass}>启用回退</span>
                  <Toggle value={editingFallback} onChange={setEditingFallback} size="sm" />
                </div>
                <div className={rowClass}>
                  <span className={lblClass}>最大失败次数</span>
                  <Select value={editingMaxFail} options={["1", "2", "3", "5", "10"]} onChange={setEditingMaxFail} size="sm" />
                </div>
              </div>

              <div className={`${secClass} mt-[14px]`}>健康检查</div>
              <div className="flex flex-col gap-[10px]">
                <div className={rowClass}>
                  <span className={lblClass}>启用</span>
                  <Toggle value={editingHealthCheck} onChange={setEditingHealthCheck} size="sm" />
                </div>
                <div className={rowClass}>
                  <span className={lblClass}>检查间隔</span>
                  <Select value={editingInterval} options={["10秒", "30秒", "1分钟", "5分钟"]} onChange={setEditingInterval} size="sm" />
                </div>
              </div>

              <div className={`${secClass} mt-[14px]`}>当前延迟分布</div>
              {latencySnapshot.length > 0 ? (
                <>
                  <AreaChart data={latencySnapshot} xLabels={latencySnapshotLabels} color="#4ade80" width={288} height={120} />
                  <div className="text-xs text-content-tertiary text-center mt-1 font-mono">
                    平均 {Math.round(latencySnapshot.reduce((s, n) => s + n, 0) / latencySnapshot.length)}ms · {latencySnapshot.length} 个镜像
                  </div>
                </>
              ) : (
                <div className="text-xs text-content-tertiary text-center py-4">暂无延迟数据</div>
              )}
            </>
          )}
        </Card>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-surface-card border border-edge-default rounded-lg py-3 px-5 text-sm text-content-primary shadow-lg z-[100]">
          {toast}
        </div>
      )}
    </div>
  );
}
