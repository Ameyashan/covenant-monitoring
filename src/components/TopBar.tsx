'use client';

import { useRole, type Role } from '@/context/RoleContext';
import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const roles: Role[] = [
  'Senior Management',
  'Loan Officer',
  'Relationship Manager',
  'Compliance Officer',
  'Operations Analyst',
];

export default function TopBar() {
  const { role, setRole } = useRole();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header
      className="flex items-center justify-end px-6 h-12 flex-shrink-0 bg-white"
      style={{ borderBottom: '1px solid #e2e8f0' }}
    >
      {/* Role selector */}
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
          style={{
            border: '1px solid #e2e8f0',
            color: '#475569',
            backgroundColor: open ? '#f1f5f9' : '#fff',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
          <span>{role}</span>
          <ChevronDown size={12} className="text-slate-400" />
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-1 w-52 rounded-lg py-1 z-50"
            style={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            {roles.map(r => (
              <button
                key={r}
                onClick={() => { setRole(r); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs font-medium transition-colors"
                style={{
                  color: r === role ? '#1e40af' : '#374151',
                  backgroundColor: r === role ? '#eff6ff' : 'transparent',
                }}
                onMouseEnter={e => {
                  if (r !== role) (e.target as HTMLButtonElement).style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={e => {
                  if (r !== role) (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
