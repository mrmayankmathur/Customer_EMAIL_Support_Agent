import { useEffect } from "react";
import axios from "axios";
import { RefreshCw } from "lucide-react";
import { useAppStore } from "../store";
import KpiCard from "../components/shared/KpiCard";
import WorkflowMonitor from "../components/dashboard/WorkflowMonitor";
import RecentActivityTable from "../components/dashboard/RecentActivityTable";

export default function Dashboard() {
  const { kpis, setKpis, recentTickets, setRecentTickets } = useAppStore();

  useEffect(() => {
    // Fetch dashboard data
    const fetchData = async () => {
      try {
        const [kpiRes, ticketsRes] = await Promise.all([
          axios.get("/api/v1/kpis"),
          axios.get("/api/v1/emails/recent?limit=8"),
        ]);
        setKpis(kpiRes.data);
        setRecentTickets(ticketsRes.data.tickets);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [setKpis, setRecentTickets]);

  const handleManualRefresh = () => {
    axios.get("/api/v1/kpis").then((res) => setKpis(res.data));
    axios
      .get("/api/v1/emails/recent?limit=8")
      .then((res) => setRecentTickets(res.data.tickets));
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full">
      <header className="mb-2 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold dark:text-darkText">
            Operations Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Real-time overview of your support agent pipelines.
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          className="p-2 border border-borderLight dark:border-borderDark rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw size={18} className="text-gray-500 dark:text-gray-400" />
        </button>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Total Processed"
          value={kpis?.kpis.total_emails.value || "0"}
          change={kpis?.kpis.total_emails.change || "0%"}
          trend={kpis?.kpis.total_emails.trend || "up"}
          type="line"
        />
        <KpiCard
          title="Avg. Resolution"
          value={kpis?.kpis.avg_resolution_time.value || "0m"}
          change={kpis?.kpis.avg_resolution_time.change || "0%"}
          trend={kpis?.kpis.avg_resolution_time.trend || "down"}
          type="line"
        />
        <KpiCard
          title="Auto-Draft Success"
          value={kpis?.kpis.auto_draft_success.value || "0%"}
          change={kpis?.kpis.auto_draft_success.change || "0%"}
          trend={kpis?.kpis.auto_draft_success.trend || "up"}
          rawData={kpis?.kpis.auto_draft_success.raw_value || 0}
          type="progress"
        />
        <KpiCard
          title="Manual Escalations"
          value={kpis?.kpis.manual_escalations.value || "0"}
          change={kpis?.kpis.manual_escalations.change || "0%"}
          trend={kpis?.kpis.manual_escalations.trend || "down"}
          rawData={
            kpis?.kpis.health?.classifier_confidence || 85
          } /* mock visual for gauge */
          type="gauge"
        />
      </div>

      <div className="flex flex-col xl:flex-row gap-6 mt-4 flex-1 overflow-hidden">
        {/* Left Column: Flow & System Health */}
        <div className="xl:w-1/3 flex flex-col gap-6">
          <WorkflowMonitor />
          {/* System Health Component Inline */}
          <div className="bg-lightBg dark:bg-darkCard border border-borderLight dark:border-borderDark rounded-2xl p-6 shadow-sm flex-1">
            <h3 className="font-semibold dark:text-darkText mb-6">
              Agent Quality Health
            </h3>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500 dark:text-gray-400">
                    Classifier Confidence
                  </span>
                  <span className="font-mono text-accentCyan">
                    {kpis?.health?.classifier_confidence || "0"}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-accentCyan h-1.5 rounded-full"
                    style={{
                      width: `${kpis?.health?.classifier_confidence || 0}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500 dark:text-gray-400">
                    Retriever Precision
                  </span>
                  <span className="font-mono text-accentCyan">
                    {kpis?.health?.retriever_precision || "0"}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-accentCyan h-1.5 rounded-full"
                    style={{
                      width: `${kpis?.health?.retriever_precision || 0}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500 dark:text-gray-400">
                    Responder Quality
                  </span>
                  <span className="font-mono text-accentCyan">
                    {kpis?.health?.responder_quality || "0"}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-accentCyan h-1.5 rounded-full"
                    style={{
                      width: `${kpis?.health?.responder_quality || 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Table */}
        <RecentActivityTable tickets={recentTickets} />
      </div>
    </div>
  );
}
