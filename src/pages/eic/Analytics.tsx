import { useState, useEffect } from "react";
import { LineChart, PieChart, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Line, Pie, Cell } from "recharts";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

const Analytics = () => {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalVisits: 0,
    newUsers: 0,
    activeAuthors: 0,
    submissions: 0
  });
  const [visitsData, setVisitsData] = useState<{ date: string; visits: number }[]>([]);
  const [engagementData, setEngagementData] = useState<{ type: string; value: number }[]>([]);
  const [topAuthors, setTopAuthors] = useState<{ author: string; submissions: number; reviews_completed: number }[]>([]);

  const COLORS = ["#16a34a", "#2563eb", "#f59e0b"];

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await authFetch("https://vinosschool.com/api/analyticsApi.php?action=getData");
        if (!res.ok) throw new Error("Failed to fetch analytics");
        const data = await res.json();
        setSummary(data.summary);
        setVisitsData(data.visitsData);
        setEngagementData(data.engagementData);
        setTopAuthors(data.topAuthors);
      } catch (err) {
        console.error(err);
        toast.error("Could not load analytics data");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [authFetch]);

  if (loading) {
    return <div className="content" style={{ padding: 16 }}>Loading analytics...</div>;
  }

  return (
    <div className="content" style={{ padding: 16 }}>
      <h2>Site Analytics</h2>

      {/* Summary Cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
        <div style={{ flex: 1, minWidth: 200, background: "#f3f4f6", padding: 16, borderRadius: 12 }}>
          <h4>Total Visits</h4>
          <p style={{ fontSize: 24, fontWeight: 600 }}>{summary.totalVisits.toLocaleString()}</p>
        </div>

        <div style={{ flex: 1, minWidth: 200, background: "#f3f4f6", padding: 16, borderRadius: 12 }}>
          <h4>New Users (30d)</h4>
          <p style={{ fontSize: 24, fontWeight: 600 }}>{summary.newUsers}</p>
        </div>

        <div style={{ flex: 1, minWidth: 200, background: "#f3f4f6", padding: 16, borderRadius: 12 }}>
          <h4>Active Authors (30d)</h4>
          <p style={{ fontSize: 24, fontWeight: 600 }}>{summary.activeAuthors}</p>
        </div>

        <div style={{ flex: 1, minWidth: 200, background: "#f3f4f6", padding: 16, borderRadius: 12 }}>
          <h4>Submissions</h4>
          <p style={{ fontSize: 24, fontWeight: 600 }}>{summary.submissions}</p>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 32 }}>

        {/* Visits */}
        <div
          style={{
            flex: 1,
            minWidth: 400,
            background: "#fff",
            padding: 16,
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}
        >
          <h4>Visits Over Time (Last 7 Days)</h4>
          <LineChart width={400} height={250} data={visitsData}>
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="visits" stroke="#16a34a" strokeWidth={3} />
          </LineChart>
        </div>

        {/* Engagement */}
        <div
          style={{
            flex: 1,
            minWidth: 400,
            background: "#fff",
            padding: 16,
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}
        >
          <h4>User Engagement</h4>
          <PieChart width={400} height={250}>
            <Pie
              data={engagementData}
              dataKey="value"
              nameKey="type"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {engagementData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>
      </div>

      {/* Top authors */}
      <div style={{ marginTop: 32 }}>
        <h4>Top Active Authors</h4>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 8 }}>Author</th>
              <th style={{ padding: 8 }}>Submissions</th>
              <th style={{ padding: 8 }}>Reviews Completed</th>
            </tr>
          </thead>
          <tbody>
            {topAuthors.map((author, index) => (
              <tr key={index} style={{ borderBottom: index < topAuthors.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                <td style={{ padding: 8 }}>{author.author}</td>
                <td style={{ padding: 8 }}>{author.submissions}</td>
                <td style={{ padding: 8 }}>{author.reviews_completed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Analytics;