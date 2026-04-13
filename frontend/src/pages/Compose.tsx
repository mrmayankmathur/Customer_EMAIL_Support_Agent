import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Rocket, ClipboardList } from 'lucide-react';

const SAMPLES = [
  {
    sender: 'jane.smith@company.com',
    subject: 'Double charge on my subscription',
    body: 'Hi,\n\nI just checked my bank statement and it looks like I was charged twice for my Pro subscription this month — once on April 1st and again on April 3rd.\n\nThe amounts are $29.99 each. Can you please look into this and process a refund for the duplicate charge?\n\nThank you,\nJane'
  },
  {
    sender: 'dev.team@startup.io',
    subject: 'API returning 401 errors after key rotation',
    body: 'Hello support,\n\nWe rotated our API keys yesterday following your documentation, but all our requests are now returning 401 Unauthorized errors.\n\nWe\'ve confirmed the new key is being sent in the Authorization header correctly. Our integration was working fine before the rotation.\n\nCan you help us debug this? It\'s blocking our production deployment.\n\nBest,\nMike from DevOps'
  },
  {
    sender: 'alex.johnson@email.com',
    subject: 'Cannot reset my password',
    body: 'Hi there,\n\nI\'ve been trying to reset my password for the past hour but I never receive the reset email. I\'ve checked my spam folder and everything.\n\nMy account email is alex.johnson@email.com. I need to access my account urgently for a deadline.\n\nPlease help!\nAlex'
  },
];

export default function Compose() {
  const navigate = useNavigate();
  const [sampleIndex, setSampleIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    sender: '',
    subject: '',
    body: ''
  });

  const handleLoadSample = () => {
    const sample = SAMPLES[sampleIndex % SAMPLES.length];
    setFormData(sample);
    setSampleIndex(prev => prev + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sender || !formData.subject || !formData.body) return;

    setLoading(true);
    try {
      const response = await axios.post('/api/v1/process-email', formData);
      // Navigate to DetailedView to watch the nodes
      navigate(`/ticket/${response.data.ticket_id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to process email. Check console.');
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto pb-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold dark:text-darkText">Test / Compose Mock Email</h1>
        <p className="text-gray-500 dark:text-gray-400">Send a test email through the AI support pipeline and monitor the agent output in real-time.</p>
      </header>

      <div className="bg-lightBg dark:bg-darkCard border border-borderLight dark:border-borderDark rounded-2xl flex flex-col overflow-hidden shadow-sm">
        <div className="p-5 border-b border-borderLight dark:border-borderDark bg-gray-50 dark:bg-[#1a212e]">
           <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
             <span>📧</span> New Test Email
           </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="flex flex-col gap-2">
               <label className="text-xs font-bold uppercase tracking-wider text-gray-500">From (Sender)</label>
               <input
                 type="email"
                 required
                 placeholder="customer@example.com"
                 value={formData.sender}
                 onChange={e => setFormData({...formData, sender: e.target.value})}
                 className="w-full bg-[#F8FAFC] dark:bg-[#0D1117] text-gray-800 dark:text-[#A5D6FF] border border-borderLight dark:border-[#30363D] rounded-xl p-3 text-sm focus:outline-none focus:border-accentCyan transition-colors"
               />
             </div>
             <div className="flex flex-col gap-2">
               <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Subject</label>
               <input
                 type="text"
                 required
                 placeholder="e.g. Issue with my billing"
                 value={formData.subject}
                 onChange={e => setFormData({...formData, subject: e.target.value})}
                 className="w-full bg-[#F8FAFC] dark:bg-[#0D1117] text-gray-800 dark:text-[#A5D6FF] border border-borderLight dark:border-[#30363D] rounded-xl p-3 text-sm focus:outline-none focus:border-accentCyan transition-colors"
               />
             </div>
           </div>

           <div className="flex flex-col gap-2">
             <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Email Body</label>
             <textarea
               required
               placeholder="Write the customer's email body here..."
               value={formData.body}
               onChange={e => setFormData({...formData, body: e.target.value})}
               className="w-full h-48 bg-[#F8FAFC] dark:bg-[#0D1117] text-gray-800 dark:text-[#A5D6FF] border border-borderLight dark:border-[#30363D] rounded-xl p-4 text-sm leading-relaxed focus:outline-none focus:border-accentCyan transition-colors resize-none"
             />
           </div>

           <div className="flex items-center gap-4 pt-4 border-t border-borderLight dark:border-borderDark">
             <button
               type="submit"
               disabled={loading}
               className="flex items-center gap-2 bg-accentCyan text-white px-6 py-2.5 rounded-lg font-bold shadow-glow-cyan hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {loading ? (
                 <>
                   <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                   Processing...
                 </>
               ) : (
                 <>
                   <Rocket size={18} /> Process Email
                 </>
               )}
             </button>
             
             <button
               type="button"
               disabled={loading}
               onClick={handleLoadSample}
               className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-6 py-2.5 rounded-lg shadow-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
             >
               <ClipboardList size={18} /> Load Sample
             </button>
           </div>
        </form>
      </div>
    </div>
  );
}
