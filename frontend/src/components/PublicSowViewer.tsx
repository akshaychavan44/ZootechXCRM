import React, { useEffect, useState } from "react";
import { Printer, CheckCircle2, Shield, Calendar, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import ZootechXLogo from "./ZootechXLogo";

interface ScopeOfWork {
  id: string;
  sow_number: string;
  client_name: string;
  project_name: string;
  template_name: string;
  rendered_document: string;
  project_value: number;
  payment_terms: string;
  timeline_weeks: number;
  status: string;
  prepared_by_name: string;
  created_at: string;
}

export default function PublicSowViewer({ token, onBack }: { token: string; onBack?: () => void }) {
  const [sow, setSow] = useState<ScopeOfWork | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSow = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:5000/api/sows/share/${token}`);
        const data = await response.json();
        if (!response.ok || !data.data) {
          throw new Error(data.message || "Invalid or expired document link");
        }
        setSow(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load document");
      } finally {
        setLoading(false);
      }
    };
    void fetchSow();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <RefreshCw size={28} className="animate-spin text-white mb-3" />
        <p className="text-sm text-zinc-400">Loading Scope of Work document...</p>
      </div>
    );
  }

  if (error || !sow) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl border border-rose-500/20 bg-zinc-950 p-8 text-center shadow-2xl">
          <AlertCircle size={36} className="text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold">Document Unavailable</h2>
          <p className="text-xs text-zinc-400 mt-2">{error || "This document link is invalid or expired."}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-6 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold"
            >
              Return
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[840px] mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <ZootechXLogo variant="full" size="md" dark={true} subtitle="Offshore Engineering & Cloud Solutions" />

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="h-9 px-4 rounded-xl btn-dark-gradient text-white text-xs font-bold flex items-center gap-2 transition shadow-md border border-white/20"
            >
              <Printer size={14} />
              <span>Print / Download PDF</span>
            </button>
          </div>
        </div>

        {/* Document Card */}
        <div className="rounded-3xl border border-white/10 bg-black p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/10 gap-4">
            <div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/20">
                {sow.sow_number}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white mt-2">
                {sow.project_name}
              </h1>
              <p className="text-xs text-zinc-400 mt-1">Prepared for {sow.client_name}</p>
            </div>

            <div className="sm:text-right">
              <div className="text-xl font-bold mono text-emerald-400">
                ₹{Number(sow.project_value).toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">Timeline: {sow.timeline_weeks} Weeks</div>
            </div>
          </div>

          {/* Rendered Markdown Body */}
          <div className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 text-xs leading-relaxed text-zinc-300 font-sans whitespace-pre-wrap">
            {sow.rendered_document}
          </div>

          {/* Verification Footer */}
          <div className="pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-3">
            <div className="flex items-center gap-2">
              <Shield size={15} className="text-white" />
              <span>Certified ZootechX Engagement Agreement</span>
            </div>
            <div className="font-mono text-[11px]">
              Document Verified · Ref: {sow.sow_number}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
