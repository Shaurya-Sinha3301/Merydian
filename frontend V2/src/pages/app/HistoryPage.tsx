import { useParams } from 'react-router-dom';
import { useTripHistory } from '../../hooks/useCustomers';
import { CostBars } from '../../features/agent/CostBars';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Tag } from '../../ui/Tag';
import { formatMoney, formatSignedMoney, timeAgo } from '../../lib/format';

function when(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function HistoryPage() {
  const { tripId = '' } = useParams();
  const { data, isLoading, error } = useTripHistory(tripId);

  if (isLoading) return <Loading label="Loading the history" />;
  if (error || !data) return <ErrorNote>The history could not be loaded.</ErrorNote>;
  if (data.versions.length === 0 && data.feedback.length === 0) {
    return <Empty title="No history yet">Versions and feedback appear here once the plan has been published.</Empty>;
  }

  const versions = data.versions;
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="min-w-0 border border-rule bg-paper lg:col-span-7" aria-labelledby="versions">
        <h2 id="versions" className="title border-b-2 border-ink px-4 py-2.5 text-lg">
          Versions
        </h2>
        <div className="overflow-x-auto">
          <table className="ruled min-w-[36rem]">
            <thead>
              <tr>
                <th>Version</th>
                <th>When</th>
                <th>Why</th>
                <th className="num">Cost</th>
                <th className="num">vs previous</th>
                <th className="num">Fit</th>
              </tr>
            </thead>
            <tbody>
              {[...versions].reverse().map((v, i, all) => {
                const prev = all[i + 1];
                const delta = prev?.total_cost != null && v.total_cost != null ? v.total_cost - prev.total_cost : null;
                return (
                  <tr key={v.version} className="align-top">
                    <td>
                      <Tag tone={i === 0 ? 'ai' : 'neutral'}>v{v.version}</Tag>
                    </td>
                    <td className="whitespace-nowrap text-ink-2">{when(v.created_at)}</td>
                    <td className="max-w-[16rem] text-ink-2">{v.created_reason}</td>
                    <td className="num font-semibold">{formatMoney(v.total_cost)}</td>
                    <td className={`num ${delta && delta < 0 ? 'text-green' : delta && delta > 0 ? 'text-magenta' : ''}`}>{delta == null ? '—' : formatSignedMoney(delta)}</td>
                    <td className="num">{v.total_satisfaction != null ? `${Math.round(v.total_satisfaction * 10)}%` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {versions.length > 1 && (
          <div className="grid gap-5 border-t-2 border-ink p-4 sm:grid-cols-2">
            <div>
              <h3 className="title text-base">Cost by version</h3>
              <CostBars className="mt-2" items={versions.map((v) => ({ label: `Version ${v.version}`, value: v.total_cost ?? 0 }))} />
            </div>
            <div>
              <h3 className="title text-base">Fit by version</h3>
              <CostBars
                className="mt-2"
                format={(n) => `${n}%`}
                items={versions.map((v) => ({ label: `Version ${v.version}`, value: Math.round((v.total_satisfaction ?? 0) * 10) }))}
              />
            </div>
          </div>
        )}
      </section>

      <section className="min-w-0 border border-rule bg-paper lg:col-span-5" aria-labelledby="feedback">
        <h2 id="feedback" className="title border-b-2 border-ink px-4 py-2.5 text-lg">
          Feedback log
        </h2>
        {data.feedback.length === 0 ? (
          <p className="px-4 py-5 text-sm text-ink-2">No feedback has been sent for this trip.</p>
        ) : (
          <ol className="divide-y divide-rule">
            {[...data.feedback].reverse().map((f, i) => (
              <li key={i} className="px-4 py-3">
                <p className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
                  <span>{when(f.timestamp)}</span>
                  <span>{timeAgo(f.timestamp)}</span>
                  {f.action && <Tag tone="ai">{f.action}</Tag>}
                </p>
                <p className="mt-1 text-ink">{f.message}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
