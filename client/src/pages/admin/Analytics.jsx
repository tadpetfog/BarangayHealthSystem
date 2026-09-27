import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar.jsx";
import api from "../../services/api.js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  DashboardHeader,
  SectionHeader,
  StatCard,
  ChartCard
} from "../../components/dashboard/DashboardUI.jsx";
import { UserIcon, CalendarIcon, ClipboardIcon } from "../../components/Icons.jsx";
import { HeartPulse } from "lucide-react";

const STATUS_COLORS = {
  Pending: "#f59e0b",
  Confirmed: "#2563eb",
  Completed: "#16a34a",
  Cancelled: "#ef4444"
};

function Analytics() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [reportGenerated, setReportGenerated] = useState(null);

  const refreshAnalytics = async () => {
    try {
      const response = await api.get("/analytics");
      setData(response.data);
      setMessage("");
      setReportGenerated((generated) =>
        generated ? new Date().toLocaleString() : null
      );
    } catch {
      setMessage("Failed to load analytics.");
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadAnalytics = async () => {
      try {
        const response = await api.get("/analytics");
        if (!cancelled) {
          setData(response.data);
          setMessage("");
          setReportGenerated((generated) =>
            generated ? new Date().toLocaleString() : null
          );
        }
      } catch {
        if (!cancelled) setMessage("Failed to load analytics.");
      }
    };

    loadAnalytics();
    const intervalId = window.setInterval(loadAnalytics, 30000);
    window.addEventListener("focus", loadAnalytics);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", loadAnalytics);
    };
  }, []);

  const reportRows = data
    ? [
        { category: "Resident records", label: "Total Patients", value: data.totalPatients },
        { category: "Appointments", label: "Total Appointments", value: data.totalAppointments },
        { category: "Appointments", label: "Pending Appointments", value: data.pendingAppointments },
        { category: "Appointments", label: "Confirmed Appointments", value: data.confirmedAppointments },
        { category: "Appointments", label: "Completed Appointments", value: data.completedAppointments },
        { category: "Appointments", label: "Cancelled Appointments", value: data.cancelledAppointments },
        { category: "Consultations & services", label: "Total Consultations", value: data.totalConsultations },
        { category: "Consultations & services", label: "Completed Consultations", value: data.completedConsultations },
        { category: "Consultations & services", label: "Cancelled Consultations", value: data.cancelledConsultations },
        { category: "Consultations & services", label: "Health Services Provided", value: data.healthServicesProvided }
      ]
    : [];

  const reportSummary = data
    ? [
        { label: "Total Patients", value: data.totalPatients },
        { label: "Total Appointments", value: data.totalAppointments },
        { label: "Total Consultations", value: data.totalConsultations },
        { label: "Health Services Provided", value: data.healthServicesProvided }
      ]
    : [];

  const reportGroups = ["Resident records", "Appointments", "Consultations & services"].map(
    (category) => ({
      label: category,
      rows: reportRows.filter((row) => row.category === category)
    })
  );

  const statusData = data
    ? [
        { name: "Pending", count: data.pendingAppointments },
        { name: "Confirmed", count: data.confirmedAppointments },
        { name: "Completed", count: data.completedAppointments },
        { name: "Cancelled", count: data.cancelledAppointments }
      ]
    : [];

  const downloadReport = () => {
    const generated = reportGenerated || new Date().toLocaleString();
    const csv = [
      "Barangay Health Center — Health Statistics Report",
      `"Generated", "${generated}"`,
      "Metric,Count",
      ...reportRows.map((row) => `"${row.label}",${row.value}`)
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "barangay-health-report.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="analytics-page">
      <Navbar />
      <div className="page">
        <DashboardHeader
          eyebrow="Health Data & Reports"
          title="Analytics"
          subtitle="Aggregated, non-identifying statistics across the barangay health system."
        />

        {message && <p className="message">{message}</p>}
        {!data && !message && <p>Loading...</p>}

        {data && (
          <>
            <div className="stats">
              <StatCard
                icon={<UserIcon />}
                label="Total Patients"
                value={data.totalPatients}
                hint="Registered health records."
                tone="blue"
              />

              <StatCard
                icon={<CalendarIcon />}
                label="Total Appointments"
                value={data.totalAppointments}
                hint={`${data.pendingAppointments} pending · ${data.completedAppointments} completed`}
                tone="amber"
              />

              <StatCard
                icon={<ClipboardIcon />}
                label="Total Consultations"
                value={data.totalConsultations}
                hint={`${data.completedConsultations} completed · ${data.cancelledConsultations} cancelled`}
                tone="teal"
              />
            </div>

            <SectionHeader
              title="Appointments Overview"
              description="How bookings are distributed across their current status."
            />

            <div className="chart-grid-2">
              <ChartCard
                title="Appointments by Status"
                description="Counts per status across all appointments."
              >
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={statusData}
                      margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e6ebf2"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(37, 99, 235, 0.04)" }}
                        contentStyle={{
                          background: "#fff",
                          border: "1px solid #e6ebf2",
                          borderRadius: 12,
                          fontSize: 13,
                          boxShadow: "0 10px 30px rgba(10,37,64,0.08)"
                        }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                        {statusData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={STATUS_COLORS[entry.name] || "#2563eb"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard
                title="Status Share"
                description="Proportion of each appointment status."
              >
                <div style={{ width: "100%", height: 200 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="count"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={86}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {statusData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={STATUS_COLORS[entry.name] || "#2563eb"}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#fff",
                          border: "1px solid #e6ebf2",
                          borderRadius: 12,
                          fontSize: 13,
                          boxShadow: "0 10px 30px rgba(10,37,64,0.08)"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="donut-legend">
                  {statusData.map((entry) => (
                    <div key={entry.name} className="donut-legend-item">
                      <span
                        className="donut-legend-swatch"
                        style={{ background: STATUS_COLORS[entry.name] }}
                      />
                      {entry.name}
                      <strong>{entry.count}</strong>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>

            <div className="chart-card report-actions" style={{ marginTop: "1.5rem" }}>
              <h2>Health Statistics Report</h2>
              <p style={{ marginBottom: "1rem", color: "var(--text-muted)" }}>
                Generate a summary report of aggregated, non-identifying health
                statistics. You can print it or download it as a CSV file.
              </p>

              <button type="button" onClick={refreshAnalytics}>
                Refresh Data
              </button>
              <button
                type="button"
                onClick={() => setReportGenerated(new Date().toLocaleString())}
              >
                Generate Report
              </button>
              {reportGenerated && (
                <>
                  <button type="button" onClick={() => window.print()}>
                    Print Report
                  </button>
                  <button type="button" onClick={downloadReport}>
                    Download CSV
                  </button>
                </>
              )}
            </div>

            {reportGenerated && (
              <article className="report-area" aria-labelledby="report-title">
                <header className="report-header">
                  <div className="report-heading">
                    <div className="report-brand-row">
                      <span className="care-mark report-brand-mark" aria-hidden="true">
                        <HeartPulse />
                      </span>
                      <p className="report-facility">Barangay Health Center</p>
                    </div>
                    <h2 id="report-title">Health Statistics Report</h2>
                    <p className="report-intro">
                      System-wide totals for patient records, appointments,
                      consultations, and services.
                    </p>
                  </div>
                  <dl className="report-meta">
                    <div>
                      <dt>Generated</dt>
                      <dd>{reportGenerated}</dd>
                    </div>
                    <div>
                      <dt>Data scope</dt>
                      <dd>All recorded data</dd>
                    </div>
                  </dl>
                </header>

                <p className="report-disclaimer">
                  Aggregated figures only. This report does not include individual patient information.
                </p>

                <section className="report-section" aria-labelledby="report-summary-title">
                  <h3 id="report-summary-title">Summary Statistics</h3>
                  <dl className="report-summary">
                    {reportSummary.map((item) => (
                      <div key={item.label}>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section className="report-section report-details" aria-labelledby="report-details-title">
                  <h3 id="report-details-title">Detailed Statistics</h3>
                  <table className="report-table">
                    <caption className="sr-only">Detailed health statistics by category</caption>
                    <thead>
                      <tr>
                        <th scope="col">Statistic</th>
                        <th scope="col" className="report-count">Count</th>
                      </tr>
                    </thead>
                    {reportGroups.map((group) => (
                      <tbody className="report-table-group" key={group.label}>
                        <tr>
                          <th className="report-group-title" scope="colgroup" colSpan="2">
                            {group.label}
                          </th>
                        </tr>
                        {group.rows.map((row) => (
                          <tr key={row.label}>
                            <th scope="row">{row.label}</th>
                            <td className="report-count">{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    ))}
                  </table>
                </section>
                <footer className="report-footer">
                  <span>Barangay Health Center</span>
                  <span>Health Statistics Report</span>
                </footer>
              </article>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Analytics;
