import React from 'react';
import { AlertCircle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { DriverSafetyEvent } from '../../types';

interface SafetyEventsTableProps {
  events: DriverSafetyEvent[];
}

export const SafetyEventsTable: React.FC<SafetyEventsTableProps> = ({ events }) => {
  return (
    <div className="p-5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Driver Safety Event History</span>
        </h4>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold uppercase tracking-wider">
            {events.length} Events Logged
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px] text-left">
          <thead>
            <tr className="text-slate-500 uppercase tracking-widest border-b border-slate-800">
              <th className="pb-3 font-bold px-2">Time</th>
              <th className="pb-3 font-bold px-2">Event</th>
              <th className="pb-3 font-bold px-2 text-center">Severity</th>
              <th className="pb-3 font-bold px-2 text-right">Duration</th>
              <th className="pb-3 font-bold px-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-2 font-mono text-slate-400">{event.timestamp}</td>
                <td className="py-3 px-2 font-bold text-slate-200">{event.eventType}</td>
                <td className="py-3 px-2">
                   <div className="flex justify-center">
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] border ${
                      event.severity === 'critical' ? 'bg-rose-950 text-rose-400 border-rose-800' :
                      event.severity === 'high' ? 'bg-orange-950 text-orange-400 border-orange-800' :
                      event.severity === 'medium' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                      'bg-blue-950 text-blue-400 border-blue-800'
                    }`}>
                      {event.severity}
                    </span>
                   </div>
                </td>
                <td className="py-3 px-2 text-right font-mono text-slate-400">{event.duration}</td>
                <td className="py-3 px-2 text-right">
                  <span className={`inline-flex items-center gap-1 font-bold ${event.status === 'Active' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {event.status === 'Active' ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    {event.status}
                  </span>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                  No safety events recorded in current session.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
