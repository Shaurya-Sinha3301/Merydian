import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLogin } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onLogin: (role: 'customer' | 'agent') => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const { mutate: login, isPending, error } = useLogin();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    const params = new URLSearchParams();
    params.append('username', data.username);
    params.append('password', data.password);
    
    login(params, {
      onSuccess: () => {
        // Assume customer for now, in a real app backend would return role
        onLogin('customer');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 text-xs bg-red-50 text-red-600 rounded border border-red-100">
          {error instanceof Error ? error.message : 'Login failed'}
        </div>
      )}
      
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
          Email / Username
        </label>
        <input
          {...register('username')}
          type="text"
          className="w-full h-8 px-3 text-sm rounded bg-transparent border transition-colors focus:outline-none focus:border-primary"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          placeholder="you@example.com"
        />
        {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
          Password
        </label>
        <input
          {...register('password')}
          type="password"
          className="w-full h-8 px-3 text-sm rounded bg-transparent border transition-colors focus:outline-none focus:border-primary"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          placeholder="••••••••"
        />
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={isPending}
        className="w-full mt-4"
      >
        Sign in
      </Button>
    </form>
  );
}