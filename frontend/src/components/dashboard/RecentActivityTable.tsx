import { useNavigate } from 'react-router-dom';
import { Ticket } from '../../store';

interface Props {
  tickets: Ticket[];
}

export default function RecentActivityTable({ tickets }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-lightBg dark:bg-darkCard border border-borderLight dark:border-borderDark rounded-2xl shadow-sm overflow-hidden flex-1">
      <div className="px-6 py-4 border-b border-borderLight dark:border-borderDark">
        <h3 className="font-semibold dark:text-darkText">Recent Activity</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-6 py-3 font-medium">Ticket ID</th>
              <th className="px-6 py-3 font-medium">Sender</th>
              <th className="px-6 py-3 font-medium">Subject</th>
              <th className="px-6 py-3 font-medium">Category</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr 
                key={t.ticket_id} 
                onClick={() => navigate(`/ticket/${t.ticket_id}`)}
                className="border-b border-borderLight dark:border-borderDark hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 font-mono text-accentCyan">#{t.ticket_id}</td>
                <td className="px-6 py-4 font-medium dark:text-gray-200">{t.email.sender}</td>
                <td className="px-6 py-4 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{t.email.subject}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs font-medium uppercase text-gray-600 dark:text-gray-300">
                    {t.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    t.needs_escalation ? 'bg-accentRed/10 text-accentRed' : 'bg-accentGreen/10 text-accentGreen'
                  }`}>
                    {t.needs_escalation ? 'ESCALATED' : t.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  No recent activity found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
