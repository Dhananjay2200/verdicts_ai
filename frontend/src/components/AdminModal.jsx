import React, { useState, useEffect } from 'react';
import { X, Sparkles, Play, Square, RefreshCw, ShieldCheck, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { JURISDICTIONS_LIST, CATEGORIES_LIST } from './Filters';
import { apiUrl } from '../config';

export default function AdminModal({ isOpen, onClose, onRefreshData }) {
  const [topicName, setTopicName] = useState("");
  const [jurisdiction, setJurisdiction] = useState("United States");
  const [category, setCategory] = useState("Constitutional & Democratic Law");
  const [articleType, setArticleType] = useState("VERDICT_BRIEF");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [automationStatus, setAutomationStatus] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchAutomationStatus();
    fetchStats();
  }, [isOpen]);

  const fetchAutomationStatus = async () => {
    try {
      const res = await fetch(apiUrl("/api/v1/automation/status"));
      const data = await res.json();
      setAutomationStatus(data.is_running);
    } catch (e) {
      console.error("Error fetching automation status", e);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(apiUrl("/api/v1/publishing/stats"));
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error("Error fetching stats", e);
    }
  };

  const handleRunWorkflow = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(apiUrl("/api/v1/workflow/run"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: topicName.trim() || undefined,
          jurisdiction: jurisdiction === "All Jurisdictions" ? undefined : jurisdiction,
          category: category === "All Categories" ? undefined : category,
          article_type: articleType,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: "success",
          text: `Generated successfully: "${data.workflow_result?.article_title || topicName}" (Score: ${data.workflow_result?.score || 8.9}/10)`,
        });
        setTopicName("");
        if (onRefreshData) onRefreshData();
        fetchStats();
      } else {
        setMessage({ type: "error", text: data.detail || "Generation failed." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutomation = async () => {
    const endpoint = apiUrl(automationStatus ? "/api/v1/automation/stop" : "/api/v1/automation/start");
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval_seconds: 180 }),
      });
      fetchAutomationStatus();
    } catch (e) {
      console.error("Toggle error", e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#0b132b] border border-amber-500/40 rounded-2xl shadow-2xl p-6 space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-serif-title text-xl font-bold text-white">
                Verdicts AI — Autonomous Legal Studio
              </h2>
              <p className="text-xs text-slate-400">
                Multi-Agent LangGraph Research & Publishing Pipeline
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-4 gap-2.5 text-center text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Articles</div>
              <div className="font-bold text-amber-300 text-sm mt-0.5">{stats.total_articles}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Landmarks</div>
              <div className="font-bold text-slate-200 text-sm mt-0.5">{stats.verdicts_count}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Legal News</div>
              <div className="font-bold text-red-400 text-sm mt-0.5">{stats.legal_news_count}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Auto Daemon</div>
              <div className={`font-bold text-sm mt-0.5 ${automationStatus ? "text-emerald-400" : "text-slate-400"}`}>
                {automationStatus ? "RUNNING" : "STOPPED"}
              </div>
            </div>
          </div>
        )}

        {/* On-Demand Generator Form */}
        <form onSubmit={handleRunWorkflow} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Specific Case Title or News Topic (Leave empty for autonomous discovery):
            </label>
            <input
              type="text"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              placeholder="e.g. Marbury v. Madison, Roe v. Wade, Schrems II, or EU AI Act Injunction..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Jurisdiction:
              </label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-amber-400"
              >
                {JURISDICTIONS_LIST.filter(j => j !== "All Jurisdictions").map(j => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Legal Domain:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-amber-400"
              >
                {CATEGORIES_LIST.filter(c => c !== "All Categories").map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Dossier Type:
              </label>
              <select
                value={articleType}
                onChange={(e) => setArticleType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-amber-400"
              >
                <option value="VERDICT_BRIEF">12-Section Landmark Verdict</option>
                <option value="LEGAL_NEWS">Breaking Legal News Wire</option>
              </select>
            </div>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              message.type === "success" 
                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30" 
                : "bg-red-500/10 text-red-300 border border-red-500/30"
            }`}>
              {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleToggleAutomation}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                automationStatus 
                  ? "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30" 
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
              }`}
            >
              {automationStatus ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{automationStatus ? "Stop Automation Daemon" : "Start Automation Daemon"}</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs tracking-wide flex items-center gap-2 transition-all shadow-md shadow-amber-500/20"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Multi-Agent Pipeline...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Judicial Dossier</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
