'use client';

/**
 * 南洋出海局 · 音效开关 React 层（批次 15）
 *
 * SoundProvider + useSound()：把 sound.ts 单例状态桥接到 React
 * （useSyncExternalStore），暴露 ambient/sfx 双开关与 setter。
 * 挂载于 app/layout.tsx 全局（客户端组件可在 RSC layout 渲染）。
 */
import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { sound, type SoundState } from './sound';

interface SoundValue extends SoundState {
  setAmbient: (on: boolean) => void;
  setSfx: (on: boolean) => void;
}

const SoundContext = createContext<SoundValue>({
  ambient: true,
  sfx: true,
  setAmbient: () => {},
  setSfx: () => {},
});

const subscribe = (cb: () => void) => sound.subscribe(cb);
const getSnapshot = () => sound.getState();
// [HYDRATION-FIX] Server snapshot must return fixed default state, otherwise
// useSyncExternalStore reads localStorage on client (via sound singleton's
// constructor) and returns a different value than server, causing hydration mismatch.
const SSR_DEFAULT_STATE: SoundState = { ambient: true, sfx: true };
const getServerSnapshot = () => SSR_DEFAULT_STATE;


export function SoundProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore<SoundState>(subscribe, getSnapshot, getServerSnapshot);
  return (
    <SoundContext.Provider
      value={{
        ambient: state.ambient,
        sfx: state.sfx,
        setAmbient: (on) => sound.setAmbient(on),
        setSfx: (on) => sound.setSfx(on),
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export const useSound = () => useContext(SoundContext);
