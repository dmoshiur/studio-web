import type { Metadata } from "next";
import { getPageBySlug } from "@/lib/firestore/content";
import { PageHero } from "@/components/public/cards";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How we collect, use and protect your data.",
};

const FALLBACK = `
<h2>1. What we collect</h2>
<p>When you contact us or subscribe to updates, we store the details you provide (such as your name and email address) so we can respond and keep you informed.</p>
<h2>2. How we use it</h2>
<ul><li>To respond to your messages</li><li>To send event updates you subscribed to</li><li>To operate and secure this website</li></ul>
<h2>3. Your rights</h2>
<p>You can request a copy, correction or deletion of your data at any time, and unsubscribe from emails with one click. Contact us and we will help.</p>
<h2>4. Security</h2>
<p>We use industry-standard hosting, encryption in transit, and strict access controls. No system is perfect, but we take protection seriously.</p>
<h2>5. Contact</h2>
<p>Questions about privacy? Reach out through our contact page.</p>
`;

export default async function PrivacyPage() {
  const custom = await getPageBySlug("privacy").catch(() => null);
  const html = custom?.status === "published" ? custom.contentHtml : FALLBACK;

  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" description="How we collect, use and protect your data." />
      <section className="bg-white py-14 md:py-20">
        <div className="container max-w-3xl">
          <div className="prose-manup rounded-3xl border border-ink-100 bg-white p-6 shadow-card md:p-10" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </section>
    </>
  );
}
