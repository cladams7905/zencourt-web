# Design Document

## Overview

This design specifies the implementation of a user authentication system for Zencourt using Neon PostgreSQL's serverless database with Next.js API routes. The system provides email/password and Google OAuth authentication, session management, and user profile handling—all running serverless without a separate backend.

### Key Components
1. **Neon PostgreSQL Database** - Cloud-hosted database with users and sessions tables
2. **Next.js API Routes** - Serverless authentication endpoints
3. **Authentication Portal** - Sign in/sign up UI at /auth route
4. **Session Management** - HTTP-only cookies with database-backed sessions
5. **Google OAuth Integration** - Third-party authentication flow
6. **Protected Route Middleware** - Session validation for pages and API routes
7. **User Context Provider** - React context for authenticated user data

### Technical Approach
- **Serverless-first** architecture using Neon's serverless driver
- **Session-based authentication** with secure HTTP-only cookies
- **Next.js App Router** with server components and API routes
- **No separate backend** - all logic in Next.js API routes
- **Google OAuth 2.0** for social authentication

## Architecture

### System Context

```mermaid
graph TB
    User[User Browser] --> NextJS[Next.js App]
    NextJS --> API[API Routes]
    API --> Neon[Neon PostgreSQL]
    API --> Google[Google OAuth]

    subgraph "Next.js Application"
        NextJS
        API
    end

    subgraph "External Services"
        Neon
        Google
    end
```

### Component Architecture

```mermaid
graph TD
    Browser[Browser] --> AuthPortal[Auth Portal /auth]
    Browser --> Dashboard[Dashboard /]

    AuthPortal --> RegisterAPI[POST /api/auth/register]
    AuthPortal --> LoginAPI[POST /api/auth/login]
    AuthPortal --> GoogleAPI[GET /api/auth/google]

    Dashboard --> SessionCheck[Session Validation]

    RegisterAPI --> DB[(Neon DB)]
    LoginAPI --> DB
    GoogleAPI --> GoogleOAuth[Google OAuth]
    GoogleAPI --> DB

    SessionCheck --> DB

    LogoutBtn[Logout Button] --> LogoutAPI[POST /api/auth/logout]
    LogoutAPI --> DB
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant AuthPortal
    participant API
    participant Neon
    participant Google

    User->>AuthPortal: Visit /auth
    AuthPortal->>User: Show sign in/up form

    alt Email/Password Flow
        User->>API: POST /api/auth/register (email, password)
        API->>Neon: Check if email exists
        Neon-->>API: Email unique
        API->>API: Hash password (bcrypt)
        API->>Neon: INSERT user
        API->>Neon: INSERT session
        API-->>User: Set cookie & redirect to /
    end

    alt Google OAuth Flow
        User->>API: GET /api/auth/google
        API->>Google: Redirect to consent
        Google->>User: Show consent screen
        User->>Google: Authorize
        Google->>API: Callback with code
        API->>Google: Exchange code for profile
        Google-->>API: User profile data
        API->>Neon: Find or create user
        API->>Neon: INSERT session
        API-->>User: Set cookie & redirect to /
    end
```

## Components and Interfaces

### 1. Database Schema

**File:** `migrations/001_initial_schema.sql`

**Users Table:**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
```

**Sessions Table:**
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

**Trigger for updated_at:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Neon Database Client

**File:** `src/lib/db.ts`

**Purpose:** Initialize and export Neon serverless database client.

```typescript
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const sql = neon(process.env.DATABASE_URL);

// Type definitions
export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  name: string;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: Date;
  created_at: Date;
}

export interface UserWithoutPassword {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}
```

### 3. Authentication Utilities

**File:** `src/lib/auth.ts`

**Purpose:** Shared authentication helper functions.

```typescript
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// Password validation
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Compare password
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate session token
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

// Calculate session expiration (7 days)
export function getSessionExpiration(): Date {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + 7);
  return expiration;
}

// Normalize email (lowercase)
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
```

### 4. Session Management Utilities

**File:** `src/lib/session.ts`

**Purpose:** Create, validate, and delete sessions.

```typescript
import { cookies } from 'next/headers';
import { sql, User, UserWithoutPassword } from './db';
import { generateSessionToken, getSessionExpiration } from './auth';

const SESSION_COOKIE_NAME = 'session_token';

export async function createSession(userId: string): Promise<string> {
  const sessionToken = generateSessionToken();
  const expiresAt = getSessionExpiration();

  await sql`
    INSERT INTO sessions (user_id, session_token, expires_at)
    VALUES (${userId}, ${sessionToken}, ${expiresAt})
  `;

  return sessionToken;
}

export async function setSessionCookie(sessionToken: string): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = getSessionExpiration();

  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expiresAt,
    path: '/',
  });
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  return cookie?.value || null;
}

export async function validateSession(
  sessionToken: string
): Promise<UserWithoutPassword | null> {
  const result = await sql`
    SELECT u.id, u.email, u.name, u.avatar_url
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.session_token = ${sessionToken}
      AND s.expires_at > NOW()
    LIMIT 1
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0] as UserWithoutPassword;
}

export async function deleteSession(sessionToken: string): Promise<void> {
  await sql`
    DELETE FROM sessions
    WHERE session_token = ${sessionToken}
  `;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<UserWithoutPassword | null> {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return null;
  return validateSession(sessionToken);
}
```

### 5. Registration API Route

**File:** `src/app/api/auth/register/route.ts`

**Purpose:** Handle user registration with email/password.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  validateEmail,
  validatePassword,
  hashPassword,
  normalizeEmail,
} from '@/lib/auth';
import { createSession, setSessionCookie } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);

    if (!validateEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = await sql`
      INSERT INTO users (email, password_hash, name)
      VALUES (${normalizedEmail}, ${passwordHash}, ${name})
      RETURNING id, email, name, avatar_url
    `;

    const user = newUser[0];

    // Create session
    const sessionToken = await createSession(user.id);
    await setSessionCookie(sessionToken);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 6. Login API Route

**File:** `src/app/api/auth/login/route.ts`

**Purpose:** Handle user login with email/password.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { comparePassword, normalizeEmail } from '@/lib/auth';
import { createSession, setSessionCookie } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);

    // Find user
    const userResult = await sql`
      SELECT id, email, password_hash, name, avatar_url
      FROM users
      WHERE email = ${normalizedEmail}
      LIMIT 1
    `;

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = userResult[0];

    // Check if user has password (not Google-only account)
    if (!user.password_hash) {
      return NextResponse.json(
        { error: 'Please sign in with Google' },
        { status: 401 }
      );
    }

    // Compare password
    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session
    const sessionToken = await createSession(user.id);
    await setSessionCookie(sessionToken);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 7. Google OAuth Routes

**File:** `src/app/api/auth/google/route.ts`

**Purpose:** Initiate Google OAuth flow.

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  googleAuthUrl.searchParams.set('redirect_uri', process.env.GOOGLE_REDIRECT_URI!);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'email profile');
  googleAuthUrl.searchParams.set('state', callbackUrl);

  return NextResponse.redirect(googleAuthUrl.toString());
}
```

**File:** `src/app/api/auth/google/callback/route.ts`

**Purpose:** Handle Google OAuth callback.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { normalizeEmail } from '@/lib/auth';
import { createSession, setSessionCookie } from '@/lib/session';

interface GoogleUserInfo {
  sub: string; // Google user ID
  email: string;
  name: string;
  picture: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state') || '/';

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth?error=oauth_failed`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const googleUser: GoogleUserInfo = await userInfoResponse.json();

    const normalizedEmail = normalizeEmail(googleUser.email);

    // Check if user exists by google_id
    let userResult = await sql`
      SELECT id, email, name, avatar_url
      FROM users
      WHERE google_id = ${googleUser.sub}
      LIMIT 1
    `;

    let user;

    if (userResult.length === 0) {
      // Check if email exists (link accounts)
      const emailUser = await sql`
        SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1
      `;

      if (emailUser.length > 0) {
        // Link Google account to existing user
        user = await sql`
          UPDATE users
          SET google_id = ${googleUser.sub}, avatar_url = ${googleUser.picture}
          WHERE email = ${normalizedEmail}
          RETURNING id, email, name, avatar_url
        `;
        user = user[0];
      } else {
        // Create new user
        const newUser = await sql`
          INSERT INTO users (email, google_id, name, avatar_url)
          VALUES (${normalizedEmail}, ${googleUser.sub}, ${googleUser.name}, ${googleUser.picture})
          RETURNING id, email, name, avatar_url
        `;
        user = newUser[0];
      }
    } else {
      user = userResult[0];
    }

    // Create session
    const sessionToken = await createSession(user.id);
    await setSessionCookie(sessionToken);

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}${state}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth?error=oauth_failed`);
  }
}
```

### 8. Logout API Route

**File:** `src/app/api/auth/logout/route.ts`

**Purpose:** Handle user logout.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken, deleteSession, clearSessionCookie } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = await getSessionToken();

    if (sessionToken) {
      await deleteSession(sessionToken);
    }

    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 9. Current User API Route

**File:** `src/app/api/auth/me/route.ts`

**Purpose:** Get current authenticated user data.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 10. Authentication Portal Page

**File:** `src/app/auth/page.tsx`

**Purpose:** Sign in/sign up UI.

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AuthPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          password: registerData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e8ddd3] via-white to-[#d4c4b0] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl mb-2">zencourt</h1>
          <p className="text-muted-foreground">
            AI-powered property video creation
          </p>
        </div>

        <div className="bg-white rounded-xl border border-border p-6 shadow-lg">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginData.email}
                    onChange={(e) =>
                      setLoginData({ ...loginData, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    required
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="register-name">Name</Label>
                  <Input
                    id="register-name"
                    type="text"
                    value={registerData.name}
                    onChange={(e) =>
                      setRegisterData({ ...registerData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={registerData.email}
                    onChange={(e) =>
                      setRegisterData({ ...registerData, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={registerData.password}
                    onChange={(e) =>
                      setRegisterData({ ...registerData, password: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="register-confirm">Confirm Password</Label>
                  <Input
                    id="register-confirm"
                    type="password"
                    value={registerData.confirmPassword}
                    onChange={(e) =>
                      setRegisterData({
                        ...registerData,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 11. Protected Route Middleware

**File:** `src/middleware.ts`

**Purpose:** Redirect unauthenticated users to /auth.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from './lib/db';

const SESSION_COOKIE_NAME = 'session_token';

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  const isAuthPage = request.nextUrl.pathname.startsWith('/auth');
  const isApiAuth = request.nextUrl.pathname.startsWith('/api/auth');

  // Allow auth pages and API routes without checking session
  if (isAuthPage || isApiAuth) {
    // If already authenticated and trying to access /auth, redirect to home
    if (isAuthPage && sessionToken) {
      const isValid = await validateSessionToken(sessionToken);
      if (isValid) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
    return NextResponse.next();
  }

  // Check session for protected routes
  if (!sessionToken) {
    const redirectUrl = new URL('/auth', request.url);
    redirectUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const isValid = await validateSessionToken(sessionToken);

  if (!isValid) {
    // Clear invalid session cookie
    const response = NextResponse.redirect(new URL('/auth', request.url));
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

async function validateSessionToken(token: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT id FROM sessions
      WHERE session_token = ${token}
        AND expires_at > NOW()
      LIMIT 1
    `;
    return result.length > 0;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 12. User Context Provider

**File:** `src/contexts/UserContext.tsx`

**Purpose:** Provide authenticated user data throughout the app.

```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <UserContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
```

### 13. Updated Root Layout

**File:** `src/app/layout.tsx` (modified)

**Purpose:** Wrap app with UserProvider.

```typescript
import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/contexts/UserContext";

export const metadata: Metadata = {
  title: "ZenCourt - AI Property Videos",
  description: "AI-powered property video creation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
```

### 14. Updated Sidebar with User Profile

**File:** `src/components/Sidebar.tsx` (modified)

**Purpose:** Display user avatar and logout button.

```typescript
import { Home, LogOut } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { user, logout } = useUser();

  const navItems = [
    { id: "projects", label: "Projects", icon: Home }
  ];

  const getUserInitials = () => {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 h-screen bg-white border-r border-border flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl tracking-tight">zencourt</h1>
        </div>

        <nav className="flex-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  activeTab === item.id
                    ? "bg-black text-white"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <Avatar>
              <AvatarImage src={user?.avatar_url || undefined} />
              <AvatarFallback>{getUserInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={logout}
          >
            <LogOut size={16} className="mr-2" />
            Log out
          </Button>
        </div>
      </div>

      {/* Mobile Bottom Navigation - similar updates */}
    </>
  );
}
```

## Data Models

### Type Definitions

**File:** `src/types/auth.ts`

```typescript
export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  name: string;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: Date;
  created_at: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: PublicUser;
}

export interface ErrorResponse {
  error: string;
}
```

## Error Handling

### Error Response Format

All API routes return consistent error responses:

```typescript
{
  "error": "Human-readable error message"
}
```

### Error Types

1. **400 Bad Request** - Invalid input, validation errors
2. **401 Unauthorized** - Invalid credentials, expired session
3. **403 Forbidden** - Insufficient permissions
4. **500 Internal Server Error** - Database errors, unexpected failures

### Client-Side Error Handling

```typescript
try {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  const data = await res.json();

  if (!res.ok) {
    // Display error to user
    setError(data.error || 'An error occurred');
    return;
  }

  // Success handling
} catch (err) {
  setError('Network error. Please try again.');
}
```

## Security Considerations

### Password Security
- Bcrypt with 12 salt rounds
- Password requirements enforced (8+ chars, mixed case, numbers)
- Never log or expose passwords

### Session Security
- HTTP-only cookies (not accessible via JavaScript)
- Secure flag in production (HTTPS only)
- SameSite=strict to prevent CSRF
- 7-day expiration with database validation

### SQL Injection Prevention
- All queries use Neon's parameterized queries
- Never concatenate user input into SQL strings

### Rate Limiting
- Implement using Vercel's rate limiting or Upstash Redis
- Limit login attempts: 5 per email per 15 minutes
- Limit registration: 3 per IP per hour

### Environment Variables
- Never commit secrets to git (.gitignore)
- Use Vercel environment variables in production
- Validate required variables at startup

## Testing Strategy

### Unit Tests

1. **Authentication Utilities**
   - Test password validation rules
   - Test email validation
   - Test bcrypt hashing and comparison

2. **Session Management**
   - Test session creation
   - Test session validation
   - Test session expiration

### Integration Tests

1. **Registration Flow**
   - Test successful registration
   - Test duplicate email detection
   - Test password validation

2. **Login Flow**
   - Test successful login
   - Test invalid credentials
   - Test session creation

3. **Google OAuth**
   - Mock Google OAuth responses
   - Test user creation
   - Test account linking

### E2E Tests

1. **Complete Authentication Flow**
   - Register new account
   - Log out
   - Log in with credentials
   - Log in with Google
   - Access protected routes
   - Verify session persistence

## Performance Considerations

### Database Queries
- Index on email, google_id, session_token
- LIMIT 1 on unique queries
- Efficient JOIN for session validation

### Serverless Optimization
- Minimize cold start time (small bundle size)
- Connection pooling handled by Neon serverless driver
- Cache session validation results (optional)

### Cookie Size
- Session token only (no large data in cookies)
- User data fetched from database

## Deployment

### Environment Variables

```bash
# Neon Database
DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback

# App Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_SECRET=random-secure-string-min-32-chars
```

### Vercel Deployment

1. Connect GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Database Migrations

```bash
# Run SQL migrations in Neon SQL Editor or via CLI
psql $DATABASE_URL -f migrations/001_initial_schema.sql
```

## Future Enhancements

1. **Password Reset via Email**
   - Email service integration (Resend, SendGrid)
   - Reset token generation and validation
   - Secure password update flow

2. **Email Verification**
   - Send verification email on registration
   - Verify email before full account access

3. **Two-Factor Authentication (2FA)**
   - TOTP-based 2FA
   - Backup codes

4. **Social Auth Expansion**
   - GitHub OAuth
   - Microsoft OAuth
   - Apple Sign In

5. **Session Management Dashboard**
   - View active sessions
   - Revoke sessions remotely

6. **Account Linking**
   - Link multiple OAuth providers to one account
   - Unlink providers

7. **Audit Logging**
   - Log all authentication events
   - Track login history
