import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Field';
import { ErrorNote } from '../ui/Surface';
import { AuthLayout } from './AuthLayout';
import { phase4Service } from '../services/phase4';
import { ROUTES } from '../constants/routes';
import { useTitle } from '../lib/useTitle';

function messageOf(err: unknown): string {
  const e = err as { response?: { data?: { message?: string; detail?: string } }; message?: string };
  return e.response?.data?.message || e.response?.data?.detail || e.message || 'Something went wrong.';
}

/** Ask for a reset link. The answer is the same whether or not the address has an account. */
export function ForgotPassword() {
  useTitle('Forgot password');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState('busy');
    setError(null);
    try {
      await phase4Service.forgot(email.trim());
      setState('done');
    } catch (err) {
      setError(messageOf(err));
      setState('idle');
    }
  };

  return (
    <AuthLayout title={<>Back in.</>} lead="We will email you a link to choose a new password. It works once and lasts an hour.">
      {state === 'done' ? (
        <div className="flex flex-col gap-4">
          <h2 className="title text-3xl">Check your email</h2>
          <p className="text-ink-2">If {email} has an account, a reset link is on its way. It can take a minute.</p>
          <Link to={ROUTES.LOGIN} className="font-semibold underline underline-offset-4">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <h2 className="title text-3xl">Reset your password</h2>
          <Input id="email" type="email" label="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button size="lg" type="submit" loading={state === 'busy'} disabled={!email.includes('@')}>
            Send the link
          </Button>
          <Link to={ROUTES.LOGIN} className="text-sm font-semibold underline underline-offset-4">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}

/** Choose a password from a reset or invitation link. */
export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [info, setInfo] = useState<{ purpose: 'reset' | 'invite'; email?: string | null; full_name?: string | null } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useTitle(info?.purpose === 'invite' ? 'Accept your invitation' : 'Choose a new password');

  useEffect(() => {
    if (!token) return;
    phase4Service
      .tokenInfo(token)
      .then(setInfo)
      .catch((e) => setProblem(messageOf(e)));
  }, [token]);

  const invite = info?.purpose === 'invite';
  const short = password.length > 0 && password.length < 8;
  const mismatch = again.length > 0 && again !== password;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || password !== again) return;
    setBusy(true);
    try {
      await phase4Service.reset(token, password);
      setDone(true);
      window.setTimeout(() => navigate(ROUTES.LOGIN), 1800);
    } catch (err) {
      setProblem(messageOf(err));
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={invite ? <>Welcome aboard.</> : <>A fresh start.</>}
      lead={invite ? 'Your travel agent set up an account for you. Choose a password to see your trip.' : 'Choose a new password for your account.'}
    >
      {!token || problem ? (
        <div className="flex flex-col gap-4">
          <h2 className="title text-3xl">This link will not work</h2>
          <ErrorNote>{problem || 'The link is missing its code.'}</ErrorNote>
          <Link to="/forgot" className="font-semibold underline underline-offset-4">
            Ask for a new link
          </Link>
        </div>
      ) : done ? (
        <div className="flex flex-col gap-3">
          <h2 className="title text-3xl">Password set</h2>
          <p className="text-ink-2">Taking you to sign in.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <h2 className="title text-3xl">{invite ? `Hello${info?.full_name ? `, ${info.full_name}` : ''}` : 'Choose a new password'}</h2>
          {info?.email && <p className="text-sm text-ink-2">Account: {info.email}</p>}
          <Input id="password" type="password" label="New password" autoComplete="new-password" hint="At least 8 characters." value={password} onChange={(e) => setPassword(e.target.value)} error={short ? 'Use at least 8 characters.' : ''} required />
          <Input id="again" type="password" label="Type it again" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} error={mismatch ? 'The two do not match.' : ''} required />
          <Button size="lg" type="submit" loading={busy} disabled={password.length < 8 || password !== again}>
            {invite ? 'Set password and continue' : 'Set the password'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
