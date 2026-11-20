import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";
import { SearchParams, str } from "@/lib/search";

export const metadata: Metadata = { title: "Sign Up" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const p = await searchParams;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <AuthForm mode="signup" next={str(p, "next") ?? "/account"} />
    </div>
  );
}
