import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Field';
import { ErrorNote } from '../ui/Surface';
import { AuthLayout } from './AuthLayout';
import { useSignup } from '../hooks/useAuth';
import { ROUTES } from '../constants/routes';
import { useTitle } from '../lib/useTitle';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Signup() {
  useTitle('Create an account');
  const navigate = useNavigate();
  const signup = useSignup();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const errors = {
    name: name.trim().length < 2 ? 'Tell us your name.' : '',
    email: EMAIL.test(email) ? '' : 'Enter a valid email address.',
    password: password.length < 8 ? 'Use at least 8 characters.' : '',
  };
  const valid = !errors.name && !errors.email && !errors.password;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    signup.mutate(
      { email: email.trim(), password, full_name: name.trim(), role: 'traveller', user_type: 'traveller' },
      { onSuccess: () => navigate(ROUTES.APP) },
    );
  };

  const serverMessage = (signup.error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message;
  const exists = serverMessage?.toLowerCase().includes('already exists');

  return (
    <AuthLayout
      title={
        <>
          Plan it <span className="mark mark-green">together</span>.
        </>
      }
      lead="Create a traveller account. Your travel agent sets up the trip, and you follow every change."
    >
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <h2 className="title text-3xl">Create an account</h2>
        <Input
          id="name"
          label="Your name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={touched ? errors.name : ''}
          required
        />
        <Input
          id="email"
          type="email"
          label="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={touched ? errors.email : ''}
          required
        />
        <Input
          id="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          hint="At least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={touched ? errors.password : ''}
          required
        />
        {signup.isError && (
          <ErrorNote>
            {exists ? 'An account with that email already exists. Try signing in.' : 'We could not create the account. Please try again.'}
          </ErrorNote>
        )}
        <Button size="lg" type="submit" loading={signup.isPending}>
          Create account
        </Button>
        <p className="text-sm text-ink-2">
          Already have one?{' '}
          <Link to={ROUTES.LOGIN} className="font-bold text-ink underline underline-offset-4 decoration-2">
            Sign in
          </Link>
          .
        </p>
      </form>
    </AuthLayout>
  );
}
