'use client';

/**
 * BrandShell — CSCA Learning Platform (Batch 2 · Maritime)
 *
 * 替换 BambooScrollNav（竹简卷轴/像素轴头/流苏/朱批/金箔）为 VoyageNavigation：
 * - 桌面 Deep Ocean 窄侧栏（260px ↔ 76px）
 * - 移动端 Bottom Tab（4 主入口 + Drawer 显示 9 段航线）
 * - collapsed / mobileOpen 状态：localStorage 持久化，通过 useNav() 共享
 * - 内容区偏移：lg:pl-[var(--nav-width)]、移动 pb-20 避让 bottom tab
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import VoyageNavigation from './VoyageNavigation';

export type NavState = {
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
};

const NavContext = createContext<NavState>({
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

export const useNav = () => useContext(NavContext);

export function BrandShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('csca_nav_collapsed') === '1') {
      setCollapsed(true);
    }
  }, []);

  const setCollapsedPersist = (c: boolean) => {
    setCollapsed(c);
    if (typeof window !== 'undefined') {
      localStorage.setItem('csca_nav_collapsed', c ? '1' : '0');
    }
  };

  return (
    <NavContext.Provider
      value={{ collapsed, setCollapsed: setCollapsedPersist, mobileOpen, setMobileOpen }}
    >
      <div
        data-testid="brand-shell"
        className="relative lg:pl-[var(--nav-width)] pb-20 lg:pb-0 transition-[padding-left] duration-200 ease-out"
        style={{ ['--nav-width' as string]: collapsed ? '76px' : '260px' }}
      >
        <VoyageNavigation />
        {children}
      </div>
    </NavContext.Provider>
  );
}

export default BrandShell;
