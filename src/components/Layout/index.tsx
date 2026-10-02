import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { StatusPill, Toolbar, ToolbarButton, fireToolbarAction } from '../Toolbar';
import Container from '../container';

interface HeaderTab {
  id: string;
  label: string;
  badge?: string;
  /** Route to open when the tab is clicked (tabs without one are visual only). */
  to?: string;
}

const TABS: HeaderTab[] = [
  { id: 'task-order', label: 'Task Order', badge: '1', to: '/task-order' },
  { id: 'sales-order', label: 'Sales Order', badge: '1', to: '/form' },
  { id: 'requisitions', label: 'Requisitions', badge: '1' },
  { id: 'cashflow', label: 'Cashflow Forecasting', badge: '1' },
  { id: 'tasks', label: 'Tasks', badge: '1' },
  { id: 'estimates', label: 'Estimates', badge: '1' },
  { id: 'related', label: 'Related', badge: '1' },
];

export interface LayoutProps {
  children?: ReactNode;
}


export const Layout: FC<LayoutProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('task-order');
  const [status, setStatus] = useState<'under' | 'over'>('under');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/form')) setActiveTab('sales-order');
    else if (location.pathname.startsWith('/task-order')) setActiveTab('task-order');
  }, [location.pathname]);

  const handleTabClick = (tab: HeaderTab) => {
    setActiveTab(tab.id);
    if (tab.to) navigate(tab.to);
  };

  return (
    <div>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2">
        <div className="flex items-center gap-2">
          <div className="leading-tight">
            <div className="text-[11px] text-[#008784]">Taskorder</div>
            <div className="text-sm font-bold text-slate-900">Abigail Peterson</div>
          </div>
        </div>
        <nav
          aria-label="Record sections"
          className="flex items-stretch border border-slate-200 rounded-sm overflow-hidden  mx-auto"
        >
          {TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab)}
                className={`flex items-start px-3 py-1 bg-white border-r border-slate-200 last:border-r-0 transition-colors ${
                  active ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
              >
                <span className="leading-tight text-left">
                  <span className="block text-xs font-medium text-slate-800 whitespace-nowrap">
                    {tab.label}
                  </span>
                  {tab.badge && (
                    <span className="block text-[10px] leading-tight text-slate-500">
                      {tab.badge}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>
      </header>
      <Toolbar
        aside={
          <StatusPill
            options={['Under', 'Over']}
            active={status === 'over' ? 'Over' : 'Under'}
            onSelect={(option) => setStatus(option === 'Over' ? 'over' : 'under')}
          />
        }
      >
        <ToolbarButton variant="blue" onClick={() => fireToolbarAction('new')}>
          New
        </ToolbarButton>
        <ToolbarButton variant="blue" onClick={() => fireToolbarAction('generate')}>
          Generate Sales Order
        </ToolbarButton>
        <ToolbarButton variant="grey" onClick={() => fireToolbarAction('issue')}>
          Issue Requisition
        </ToolbarButton>
        <ToolbarButton variant="grey" onClick={() => navigate('/task-order')}>
          Allocate Tasks
        </ToolbarButton>
        <ToolbarButton
          variant="grey"
          onClick={() => setStatus((prev) => (prev === 'under' ? 'over' : 'under'))}
        >
          Update Budget
        </ToolbarButton>
      </Toolbar>
      <Container>{children ?? <Outlet />}</Container>
    </div>
  );
};

export default Layout;
