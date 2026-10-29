import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSubmitFeedback } from '../../hooks/useFeedback';
import { useCurrentTrip } from '../../hooks/useCurrentTrip';
import { useTripStore } from '../../stores/trip.store';
import { timeAgo } from '../../lib/format';

const feedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(3, 'Tell us a little more'),
});
type FeedbackFormData = z.infer<typeof feedbackSchema>;

const IDEAS = [
  'Add more outdoor time and fewer museums',
  'Keep it cheaper: free or low-cost places only',
  'Lighter days, with fewer long walks',
  'More food and markets',
];

interface FeedbackPanelProps {
  onNavigate: (page: string) => void;
}

export function FeedbackPanel({ onNavigate }: FeedbackPanelProps) {
  const { trip, tripId, name } = useCurrentTrip();
  const setLastJobId = useTripStore((s) => s.setLastJobId);
  const { mutate: submitFeedback, isPending, isError, error } = useSubmitFeedback();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { rating: 4, comment: '' },
  });
  const rating = watch('rating');

  const onSubmit = (data: FeedbackFormData) => {
    submitFeedback(
      { node_id: 'general', rating: data.rating, comment: data.comment },
      {
        onSuccess: (result) => {
          reset();
          const jobId = (result as { job_id?: string }).job_id;
          if (jobId) setLastJobId(jobId);
          onNavigate(jobId ? `/optimization?job_id=${jobId}` : 'optimization-progress');
        },
      },
    );
  };

  const history = [...(trip?.feedback_history ?? [])].reverse();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          Feedback
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Tell the planner what to change in {name}. An AI agent turns your message into new constraints, the optimizer
          re-plans, and your agent reviews the result.
        </p>
      </div>

      <Card padding="md">
        <CardHeader>
          <CardTitle>What would you change?</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <textarea
              {...register('comment')}
              className="w-full text-sm p-3 rounded"
              rows={4}
              placeholder="For example: the kids are getting restless with museums. Can we swap in something outdoors?"
              style={{
                backgroundColor: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            />
            {errors.comment && <p className="text-xs text-red-500 mt-1">{errors.comment.message}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              {IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => setValue('comment', idea, { shouldValidate: true })}
                  className="text-[11px] px-2.5 py-1 rounded-full"
                  style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)', backgroundColor: 'var(--muted)' }}
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium">How is the current plan?</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <label key={star} className="cursor-pointer" aria-label={`${star} star${star > 1 ? 's' : ''}`}>
                <input type="radio" value={star} {...register('rating', { valueAsNumber: true })} className="sr-only" />
                <span className="text-xl" style={{ color: rating >= star ? 'var(--warning)' : 'var(--border)' }}>★</span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3">
            {isError && (
              <p className="text-xs text-red-500">
                {(error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                  'Could not submit feedback. Please try again.'}
              </p>
            )}
            <Button variant="primary" size="md" type="submit" loading={isPending} disabled={!tripId}>
              Send to planner
            </Button>
          </div>
        </form>
      </Card>

      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          Feedback history
        </h2>
        <Card padding="none">
          {history.length === 0 && (
            <p className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              No feedback yet for this trip.
            </p>
          )}
          {history.map((h, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 text-xs"
              style={{ borderBottom: i < history.length - 1 ? '1px solid var(--border)' : undefined }}
            >
              <span style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                {h.timestamp ? timeAgo(h.timestamp) : `Round ${h.iteration ?? ''}`}
              </span>
              <span className="flex-1">“{h.message}”</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
