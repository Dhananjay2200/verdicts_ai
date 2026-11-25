import React from 'react';
import { Scale, Shield, Globe, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-800 bg-[#070b19] py-12 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Scale className="w-4 h-4 text-amber-400" />
              </div>
              <span className="font-serif-title font-bold text-slate-100 text-base">VERDICTS.AI</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-serif-body">
              Autonomous legal intelligence, case ratio decidendi extraction, and worldwide court wire reporting. Grounded in judicial records, constitutional charters, and open legal archives.
            </p>
          </div>

          <div>
            <h4 className="font-serif-title font-semibold text-slate-200 text-sm mb-3">Supreme Jurisdictions</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>United States Supreme Court</li>
              <li>Court of Justice of the European Union</li>
              <li>Supreme Court of the United Kingdom</li>
              <li>Supreme Court of India</li>
              <li>International Court of Justice (The Hague)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif-title font-semibold text-slate-200 text-sm mb-3">Legal Disciplines</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>Constitutional & Democratic Review</li>
              <li>Tech, AI Governance & Privacy (GDPR)</li>
              <li>Antitrust & Competition Law</li>
              <li>Environmental & Climate Justice</li>
              <li>Human Rights & Due Process</li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif-title font-semibold text-slate-200 text-sm mb-3">Editorial & Quality Standards</h4>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Every generated verdict guide undergoes an autonomous 11-dimension quality audit requiring score ≥ 8.0/10 covering legal accuracy, citation integrity, and neutral analysis.
            </p>
            <div className="mt-3 flex items-center gap-2 text-amber-400 text-[11px]">
              <Shield className="w-3.5 h-3.5" />
              <span>Strict Citation & Open Law Standards</span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © 2026 Verdicts AI. Designed for jurists, counsel, scholars, and global citizens.
          </div>
          <div className="flex items-center gap-4">
            <span>Bluebook Citations</span>
            <span>•</span>
            <span>OSCOLA Compliant</span>
            <span>•</span>
            <span>Wikimedia CC Media</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
