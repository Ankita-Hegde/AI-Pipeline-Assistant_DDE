"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const DEMO_USERS = [
  {
    name: "Sarah Admin",
    email: "admin@company.com",
    role: "admin",
    description: "Full access: Create, Deploy, Execute, and View",
  },
  {
    name: "John Engineer",
    email: "engineer@company.com",
    role: "engineer",
    description: "Can: Create, Deploy, Execute, and View",
  },
  {
    name: "Mike Operator",
    email: "operator@company.com",
    role: "operator",
    description: "Can: Execute and View pipelines",
  },
  {
    name: "Lisa Viewer",
    email: "viewer@company.com",
    role: "viewer",
    description: "Can: View pipelines only",
  },
];

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function login(user: { email: string; name: string; role: string }) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "ai-pipeline-user",
        JSON.stringify(user)
      );
    }
    router.push("/dashboard");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = DEMO_USERS.find((u) => u.email === email.trim());
    if (found) {
      login(found);
    } else {
      alert("Use one of the demo emails below to sign in.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/80 p-10 shadow-xl backdrop-blur">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-50">
            AI Pipeline Assistant
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Sign in to manage your data pipelines
          </p>
        </div>

        <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-medium text-slate-50">Sign In</h2>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-600/40"
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-600/40"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="mt-2 w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400"
            >
              Sign In
            </button>
          </form>

          <div>
            <h2 className="text-lg font-medium text-slate-50">Demo Accounts</h2>
            <p className="mt-1 text-sm text-slate-400">
              Click any account to quick login and explore role-based
              permissions.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.email}
                  type="button"
                  onClick={() => login(user)}
                  className="flex flex-col items-start rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-left text-sm hover:border-sky-500/70 hover:bg-slate-900/80"
                >
                  <div className="font-medium text-slate-50">{user.name}</div>
                  <div className="text-xs text-slate-400">{user.email}</div>
                  <div className="mt-1 inline-flex items-center rounded-full bg-slate-700 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-100">
                    {user.role}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {user.description}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-lg bg-slate-800 p-3 text-xs text-slate-200">
              <div className="font-semibold mb-1">Role Permissions</div>
              <ul className="space-y-1">
                <li>• Admin & Engineer: Create + Deploy + Execute + View</li>
                <li>• Operator: Execute + View pipelines</li>
                <li>• Viewer: View pipelines only</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
