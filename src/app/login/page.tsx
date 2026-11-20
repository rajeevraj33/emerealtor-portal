import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";
import { SearchParams, str } from "@/lib/search";

export const metadata: Metadata = { title: "Log In" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const p = await searchParams;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <AuthForm mode="login" next={str(p, "next") ?? "/account"} />
    </div>
  );
}
