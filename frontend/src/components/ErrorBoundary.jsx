import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#02060E' }}>
          <div className="text-center p-8 max-w-md">
            <AlertTriangle style={{ width: 48, height: 48, color: '#C50337', margin: '0 auto 16px' }} />
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/dashboard'; }}
              style={{ background: '#C50337', color: '#fff', padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
