import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface FatigueTrendChartProps {
  history: Array<{ time: string; score: number; perclos: number }>;
}

export const FatigueTrendChart: React.FC<FatigueTrendChartProps> = ({ history }) => {
  return (
    <div className="p-5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Fatigue Real-time Telemetry</h4>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">60 Second Rolling Window</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
           <div className="flex items-center gap-1.5 text-blue-400">
             <div className="w-2 h-2 rounded-full bg-blue-500" />
             Fatigue Score
           </div>
           <div className="flex items-center gap-1.5 text-emerald-400">
             <div className="w-2 h-2 rounded-full bg-emerald-500" />
             PERCLOS %
           </div>
        </div>
      </div>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPerclos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="time" 
              hide 
            />
            <YAxis 
              domain={[0, 100]} 
              stroke="#475569" 
              fontSize={10} 
              tickFormatter={(val) => `${val}`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px' }}
              itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
              labelStyle={{ display: 'none' }}
            />
            {/* Threshold Reference Lines */}
            <ReferenceLine y={30} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'ATTENTION', position: 'insideRight', fill: '#f59e0b', fontSize: 9, fontWeight: 'bold' }} />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'CRITICAL', position: 'insideRight', fill: '#ef4444', fontSize: 9, fontWeight: 'bold' }} />
            
            <Area
              type="monotone"
              dataKey="score"
              name="Fatigue Score"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorScore)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="perclos"
              name="PERCLOS %"
              stroke="#10b981"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorPerclos)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
