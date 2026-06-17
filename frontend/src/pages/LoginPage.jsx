import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { Loader2 } from 'lucide-react';
import api from '../api/axios';
import { setCredentials } from '../features/auth/authSlice';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const loginMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/auth/login', data);
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.data.accessToken);
      dispatch(setCredentials({ user: data.data.user }));
      navigate('/dashboard');
    }
  });

  const onSubmit = (data) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="w-full">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
        <p className="text-slate-400">Sign in to your account to continue</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {loginMutation.isError && (
          <div className="p-3 bg-crimson-500/10 border border-crimson-500/50 rounded-lg text-crimson-400 text-sm">
            {loginMutation.error.response?.data?.message || 'Login failed. Please try again.'}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Work email</label>
          <input 
            type="email" 
            {...register('email')}
            className="w-full bg-noir-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-colors"
            placeholder="name@company.com"
          />
          {errors.email && <p className="text-xs text-crimson-400 mt-1">{errors.email.message}</p>}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">Password</label>
            <Link to="/forgot-password" className="text-xs text-crimson-400 hover:text-crimson-300">Forgot password?</Link>
          </div>
          <input 
            type="password" 
            {...register('password')}
            className="w-full bg-noir-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-colors"
            placeholder="••••••••"
          />
          {errors.password && <p className="text-xs text-crimson-400 mt-1">{errors.password.message}</p>}
        </div>

        <button 
          type="submit" 
          disabled={loginMutation.isPending}
          className="w-full bg-crimson-600 hover:bg-crimson-500 text-white rounded-xl px-4 py-3 font-semibold transition-all hover:shadow-lg hover:shadow-crimson-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-4"
        >
          {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign in'}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-slate-400">
        New company? <Link to="/register" className="text-crimson-400 hover:text-crimson-300 font-medium">Register your organization</Link>
      </div>
    </div>
  );
}
