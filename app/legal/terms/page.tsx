import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-white/6 bg-white/3 p-8 shadow-xl backdrop-blur">
          <h1 className="text-2xl font-bold">Terms of Service</h1>
          <p className="mt-3 text-sm text-white/70">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mt-6 space-y-4 text-sm text-white/80">
            <p>
              These Terms govern your use of the GeniusGrid service. This template is a starting point — please
              have legal counsel review for production use.
            </p>

            <div>
              <h3 className="font-semibold">Accepting the terms</h3>
              <p className="mt-1">By using the service you agree to these terms.</p>
            </div>

            <div>
              <h3 className="font-semibold">Accounts</h3>
              <p className="mt-1">You are responsible for your account and content you upload.</p>
            </div>

            <div>
              <h3 className="font-semibold">Limitation of liability</h3>
              <p className="mt-1">Our liability is limited as permitted by law.</p>
            </div>
          </section>

          <div className="mt-6 flex justify-between text-xs text-white/60">
            <Link href="/legal/privacy" className="underline">Privacy</Link>
            <Link href="/" className="underline">Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
