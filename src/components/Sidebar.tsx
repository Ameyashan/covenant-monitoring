'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Mail,
  FileSearch,
  GitBranch,
  FileInput,
  AlertTriangle,
  FileWarning,
  CircleDot,
  ShieldCheck,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Pipeline',
    items: [
      { label: 'Deal Sourcing', href: '/deals', icon: Mail },
      { label: 'Covenant Extraction', href: '/extraction', icon: FileSearch },
      { label: 'Validation Funnel', href: '/validation', icon: GitBranch },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { label: 'Document Portal', href: '/documents', icon: FileInput },
      { label: 'Breach Detection', href: '/breaches', icon: AlertTriangle },
      { label: 'Breach Summary', href: '/breach-summary', icon: FileWarning },
    ],
  },
  {
    title: 'Review',
    items: [
      { label: 'Exception Queue', href: '/exceptions', icon: CircleDot, badge: 8 },
      { label: 'Waiver Workflow', href: '/waivers', icon: ShieldCheck },
    ],
  },
  {
    title: 'Overview',
    items: [
      { label: 'Executive Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex flex-col w-60 min-h-screen flex-shrink-0" style={{ backgroundColor: '#020617' }}>
      {/* Logo area */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M6 2v8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-100 tracking-tight">Covenant Monitor</span>
        </div>
        <span className="text-[10px] font-medium tracking-widest uppercase" style={{ color: '#3b82f6', marginLeft: '30px' }}>
          AI-Powered
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            <div
              className="px-4 mb-1 text-[10px] font-semibold tracking-widest uppercase"
              style={{ color: 'rgba(148, 163, 184, 0.5)' }}
            >
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item${active ? ' active' : ''}`}
                >
                  <Icon size={14} className="flex-shrink-0" style={{ color: active ? '#60a5fa' : 'inherit' }} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: active ? '#1d4ed8' : 'rgba(239,68,68,0.15)',
                        color: active ? '#fff' : '#f87171',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Agent status */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot flex-shrink-0" />
          <div>
            <div className="text-xs font-medium" style={{ color: '#94a3b8' }}>Agent Status</div>
            <div className="text-xs font-semibold" style={{ color: '#10b981' }}>8 agents active</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
