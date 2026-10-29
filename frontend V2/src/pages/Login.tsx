import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Field';
import { ErrorNote } from '../ui/Surface';
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

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = new URLSearchParams();
    body.append('username', email);
    body.append('password', password);
    login.mutate(body, { onSuccess: () => navigate(ROUTES.APP) });
  };

  return (
    <AuthLayout
      title={
        <>
          Welcome <span className="mark mark-yellow">back</span>.
        </>
      }
      lead="Sign in to see your trip and what has changed."
    >
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <h2 className="title text-3xl">Sign in</h2>
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
        {login.isError && <ErrorNote>That email and password do not match. Check them and try again.</ErrorNote>}
        <Button size="lg" type="submit" loading={login.isPending} disabled={!email || !password}>
          Sign in
        </Button>
        <p className="text-sm text-ink-2">
          New here?{' '}
          <Link to={ROUTES.SIGNUP} className="font-bold text-ink underline underline-offset-4 decoration-2">
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
