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
  const [agency, setAgency] = useState(false);
  const [code, setCode] = useState('');

  const errors = {
    name: name.trim().length < 2 ? 'Tell us your name.' : '',
    email: EMAIL.test(email) ? '' : 'Enter a valid email address.',
    password: password.length < 8 ? 'Use at least 8 characters.' : '',
    code: agency && !code.trim() ? 'Enter your agency code.' : '',
  };
  const valid = !errors.name && !errors.email && !errors.password && !errors.code;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    signup.mutate(
      { email: email.trim(), password, full_name: name.trim(), role: agency ? 'agent' : 'traveller', user_type: agency ? 'agent' : 'traveller', ...(agency ? { agent_code: code.trim() } : {}) },
      { onSuccess: () => navigate(ROUTES.APP) },
    );
  };

  const serverMessage = (signup.error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message;
  const exists = serverMessage?.toLowerCase().includes('already exists');
  const badCode = serverMessage?.toLowerCase().includes('agency code');

  return (
    <AuthLayout
      title={
        <>
          Plan it <span className="mark mark-green">together</span>.
        </>
      }
      lead="Plan your own Delhi trip, ask for changes in plain words, and follow every change. Travel agencies can sign up with their code."
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
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={agency} onChange={(e) => setAgency(e.target.checked)} className="h-4 w-4 accent-[var(--color-ink)]" />
            I work for a travel agency
          </label>
          {agency && (
            <div className="mt-3">
              <Input id="code" label="Agency code" value={code} onChange={(e) => setCode(e.target.value)} error={touched ? errors.code : ''} autoComplete="off" hint="Given to you by your agency. It creates a travel agent account." />
            </div>
          )}
        </div>
        {signup.isError && (
          <ErrorNote>
            {exists ? 'An account with that email already exists. Try signing in.' : badCode ? 'That agency code is not valid.' : 'We could not create the account. Please try again.'}
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
