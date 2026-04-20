import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, AlertTriangle, Send, X } from 'lucide-react';

interface ReviewItem {
  ticket_id: string;
  category: string;
  status: string;
  escalation_reason: string;
  draft_response: string;
  sender?: string;
  subject?: string;
  body?: string;
  created_at: string;
}

export default function ReviewQueue() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviewQueue = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/review');
      setTickets(res.data.tickets || []);
    } catch (err) {
      console.error('Failed to fetch review queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewQueue();
  }, []);

  const handleAction = async (ticketId: string, action: 'approve' | 'reject') => {
    try {
       await axios.post(`/api/v1/review/${ticketId}?action=${action}`);
       // Refetch queue to remove the processed ticket
       fetchReviewQueue();
    } catch (e) {
       alert("Failed to process action.");
    }
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto pb-8">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold dark:text-darkText">Escalation Review Queue</h1>
          <p className="text-gray-500 dark:text-gray-400">Emails flagged for manual intervention before sending.</p>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <span className="w-8 h-8 border-4 border-gray-200 border-t-accentCyan rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center text-gray-500 p-12 bg-lightBg dark:bg-darkCard border border-borderLight dark:border-borderDark rounded-2xl shadow-sm">
          <div className="w-20 h-20 rounded-full bg-accentGreen/10 flex items-center justify-center mb-6 shadow-glow-cyan border border-accentGreen/20">
            <ShieldCheck size={40} className="text-accentGreen" />
          </div>
          <h3 className="text-xl font-bold dark:text-darkText mb-2">All clear!</h3>
          <p className="text-center max-w-sm">No emails pending human review right now. The AI is handling everything perfectly.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 overflow-y-auto">
          {tickets.map((t) => (
            <div key={t.ticket_id} className="bg-lightBg dark:bg-darkCard border border-borderLight dark:border-borderDark rounded-2xl flex flex-col overflow-hidden shadow-sm hover:shadow-glow-cyan transition-shadow animation-fade-in">
              <div className="p-5 border-b border-borderLight dark:border-borderDark bg-gray-50 dark:bg-[#1a212e] flex justify-between items-center">
                 <div className="flex items-center gap-3">
                   <h3 className="text-sm font-semibold dark:text-white uppercase tracking-wider">{t.subject || 'No Subject'}</h3>
                   <span className="px-2 py-0.5 rounded border border-gray-600 bg-gray-800 text-[10px] font-mono text-gray-300">#{t.ticket_id}</span>
                 </div>
                 <button onClick={() => navigate(`/ticket/${t.ticket_id}`)} className="text-xs font-bold text-accentCyan hover:underline uppercase tracking-wider">
                   Full Details
                 </button>
              </div>
              
              <div className="p-6 flex flex-col md:flex-row gap-8">
                 {/* Left: Esc info */}
                 <div className="w-full md:w-1/3 space-y-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase mb-1">From</p>
                      <p className="font-medium dark:text-darkText">{t.sender || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-accentRed uppercase font-bold mb-1 flex items-center gap-1">
                        <AlertTriangle size={14}/> Escalation Reason
                      </p>
                      <div className="text-sm bg-accentRed/5 border border-accentRed/20 p-3 rounded-lg dark:text-gray-300 leading-relaxed">
                        {t.escalation_reason}
                      </div>
                    </div>
                 </div>

                 {/* Right: Draft & Actions */}
                 <div className="w-full md:w-2/3 flex flex-col relative">
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">AI Draft Response</p>
                    <div className="flex-1 bg-[#F8FAFC] dark:bg-[#0D1117] border border-borderLight dark:border-[#30363D] rounded-xl p-4 text-sm leading-relaxed text-gray-800 dark:text-gray-300 whitespace-pre-wrap max-h-60 overflow-y-auto mb-4">
                      {t.draft_response || <span className="italic text-gray-500">No draft available.</span>}
                    </div>

                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleAction(t.ticket_id, 'approve')}
                        className="flex-1 flex items-center justify-center gap-2 bg-accentGreen text-darkBg py-3 rounded-xl font-bold hover:bg-opacity-90 transition shadow-sm"
                      >
                        <Send size={18} /> Approve AI Draft
                      </button>
                      <button 
                        onClick={() => handleAction(t.ticket_id, 'reject')}
                        className="flex items-center justify-center gap-2 border border-accentRed/50 hover:bg-accentRed/10 text-accentRed px-6 py-3 rounded-xl font-bold transition"
                      >
                        <X size={18} /> Reject
                      </button>
                    </div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
