import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Field';
import { ErrorNote } from '../ui/Surface';
import { RoleSwitch, type AccountRole } from '../ui/RoleSwitch';
import { useAuthStore } from '../stores/auth.store';
import { AuthLayout } from './AuthLayout';
import { useLogin } from '../hooks/useAuth';
import { ROUTES } from '../constants/routes';
import { useTitle } from '../lib/useTitle';

export function Login() {
  useTitle('Sign in');
  const navigate = useNavigate();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [params] = useSearchParams();
  const [role, setRole] = useState<AccountRole>(params.get('as') === 'agent' ? 'agent' : 'traveller');
  const [mismatch, setMismatch] = useState<AccountRole | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = new URLSearchParams();
    body.append('username', email);
    body.append('password', password);
    setMismatch(null);
    login.mutate(body, {
      onSuccess: () => {
        // The account decides what you can do; the switch only checks you meant the right door
        const actual: AccountRole = useAuthStore.getState().user?.role === 'agent' ? 'agent' : 'traveller';
        if (actual !== role) {
          useAuthStore.getState().logout();
          setMismatch(actual);
          return;
        }
        navigate(ROUTES.APP);
      },
    });
  };

  return (
    <AuthLayout
      title={
        <>
          Welcome <span className="mark mark-yellow">back</span>.
        </>
      }
      lead="Sign in as a traveller to follow your trip, or as a travel agent to run customers, trips and approvals."
    >
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <h2 className="title text-3xl">Sign in</h2>
        <RoleSwitch value={role} onChange={(r) => { setRole(r); setMismatch(null); }} />
        <Input
          id="email"
          type="email"
          label="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          id="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {mismatch && (
          <ErrorNote>
            That is {mismatch === 'agent' ? 'a travel agent' : 'a traveller'} account. Switch to {mismatch === 'agent' ? 'Travel agent' : 'Traveller'} above and sign in again.
          </ErrorNote>
        )}
        {login.isError && <ErrorNote>That email and password do not match. Check them and try again.</ErrorNote>}
        <Button size="lg" type="submit" loading={login.isPending} disabled={!email || !password}>
          Sign in
        </Button>
        <p className="text-sm text-ink-2">
          New here?{' '}
          <Link to={`${ROUTES.SIGNUP}${role === 'agent' ? '?as=agent' : ''}`} className="font-bold text-ink underline underline-offset-4 decoration-2">
            Create an account
          </Link>
          {' '}or{' '}
          <Link to={ROUTES.DEMO} className="font-bold text-ink underline underline-offset-4 decoration-2">
            explore the demo
          </Link>
          .
        </p>
      </form>
    </AuthLayout>
  );
}
