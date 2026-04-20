import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Inbox as InboxIcon, RefreshCw } from 'lucide-react';
import { Ticket } from '../store';

// Helper to format badges based on the theme definitions
const getCategoryBadgeColor = (cat: string) => {
  const category = cat.toLowerCase();
  if (category === 'billing') return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  if (category === 'technical') return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  if (category === 'account') return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
  return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
};

const getStatusBadgeColor = (status: string, needsEscalation: boolean) => {
  if (needsEscalation && status === 'pending_review') return 'bg-accentRed/10 text-accentRed border-accentRed/20 shadow-glow-red';
  if (status === 'rejected') return 'bg-accentRed/10 text-accentRed border-accentRed/20';
  if (status === 'sent' || status === 'approved') return 'bg-accentGreen/10 text-accentGreen border-accentGreen/20';
  return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
};

function formatTime(isoString: string) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString();
}

export default function Inbox() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/emails');
      setTickets(res.data.tickets || []);
      setFilteredTickets(res.data.tickets || []);
    } catch (err) {
      console.error('Failed to fetch emails', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFilteredTickets(
      tickets.filter(t => 
        t.sender?.toLowerCase().includes(q) ||
        t.subject?.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      )
    );
  }, [search, tickets]);

  return (
    <div className="h-full flex flex-col max-w-6xl mx-auto pb-8">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold dark:text-darkText">Email Inbox</h1>
          <p className="text-gray-500 dark:text-gray-400">Complete log of all processed support tickets.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search sender, subject, category..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-lightBg dark:bg-darkCard border border-borderLight dark:border-borderDark rounded-lg text-sm w-80 focus:outline-none focus:border-accentCyan transition-colors dark:text-darkText"
            />
          </div>
          <button 
            onClick={fetchEmails} 
            className="p-2 border border-borderLight dark:border-borderDark rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </header>

      <div className="bg-lightBg dark:bg-darkCard border border-borderLight dark:border-borderDark rounded-2xl flex flex-col overflow-hidden shadow-sm flex-1">
        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <span className="w-8 h-8 border-4 border-gray-200 border-t-accentCyan rounded-full animate-spin" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center text-gray-500 p-12">
            <InboxIcon size={48} className="opacity-20 mb-4" />
            <h3 className="text-lg font-semibold">No emails found</h3>
            <p className="text-sm">We couldn't find any tickets matching your search.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-[#1a212e] text-gray-500 dark:text-gray-400 sticky top-0 z-10 border-b border-borderLight dark:border-borderDark">
                <tr>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Sender</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Subject</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Category</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Status</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredTickets.map((t) => (
                  <tr 
                    key={t.ticket_id} 
                    onClick={() => navigate(`/ticket/${t.ticket_id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-[#374151] cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold dark:text-gray-200">{t.sender || 'Unknown'}</div>
                      <div className="font-mono text-[10px] text-gray-400 mt-1 uppercase tracking-wider">#{t.ticket_id}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 max-w-sm truncate">
                      {t.subject || '(no subject)'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${getCategoryBadgeColor(t.category)}`}>
                        {t.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeColor(t.status, t.needs_escalation)}`}>
                        {t.needs_escalation && t.status === 'pending_review' ? 'ESCALATED' : t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400 text-xs">
                      {formatTime(t.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
