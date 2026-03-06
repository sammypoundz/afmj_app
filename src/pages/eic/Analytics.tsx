import { LineChart, PieChart, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Line, Pie, Cell } from "recharts";

const Analytics = () => {

  const visitsData = [
    { date: "2026-02-08", visits: 120 },
    { date: "2026-02-09", visits: 150 },
    { date: "2026-02-10", visits: 90 },
    { date: "2026-02-11", visits: 200 },
    { date: "2026-02-12", visits: 170 },
  ];

  const engagementData = [
    { type: "Manuscripts Viewed", value: 350 },
    { type: "Reviews Submitted", value: 120 },
    { type: "Comments Posted", value: 45 },
  ];

  const COLORS = ["#16a34a", "#2563eb", "#f59e0b"];

  return (
    <div className="content" style={{ padding: 16 }}>
      <h2>Site Analytics</h2>

      {/* Summary Cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
        <div style={{ flex: 1, minWidth: 200, background: "#f3f4f6", padding: 16, borderRadius: 12 }}>
          <h4>Total Visits</h4>
          <p style={{ fontSize: 24, fontWeight: 600 }}>1,230</p>
        </div>

        <div style={{ flex: 1, minWidth: 200, background: "#f3f4f6", padding: 16, borderRadius: 12 }}>
          <h4>New Users</h4>
          <p style={{ fontSize: 24, fontWeight: 600 }}>87</p>
        </div>

        <div style={{ flex: 1, minWidth: 200, background: "#f3f4f6", padding: 16, borderRadius: 12 }}>
          <h4>Active Authors</h4>
          <p style={{ fontSize: 24, fontWeight: 600 }}>34</p>
        </div>

        <div style={{ flex: 1, minWidth: 200, background: "#f3f4f6", padding: 16, borderRadius: 12 }}>
          <h4>Submissions</h4>
          <p style={{ fontSize: 24, fontWeight: 600 }}>58</p>
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
          <h4>Visits Over Time</h4>

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
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: 8 }}>Dr. Aisha Bello</td>
              <td style={{ padding: 8 }}>12</td>
              <td style={{ padding: 8 }}>5</td>
            </tr>

            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: 8 }}>Dr. Ibrahim Musa</td>
              <td style={{ padding: 8 }}>9</td>
              <td style={{ padding: 8 }}>7</td>
            </tr>

            <tr>
              <td style={{ padding: 8 }}>Dr. Zainab Lawal</td>
              <td style={{ padding: 8 }}>7</td>
              <td style={{ padding: 8 }}>4</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Analytics;
