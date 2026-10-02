'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import {
  Layers,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Crown,
  Briefcase,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { request } from './ui';
const demoRoles = [
  { role: 'admin', label: 'Admin', detail: 'Full access, team and billing', icon: Crown },
  { role: 'manager', label: 'Manager', detail: 'Clients, projects and tickets', icon: Briefcase },
  { role: 'sales', label: 'Sales', detail: 'Clients and sales pipeline', icon: TrendingUp },
  { role: 'employee', label: 'Employee', detail: 'Assigned tasks and tickets', icon: UserRound },
];
export function AuthScreen({ mode, demo = false }: { mode: string; demo?: boolean }) {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [demoBusy, setDemoBusy] = useState('');
  const token = params.get('token') || '';
  const config: Record<string, { title: string; description: string; button: string }> = {
    login: {
      title: 'Welcome to your workspace.',
      description: 'Sign in to keep your people, projects, and clients connected.',
      button: 'Sign in',
    },
    register: {
      title: 'Your team is waiting.',
      description: 'Accept your invitation and make yourself at home.',
      button: 'Create your account',
    },
    'forgot-password': {
      title: 'Let’s get you back in.',
      description: 'Enter your work email and we’ll send you a password reset link.',
      button: 'Send reset link',
    },
    'reset-password': {
      title: 'A fresh start.',
      description:
        'Choose a password with at least 12 characters, a number, and uppercase and lowercase letters.',
      button: 'Reset password',
    },
    'verify-email': {
      title: 'Confirm your email.',
      description: 'Verify your email address to finish setting up your account.',
      button: 'Verify email',
    },
    'session-expired': {
      title: 'Your session has expired.',
      description: 'Sign in again to continue where you left off.',
      button: 'Back to sign in',
    },
  };
  const c = config[mode] || config.login;
  async function demoSignIn(role: string) {
    setError('');
    setDemoBusy(role);
    const result = await signIn('demo', { role, redirect: false });
    if (result?.error) {
      setError('The demo is unavailable right now. Please try again shortly.');
      setDemoBusy('');
    } else window.location.assign('/dashboard');
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const result = await signIn('credentials', { email, password, redirect: false });
        if (result?.error)
          throw new Error(
            result.error === 'CredentialsSignin'
              ? 'Your email or password is incorrect, or your account is not verified.'
              : result.error,
          );
        window.location.assign('/dashboard');
      } else if (mode === 'session-expired') window.location.assign('/login');
      else {
        const data = await request('/api/account', {
          action:
            mode === 'forgot-password'
              ? 'forgot'
              : mode === 'reset-password'
                ? 'reset'
                : mode === 'verify-email'
                  ? 'verify'
                  : 'register',
          ...(mode === 'forgot-password' ? { email } : { token }),
          ...(['reset-password', 'register'].includes(mode) ? { password } : {}),
          ...(mode === 'register' ? { name } : {}),
        });
        setSuccess(data.message);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <aside className="auth-art">
        <Link href="/login" className="brand">
          <span className="brand-mark">
            <Layers size={22} />
          </span>
          relay<sup>®</sup>
        </Link>
        <div>
          <p className="eyebrow" style={{ color: '#97b8a5', marginBottom: 17 }}>
            ONE TEAM. ONE CONNECTED WORKSPACE.
          </p>
          <h1>
            Good work happens
            <br />
            when it all
            <br />
            comes together.
          </h1>
          <p>
            Less switching. More doing. Bring your clients, people, and everyday operations into
            focus.
          </p>
          <div className="auth-illustration" aria-hidden="true">
            <div className="between">
              <span style={{ fontSize: 12 }}>Your team, in sync.</span>
              <CheckCircle2 size={17} color="#a5c7ae" />
            </div>
            <div className="bar" style={{ width: '75%', marginTop: 25 }} />
            <div className="bar" style={{ width: '55%' }} />
            <div className="bar" style={{ width: '90%', background: '#9bb8a1' }} />
            <div className="between" style={{ marginTop: 25, fontSize: 10, color: '#bbcebf' }}>
              <span>People. Projects. Possibilities.</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: '#8da897' }}>Built for the way great teams work.</div>
      </aside>
      <main className="auth-main" id="main-content">
        <div className="auth-form">
          <div className="eyebrow" style={{ marginBottom: 15 }}>
            YOUR OPERATIONS, CONNECTED
          </div>
          <h1>{c.title}</h1>
          <p>{c.description}</p>
          {error && (
            <div className="alert" role="alert" style={{ marginBottom: 18 }}>
              {error}
            </div>
          )}
          {success ? (
            <div>
              <div className="alert success" role="status">
                {success}
              </div>
              <Link className="btn primary" href="/login" style={{ marginTop: 20 }}>
                Back to sign in <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              {mode === 'register' && (
                <div className="field">
                  <label htmlFor="name">Full name</label>
                  <input
                    id="name"
                    className="input"
                    required
                    minLength={2}
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              )}
              {['login', 'forgot-password'].includes(mode) && (
                <div className="field">
                  <label htmlFor="email">Work email</label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              )}
              {['login', 'register', 'reset-password'].includes(mode) && (
                <div className="field">
                  <div className="between">
                    <label htmlFor="password">Password</label>
                    {mode === 'login' && (
                      <Link className="text-link" style={{ fontSize: 10 }} href="/forgot-password">
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="password"
                      type={show ? 'text' : 'password'}
                      className="input"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      required
                      minLength={mode === 'login' ? 1 : 12}
                      maxLength={72}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingRight: 42 }}
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      style={{ position: 'absolute', right: 3, top: 3 }}
                      onClick={() => setShow(!show)}
                      aria-label={show ? 'Hide password' : 'Show password'}
                    >
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}
              {['register', 'reset-password', 'verify-email'].includes(mode) && !token && (
                <div className="alert">
                  Open the link from your email to continue. Registration requires an
                  administrator’s invitation.
                </div>
              )}
              <button
                className="btn primary"
                disabled={
                  busy || (['register', 'reset-password', 'verify-email'].includes(mode) && !token)
                }
                style={{ marginTop: 5, padding: 12 }}
              >
                {busy ? 'Please wait…' : c.button}
                <ArrowRight size={15} />
              </button>
              {mode !== 'login' && (
                <Link className="text-link" style={{ textAlign: 'center' }} href="/login">
                  Back to sign in
                </Link>
              )}
            </form>
          )}
          {mode === 'login' && demo && (
            <section className="demo-panel" aria-labelledby="demo-heading">
              <div className="demo-divider">
                <span id="demo-heading">or explore the live demo as</span>
              </div>
              <div className="demo-grid">
                {demoRoles.map(({ role, label, detail, icon: Icon }) => (
                  <button
                    key={role}
                    type="button"
                    className="demo-role"
                    onClick={() => demoSignIn(role)}
                    disabled={!!demoBusy}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>
                      <strong>{demoBusy === role ? 'Signing in…' : label}</strong>
                      <small>{detail}</small>
                    </span>
                  </button>
                ))}
              </div>
              <p className="tiny muted">
                Fictional demo data, shared with other visitors. Account settings are read-only.
              </p>
            </section>
          )}
          <div className="auth-foot">
            <Link href="/policies/privacy">Privacy policy</Link>
            <Link href="/policies/terms">Terms of service</Link>
            <Link href="/policies/security">Security</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
