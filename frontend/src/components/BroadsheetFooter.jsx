import React from 'react';
import { Scale } from 'lucide-react';

export default function BroadsheetFooter() {
  return (
    <footer className="mt-16 bg-[#FFFFFF] border-t-2 border-[#111827] text-[#4B5563] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#1E3A5F]" />
              <span className="font-serif-headline text-base font-bold text-[#111827]">
                VERDICTS
              </span>
            </div>
            <p className="leading-relaxed text-[#4B5563]">
              Independent court reporting, constitutional ratio decidendi analysis, and global court news coverage.
            </p>
          </div>

          <div>
            <h3 className="font-serif-headline text-sm font-bold text-[#111827] mb-2.5">
              Courts Covered
            </h3>
            <ul className="space-y-1.5">
              <li>Supreme Court of the United States</li>
              <li>Court of Justice of the European Union</li>
              <li>Supreme Court of the United Kingdom</li>
              <li>Supreme Court of India</li>
              <li>International Court of Justice</li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif-headline text-sm font-bold text-[#111827] mb-2.5">
              Practice Areas
            </h3>
            <ul className="space-y-1.5">
              <li>Constitutional &amp; Democratic Law</li>
              <li>Tech, AI &amp; Digital Privacy</li>
              <li>Corporate &amp; Securities Regulation</li>
              <li>International Arbitration</li>
              <li>Criminal Justice &amp; Due Process</li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif-headline text-sm font-bold text-[#111827] mb-2.5">
              Editorial Standard
            </h3>
            <p className="leading-relaxed text-[#4B5563]">
              Every brief cites primary court records, statutory frameworks, bench compositions, and dissenting opinions.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-[#D1D5DB] flex flex-col sm:flex-row items-center justify-between gap-3 text-[#6B7280]">
          <span>&copy; {new Date().getFullYear()} Verdicts. All rights reserved.</span>
          <span>Broadsheet Legal Edition</span>
        </div>
      </div>
    </footer>
  );
}
