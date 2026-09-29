// app/login/page.tsx — replace the whole file
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary so the rest of the page can
  // still be prerendered instead of the whole route becoming client-only.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const oauthError = searchParams.get("error");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // Browser navigates away to Google here — nothing more to do client-side.
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-3xl font-medium">Alfred</h1>
        <p className="mb-8 text-ink-soft">Sign in, sir.</p>

        {oauthError === "unauthorized" && (
          <p className="mb-4 rounded-md border border-rust bg-rust-soft px-3 py-2 text-sm text-rust">
            That Google account isn&apos;t authorized for this app.
          </p>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-md border border-line bg-surface px-4 py-2 text-sm text-ink transition-colors hover:bg-paper"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="mb-6 flex items-center gap-3 text-xs text-ink-soft">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-ink-soft">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-moss"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm text-ink-soft"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-moss"
            />
          </div>

          {error && <p className="text-sm text-rust">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-ink px-4 py-2 text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.4 0 6.4 1.2 8.8 3.5l6.6-6.6C35.3 2.6 30 0.5 24 0.5 14.6 0.5 6.5 5.9 2.6 13.7l7.7 6C12.1 13.6 17.5 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.2-3.9 6.7-9.7 6.7-17.4z"
      />
      <path
        fill="#FBBC05"
        d="M10.3 19.7c-.5 1.4-.8 2.9-.8 4.5s.3 3.1.8 4.5l-7.7 6C1 31.6 0.5 28.4 0.5 25.2s.5-6.4 1.7-9.5z"
        transform="translate(0 -0.7)"
      />
      <path
        fill="#34A853"
        d="M24 47.5c6 0 11-2 14.7-5.4l-7.3-5.7c-2 1.4-4.6 2.2-7.4 2.2-6.5 0-11.9-4.1-13.7-9.7l-7.7 6C6.5 42.1 14.6 47.5 24 47.5z"
      />
    </svg>
  );
}