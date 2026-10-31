'use client';

import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import type { AccessKind, AccessRule, ClientStat } from '@/lib/accessControl';
import { PageHeader, Segmented, Stat, inputClass } from './ui';

interface Stats {
  startedAt: string;
  clients: ClientStat[];
  totalClients: number;
  rules: AccessRule[];
  persistentRules: boolean;
}

const TOKEN_KEY = 'deprem-admin-token';
const btn = 'rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors';

export default function AdminPanel() {
  const { t: dict, fmt } = useI18n();
  const t = dict.admin;
  const [token, setToken] = useState('');
  const [input, setInput] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ ip: string; kind: AccessKind; note: string }>({ ip: '', kind: 'ban', note: '' });

  // Şifre yalnız bu sekmede tutulur; sekme kapanınca silinir
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(TOKEN_KEY);
      if (saved) setToken(saved);
    } catch {}
  }, []);

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(path, { ...init, headers: { ...init?.headers, authorization: `Bearer ${token}`, 'content-type': 'application/json' } });
      if (res.status === 401) throw new Error(t.wrongToken);
      if (res.status === 404) throw new Error(t.disabled);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    [token, t],
  );

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setStats(await api('/api/admin/stats'));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStats(null);
    }
  }, [api, token]);

  useEffect(() => {
    void load();
    if (!token) return;
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load, token]);

  const act = async (path: string, init: RequestInit) => {
    try {
      await api(path, init);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };
  const unblock = (ip: string) => act('/api/admin/unblock', { method: 'POST', body: JSON.stringify({ ip }) });
  const addRule = (ip: string, kind: AccessKind, note = '') => {
    if (kind === 'ban' && !window.confirm(t.confirmBan(ip))) return Promise.resolve();
    return act('/api/admin/rules', { method: 'POST', body: JSON.stringify({ ip, kind, note }) });
  };
  const removeRule = (ip: string) => act(`/api/admin/rules?ip=${encodeURIComponent(ip)}`, { method: 'DELETE' });

  const signIn = (e: React.FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    try {
      sessionStorage.setItem(TOKEN_KEY, v);
    } catch {}
    setToken(v);
  };
  const signOut = () => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {}
    setToken('');
    setStats(null);
    setInput('');
  };

  const now = Date.now();
  const blocked = stats?.clients.filter((c) => c.blockedUntil) ?? [];
  const ruleFor = (ip: string) => stats?.rules.find((r) => r.ip === ip);

  return (
    <div className="page-bg">
      <div className="mx-auto max-w-6xl px-4 py-8 text-slate-200 md:py-12">
        <PageHeader eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle}>
          {token && (
            <div className="flex gap-2">
              <button onClick={() => void load()} className={`${btn} border-white/10 px-4 py-2 text-slate-200 hover:bg-white/5`}>
                {t.refresh}
              </button>
              <button onClick={signOut} className={`${btn} border-white/10 px-4 py-2 text-slate-400 hover:text-white`}>
                {t.logout}
              </button>
            </div>
          )}
        </PageHeader>

        {!token || (!stats && error) ? (
          <form onSubmit={signIn} className="card max-w-md space-y-3 p-5">
            <label className="eyebrow block">{t.tokenLabel}</label>
            <input type="password" autoComplete="current-password" value={input} onChange={(e) => setInput(e.target.value)} className={`${inputClass} w-full`} />
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <button type="submit" className="rounded-xl bg-gradient-to-b from-quake-400 to-quake-500 px-5 py-2.5 text-sm font-semibold text-white">
              {t.login}
            </button>
          </form>
        ) : !stats ? (
          <p className="text-slate-400">{dict.common.loading}</p>
        ) : (
          <>
            <div className="mb-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label={t.statClients} value={fmt.number(stats.totalClients)} />
              <Stat label={t.statBlocked} value={fmt.number(blocked.length)} accent={blocked.length ? '#f97316' : undefined} />
              <Stat label={t.statBans} value={fmt.number(stats.rules.filter((r) => r.kind === 'ban').length)} />
              <Stat label={t.statAllows} value={fmt.number(stats.rules.filter((r) => r.kind === 'allow').length)} />
            </div>
            <p className="mb-8 text-xs text-slate-500">{t.since(fmt.dateTime(stats.startedAt))}</p>
            {error && <p className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}

            <h2 className="mb-3 font-display text-xl font-bold text-white">{t.clientsHeading}</h2>
            <div className="card mb-10 overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="border-b border-white/[0.06] bg-white/[0.02] text-left text-[11px] uppercase tracking-[0.12em] text-slate-500 [&_th]:px-4 [&_th]:py-3 [&_th]:font-semibold">
                  <tr>
                    <th>{t.colIp}</th>
                    <th>{t.colScope}</th>
                    <th className="text-right">{t.colToday}</th>
                    <th className="text-right">{t.colMinute}</th>
                    <th className="text-right">{t.colRejected}</th>
                    <th>{t.colStatus}</th>
                    <th>{t.colLast}</th>
                    <th>{t.colActions}</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:border-t [&_td]:border-white/[0.04] [&_td]:px-4 [&_td]:py-2.5">
                  {stats.clients.map((c) => {
                    const rule = ruleFor(c.ip);
                    return (
                      <tr key={`${c.scope}:${c.ip}`} className={c.blockedUntil ? 'bg-orange-500/[0.06]' : ''}>
                        <td className="font-mono text-xs text-slate-100">
                          {c.ip}
                          {rule && (
                            <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${rule.kind === 'ban' ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                              {rule.kind === 'ban' ? t.kindBan : t.kindAllow}
                            </span>
                          )}
                        </td>
                        <td className="text-xs text-slate-400">{t.scopes[c.scope]}</td>
                        <td className="text-right tabular-nums">{fmt.number(c.dayCount)}</td>
                        <td className="text-right tabular-nums text-slate-400">{c.minuteCount}</td>
                        <td className={`text-right tabular-nums ${c.rejected ? 'text-orange-400' : 'text-slate-500'}`}>{fmt.number(c.rejected)}</td>
                        <td className="whitespace-nowrap text-xs">
                          {c.blockedUntil ? (
                            <span className="text-orange-400">{t.blockedUntil(fmt.dateTime(c.blockedUntil))}</span>
                          ) : (
                            <span className="text-slate-500">{t.statusOk}</span>
                          )}
                        </td>
                        <td className="max-w-[220px] truncate text-xs text-slate-400" title={c.lastPath}>
                          {fmt.relative(c.lastSeen, now)} · <span className="font-mono">{c.lastPath}</span>
                        </td>
                        <td className="whitespace-nowrap text-right">
                          {c.blockedUntil && (
                            <button onClick={() => void unblock(c.ip)} className={`${btn} mr-1.5 border-orange-500/40 text-orange-300 hover:bg-orange-500/10`}>
                              {t.unblock}
                            </button>
                          )}
                          {!rule && (
                            <>
                              <button onClick={() => void addRule(c.ip, 'ban')} className={`${btn} mr-1.5 border-rose-500/30 text-rose-300 hover:bg-rose-500/10`}>
                                {t.ban}
                              </button>
                              <button onClick={() => void addRule(c.ip, 'allow')} className={`${btn} border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10`}>
                                {t.allow}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {stats.clients.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        {t.noClients}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h2 className="mb-3 font-display text-xl font-bold text-white">{t.rulesHeading}</h2>
            {!stats.persistentRules && <p className="mb-3 text-sm text-amber-400">{t.notPersistent}</p>}
            <form
              className="card mb-4 flex flex-col gap-3 p-4 md:flex-row md:items-center"
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.ip.trim()) return;
                void addRule(form.ip.trim(), form.kind, form.note).then(() => setForm({ ip: '', kind: form.kind, note: '' }));
              }}
            >
              <input value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} placeholder={t.ipPlaceholder} className={`${inputClass} font-mono md:w-56`} />
              <Segmented
                label={t.rulesHeading}
                value={form.kind}
                onChange={(kind) => setForm({ ...form, kind })}
                options={[
                  { value: 'ban', label: t.kindBan },
                  { value: 'allow', label: t.kindAllow },
                ]}
              />
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t.notePlaceholder} className={`${inputClass} flex-1`} />
              <button type="submit" className="rounded-xl bg-gradient-to-b from-quake-400 to-quake-500 px-5 py-2.5 text-sm font-semibold text-white">
                {t.addRule}
              </button>
            </form>
            <div className="card overflow-hidden">
              {stats.rules.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">{t.rulesEmpty}</p>
              ) : (
                <ul>
                  {stats.rules.map((r) => (
                    <li key={r.ip} className="flex items-center gap-3 border-t border-white/[0.04] px-4 py-3 first:border-t-0">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.kind === 'ban' ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                        {r.kind === 'ban' ? t.kindBan : t.kindAllow}
                      </span>
                      <span className="font-mono text-sm text-slate-100">{r.ip}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-400">{r.note}</span>
                      <span className="hidden text-xs text-slate-500 sm:inline">{fmt.dateTime(r.createdAt)}</span>
                      <button onClick={() => void removeRule(r.ip)} className={`${btn} border-white/10 text-slate-300 hover:bg-white/5`}>
                        {t.remove}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
