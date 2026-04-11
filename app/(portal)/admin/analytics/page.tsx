export default function AdminAnalyticsPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold">Analytics</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Track submission throughput, review turnaround, and publication velocity.
      </p>
      <div className="mt-5 rounded border p-4 text-sm">
        <strong>Metrics:</strong> New submissions, decision latency, reviewer acceptance rate, published articles.
      </div>
    </div>
  );
}
