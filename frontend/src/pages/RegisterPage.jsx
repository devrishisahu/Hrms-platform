import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { Loader2 } from 'lucide-react';
import api from '../api/axios';
import { setCredentials } from '../features/auth/authSlice';

const registerSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  name: z.string().min(2, 'Your name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema)
  });

  const registerMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/auth/register-tenant', data);
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.data.accessToken);
      dispatch(setCredentials({ user: data.data.user }));
      navigate('/dashboard');
    }
  });

  const onSubmit = (data) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="w-full">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Create your workspace</h1>
        <p className="text-slate-400">Set up HRVerse for your organization.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {registerMutation.isError && (
          <div className="p-3 bg-crimson-500/10 border border-crimson-500/50 rounded-lg text-crimson-400 text-sm">
            {registerMutation.error.response?.data?.message || 'Registration failed. Please try again.'}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Company Name</label>
          <input 
            type="text" 
            {...register('companyName')}
            className="w-full bg-noir-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-colors"
            placeholder="Acme Corp"
          />
          {errors.companyName && <p className="text-xs text-crimson-400 mt-1">{errors.companyName.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Your Full Name</label>
          <input 
            type="text" 
            {...register('name')}
            className="w-full bg-noir-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-colors"
            placeholder="Jane Doe"
          />
          {errors.name && <p className="text-xs text-crimson-400 mt-1">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Work Email</label>
          <input 
            type="email" 
            {...register('email')}
            className="w-full bg-noir-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500 transition-colors"
            placeholder="jane@acme.com"
          />
          {errors.email && <p className="text-xs text-crimson-400 mt-1">{errors.email.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Password</label>
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
          disabled={registerMutation.isPending}
          className="w-full bg-crimson-600 hover:bg-crimson-500 text-white rounded-xl px-4 py-3 font-semibold transition-all hover:shadow-lg hover:shadow-crimson-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6"
        >
          {registerMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Workspace'}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-slate-400">
        Already have an account? <Link to="/login" className="text-crimson-400 hover:text-crimson-300 font-medium">Sign in</Link>
      </div>
    </div>
  );
}
