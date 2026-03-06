// import { Clock, CheckCircle } from "lucide-react";

const reviews = [
  { manuscript: "AI Rural Healthcare", progress: 70 },
  { manuscript: "Blockchain Medical Security", progress: 40 },
  { manuscript: "Malaria Detection ML", progress: 90 },
];

const ReviewProgressPage = () => {
  return (
    <div style={{ padding: 24 }}>
      <h2>Review Progress Monitoring</h2>

      <div style={{ display: "grid", gap: 18 }}>
        {reviews.map((r, i) => (
          <div
            key={i}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 18
            }}
          >
            <h4>{r.manuscript}</h4>

            <div
              style={{
                height: 8,
                background: "#e5e7eb",
                borderRadius: 10,
                marginTop: 10
              }}
            >
              <div
                style={{
                  width: `${r.progress}%`,
                  height: "100%",
                  background: "#16a34a",
                  borderRadius: 10
                }}
              />
            </div>

            <div style={{ marginTop: 10, fontSize: 14 }}>
              Progress: {r.progress}%
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default ReviewProgressPage;