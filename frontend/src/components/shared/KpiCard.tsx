import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface KpiCardProps {
  title: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down';
  type: 'line' | 'progress' | 'gauge';
  rawData?: number;
}

export default function KpiCard({ title, value, change, trend, type, rawData }: KpiCardProps) {
  // Mock data for visualization
  const sparklineData = Array.from({ length: 15 }, () => ({
    val: Math.floor(Math.random() * 50) + 10,
  }));

  const trendColor = trend === 'up' ? 'text-accentCyan' : 'text-accentRed';

  return (
    <div className="bg-lightBg dark:bg-darkCard border border-borderLight dark:border-borderDark rounded-2xl p-5 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
        <span className={`text-xs font-bold px-2 py-1 rounded bg-opacity-10 dark:bg-opacity-20 ${trendColor} ${
          trend === 'up' ? 'bg-accentCyan' : 'bg-accentRed'
        }`}>
          {change}
        </span>
      </div>
      
      <div className="flex items-end justify-between">
        <div className="text-3xl font-bold dark:text-darkText">{value}</div>
        
        <div className="h-12 w-24">
          {type === 'line' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line type="monotone" dataKey="val" stroke="#06B6D4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}

          {type === 'progress' && rawData !== undefined && (
            <div className="flex items-center h-full">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="bg-accentCyan h-2 rounded-full shadow-glow-cyan" style={{ width: `${rawData}%` }}></div>
              </div>
            </div>
          )}

          {type === 'gauge' && rawData !== undefined && (
             <div className="flex items-center justify-end h-full">
               <div className="w-10 h-10 rounded-full border-4 border-gray-200 dark:border-gray-700 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border-4 border-t-accentRed border-r-accentRed shadow-glow-red rotate-45"></div>
                  <span className="text-[10px] font-bold text-accentRed">{rawData}</span>
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
