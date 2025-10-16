import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-white/6 bg-white/3 p-8 shadow-xl backdrop-blur">
          <h1 className="text-2xl font-bold">Privacy Policy</h1>
          <p className="mt-3 text-sm text-white/70">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mt-6 space-y-4 text-sm text-white/80">
            <p>
              At GeniusGrid, we respect your privacy. This policy explains what information we collect,
              how we use it, and your rights. This is a short template — update it with legal review for production.
            </p>

            <div>
              <h3 className="font-semibold">Information we collect</h3>
              <p className="mt-1">
                We may collect account info (name, email), usage data, and logs necessary to operate the service.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">How we use data</h3>
              <p className="mt-1">
                To provide and improve services, communicate with you, and for security and fraud prevention.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">Third parties</h3>
              <p className="mt-1">
                We may share data with service providers who help run the product (hosting, analytics). We don’t sell personal data.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">Contact</h3>
              <p className="mt-1">
                For privacy questions, email <a href="mailto:privacy@yourdomain.com" className="underline">privacy@yourdomain.com</a>.
              </p>
            </div>
          </section>

          <div className="mt-6 flex justify-between text-xs text-white/60">
            <Link href="/legal/terms" className="underline">Terms</Link>
            <Link href="/" className="underline">Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
