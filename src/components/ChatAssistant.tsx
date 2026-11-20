"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPriceShort } from "@/lib/format";

type Area = { name: string; slug: string };
type City = { name: string; slug: string; areas: Area[] };
type Msg = { from: "bot" | "user"; text: string };
type Opt = { label: string; value: string };
type Step = "name" | "mode" | "city" | "area" | "beds" | "price" | "contact" | "done";

const BEDS: Opt[] = [{ label: "Any", value: "0" }, { label: "1+", value: "1" }, { label: "2+", value: "2" }, { label: "3+", value: "3" }, { label: "4+", value: "4" }];
const SALE_PRICES = [600000, 800000, 1000000, 1300000, 1600000, 2000000];
const RENT_PRICES = [2000, 2500, 3000, 3500, 4500];

export default function ChatAssistant() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("name");
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: "Hi there! 👋 I'm the Hunt property assistant. I can help you find a home in seconds. First — what's your name?" }]);
  const [cities, setCities] = useState<City[]>([]);
  const [input, setInput] = useState("");
  const [a, setA] = useState<{ name: string; mode: "Sale" | "Rent"; city?: City; area?: Area; beds: string; maxPrice: number }>({ name: "", mode: "Sale", beds: "0", maxPrice: 0 });
  const [count, setCount] = useState<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetch("/api/cities").then((r) => r.json()).then(setCities).catch(() => {}); }, []);
  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, step]);

  const say = (from: "bot" | "user", text: string) => setMsgs((m) => [...m, { from, text }]);

  const searchUrl = (x = a) => {
    const p = new URLSearchParams();
    p.set("mode", x.mode);
    if (x.area) p.set("neighbourhood", x.area.slug);
    else if (x.city) p.set("city", x.city.slug);
    if (Number(x.beds)) p.set("beds", x.beds);
    if (x.maxPrice) p.set("maxPrice", String(x.maxPrice));
    return `/search?${p.toString()}`;
  };

  // advance the flow
  const pickName = (name: string) => {
    if (!name.trim()) return;
    say("user", name);
    setA((s) => ({ ...s, name: name.trim() }));
    setInput("");
    say("bot", `Great to meet you, ${name.trim()}! Are you looking to buy or rent?`);
    setStep("mode");
  };
  const pickMode = (mode: "Sale" | "Rent") => {
    say("user", mode === "Sale" ? "Buy" : "Rent");
    setA((s) => ({ ...s, mode }));
    say("bot", "Which city are you interested in?");
    setStep("city");
  };
  const pickCity = (city: City) => {
    say("user", city.name);
    setA((s) => ({ ...s, city, area: undefined }));
    say("bot", `Any specific area in ${city.name}? Pick one, or choose “Any area”.`);
    setStep("area");
  };
  const pickArea = (area?: Area) => {
    say("user", area ? area.name : "Any area");
    setA((s) => ({ ...s, area }));
    say("bot", "How many bedrooms do you need?");
    setStep("beds");
  };
  const pickBeds = (beds: string, label: string) => {
    say("user", `${label} bed`);
    setA((s) => ({ ...s, beds }));
    say("bot", `What's your max budget (${a.mode === "Rent" ? "per month" : ""})?`);
    setStep("price");
  };
  const pickPrice = async (maxPrice: number, label: string) => {
    say("user", label);
    const next = { ...a, maxPrice };
    setA(next);
    say("bot", "One sec — finding your matches… 🔎");
    const url = searchUrl(next);
    try {
      const r = await fetch(`/api/count?${url.split("?")[1]}`);
      const { count: c } = await r.json();
      setCount(c);
      say("bot", `I found ${c} ${next.mode === "Rent" ? "rental" : "home"}${c === 1 ? "" : "s"} matching your search${next.area ? ` in ${next.area.name}` : next.city ? ` in ${next.city.name}` : ""}. Tap below to view them — and leave your email if you'd like listing alerts.`);
    } catch {
      say("bot", `Here are your matches — tap below to view them.`);
    }
    setStep("contact");
  };
  const submitContact = async (email: string, phone: string) => {
    if (email) say("user", email);
    const crit = `Looking to ${a.mode === "Rent" ? "rent" : "buy"}${a.area ? ` in ${a.area.name}` : a.city ? ` in ${a.city.name}` : ""}${Number(a.beds) ? `, ${a.beds}+ beds` : ""}${a.maxPrice ? `, up to ${formatPriceShort(a.maxPrice)}` : ""}.`;
    try {
      await fetch("/api/leads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: a.mode === "Rent" ? "renter" : "buyer", name: a.name, email: email || `${a.name.replace(/\s+/g, ".").toLowerCase()}@chat.lead`, phone, message: `[Chat assistant] ${crit}`, sourcePage: "chatbot" }),
      });
    } catch { /* ignore */ }
    say("bot", `Thanks, ${a.name}! ${email ? "An agent will reach out shortly. " : ""}Happy house hunting! 🏡`);
    setStep("done");
  };

  const reset = () => {
    setStep("name"); setA({ name: "", mode: "Sale", beds: "0", maxPrice: 0 }); setCount(null);
    setMsgs([{ from: "bot", text: "Let's start over — what's your name?" }]);
  };

  return (
    <>
      {/* Launcher */}
      <button onClick={() => setOpen((o) => !o)} aria-label="Open chat assistant"
        className="fixed bottom-5 right-5 z-[1000] grid place-items-center w-14 h-14 rounded-full bg-accent hover:bg-accent-600 text-white shadow-lg text-2xl">
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-[1000] w-[360px] max-w-[calc(100vw-2.5rem)] rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 flex flex-col overflow-hidden">
          <div className="bg-brand text-[var(--brand-fg)] px-4 py-3">
            <div className="font-semibold">Hunt property Assistant</div>
            <div className="text-xs text-[var(--brand-fg-soft)]">Find your home in a few taps</div>
          </div>

          <div ref={bodyRef} className="flex-1 max-h-[60vh] min-h-[260px] overflow-y-auto p-3 space-y-2 bg-gray-50">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.from === "user" ? "bg-accent text-white rounded-br-sm" : "bg-white ring-1 ring-black/5 text-gray-800 rounded-bl-sm"}`}>{m.text}</div>
              </div>
            ))}

            {/* Quick-reply options */}
            <div className="flex flex-wrap gap-2 pt-1">
              {step === "mode" && (<>
                <Chip onClick={() => pickMode("Sale")}>🏠 Buy</Chip>
                <Chip onClick={() => pickMode("Rent")}>🔑 Rent</Chip>
              </>)}
              {step === "city" && cities.map((c) => <Chip key={c.slug} onClick={() => pickCity(c)}>{c.name}</Chip>)}
              {step === "area" && (<>
                <Chip onClick={() => pickArea(undefined)}>Any area</Chip>
                {a.city?.areas.slice(0, 10).map((ar) => <Chip key={ar.slug} onClick={() => pickArea(ar)}>{ar.name}</Chip>)}
              </>)}
              {step === "beds" && BEDS.map((b) => <Chip key={b.value} onClick={() => pickBeds(b.value, b.label)}>{b.label}</Chip>)}
              {step === "price" && (<>
                {(a.mode === "Rent" ? RENT_PRICES : SALE_PRICES).map((p) => <Chip key={p} onClick={() => pickPrice(p, formatPriceShort(p) + (a.mode === "Rent" ? "/mo" : ""))}>{formatPriceShort(p)}{a.mode === "Rent" ? "/mo" : ""}</Chip>)}
                <Chip onClick={() => pickPrice(0, "No max")}>No max</Chip>
              </>)}
            </div>

            {/* Results CTA */}
            {(step === "contact" || step === "done") && (
              <button onClick={() => { setOpen(false); router.push(searchUrl()); }}
                className="w-full mt-1 rounded-lg bg-brand hover:bg-brand-700 text-white text-sm font-medium py-2.5">
                View {count ?? "matching"} listing{count === 1 ? "" : "s"} →
              </button>
            )}
            {step === "done" && <button onClick={reset} className="w-full text-xs text-gray-500 hover:text-gray-800 pt-1">Start a new search</button>}
          </div>

          {/* Text input for name / contact */}
          {(step === "name" || step === "contact") && (
            <ContactBar step={step} onName={pickName} onContact={submitContact} input={input} setInput={setInput} />
          )}
        </div>
      )}
    </>
  );
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 hover:border-brand hover:bg-brand-50">{children}</button>;
}

function ContactBar({ step, onName, onContact, input, setInput }: { step: Step; onName: (s: string) => void; onContact: (e: string, p: string) => void; input: string; setInput: (s: string) => void }) {
  const [phone, setPhone] = useState("");
  if (step === "name") {
    return (
      <form onSubmit={(e) => { e.preventDefault(); onName(input); }} className="flex gap-2 p-3 border-t border-gray-100">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Your name" autoFocus
          className="flex-1 rounded-full border border-gray-300 px-3 py-2 text-sm" style={{ outline: "none" }} />
        <button className="rounded-full bg-accent text-white px-4 text-sm font-medium">Send</button>
      </form>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); onContact(input, phone); }} className="p-3 border-t border-gray-100 space-y-2">
      <input value={input} onChange={(e) => setInput(e.target.value)} type="email" placeholder="Email for alerts (optional)"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" style={{ outline: "none" }} />
      <div className="flex gap-2">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" style={{ outline: "none" }} />
        <button className="rounded-md bg-accent text-white px-4 text-sm font-medium">{input ? "Send" : "Skip"}</button>
      </div>
    </form>
  );
}
