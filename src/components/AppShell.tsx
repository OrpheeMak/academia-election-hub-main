import { Activity, BarChart3, LogIn, PlayCircle, Settings, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from '@/components/NavLink';

const navigation = [
  { to: '/auth', label: 'Authentification', icon: LogIn },
  { to: '/simulation', label: 'Simulation', icon: PlayCircle },
  { to: '/observateur', label: 'Observateur', icon: BarChart3 },
  { to: '/administration', label: 'Administrateur', icon: Settings },
  { to: '/anomalies', label: 'Anomalies', icon: ShieldAlert },
];

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  eyebrow?: string;
}

export function AppShell({ title, subtitle, children, eyebrow }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Activity className="h-4 w-4 text-emerald-600" />
              {eyebrow || 'Academia Election Hub'}
            </div>
            <h1 className="text-2xl font-bold tracking-normal text-slate-950 md:text-3xl">
              {title}
            </h1>
            {subtitle && <p className="mt-1 max-w-3xl text-sm text-slate-600">{subtitle}</p>}
          </div>

          <nav className="flex flex-wrap gap-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  activeClassName="border-slate-900 bg-slate-900 text-white hover:bg-slate-900"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
