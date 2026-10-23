import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { AuditLogItem } from '../../types/index.js';
import { Activity, Settings, Save, CheckCircle2, Shield } from 'lucide-react';

export const AdminSettingsAndAuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lRes, sRes] = await Promise.all([
        api.getAuditLogs(),
        api.getPlatformSettings(),
      ]);
      if (lRes.success) setLogs(lRes.data);
      if (sRes.success) setSettings(sRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateSetting = async (key: string, value: string) => {
    setSavingKey(key);
    try {
      await api.updatePlatformSetting(key, value);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update setting');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-dots py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <span className="text-purple-600 font-bold text-xs uppercase tracking-wider">
            Platform Governance
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display mt-0.5">
            System Audit Trail & Platform Rules
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Inspect immutable audit logs of administrative actions, booking transitions, and configure defaults.
          </p>
        </div>

        {/* Platform Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
            <Settings className="w-4 h-4 text-purple-600" />
            <span>Platform Default Parameters</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {settings.map((s) => (
              <div key={s.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div>
                  <span className="font-bold text-slate-800">{s.key}</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">{s.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    defaultValue={s.value}
                    id={`setting-${s.key}`}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById(`setting-${s.key}`) as HTMLInputElement;
                      if (input) handleUpdateSetting(s.key, input.value);
                    }}
                    disabled={savingKey === s.key}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingKey === s.key ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Audit Logs Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Immutable System Audit Trail</span>
            </h3>
            <span className="text-xs text-slate-400 font-semibold">{logs.length} logged entries</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading audit logs...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-blue-700">
                        {log.entityType}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{log.user?.name || 'Automated System'}</div>
                        <div className="text-[10px] text-slate-400">{log.user?.role || 'SYSTEM'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-md">
                        {log.details}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
