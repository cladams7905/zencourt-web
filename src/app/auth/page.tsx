"use client";

import { SignIn } from "@stackframe/stack";

export default function AuthPage() {
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
          <SignIn />
        </div>
      </div>
    </div>
  );
}
