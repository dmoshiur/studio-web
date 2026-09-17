/**
 * Seed script — populates Firestore with starter content.
 *
 * Usage:
 *   1. Fill in .env.local with Firebase Admin credentials
 *   2. npx tsx scripts/seed.ts
 *
 * Safe to re-run: it only creates documents that don't already exist
 * (matched by slug), except siteSettings which it merges.
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();

async function ensureBySlug(collection: string, slug: string, data: Record<string, unknown>) {
  const snap = await db.collection(collection).where("slug", "==", slug).limit(1).get();
  if (!snap.empty) {
    console.log(`  ↺ ${collection}/${slug} exists, skipping`);
    return snap.docs[0].id;
  }
  const ref = await db.collection(collection).add({
    ...data,
    slug,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`  ✓ ${collection}/${slug} created (${ref.id})`);
  return ref.id;
}

async function main() {
  console.log("Seeding ManUp starter content…");

  console.log("→ siteSettings/public");
  await db.collection("siteSettings").doc("public").set(
    {
      siteName: "ManUp",
      tagline: "Change Your Mind To Become Success",
      contactEmail: "hello@example.com",
      timezone: "UTC",
      seo: {
        metaTitle: "ManUp — Conference & Events",
        metaDescription: "ManUp is a modern conference and events platform — speakers, schedules, tickets and stories.",
        keywords: "conference, events, speakers, tickets, ManUp",
        twitterCard: "summary_large_image",
      },
      social: {},
      appearance: { primaryColor: "#b99352", secondaryColor: "#ddc99e", theme: "light" },
      homepage: {
        heroBadge: "Annual Tech Conference",
        heroTitle: "Change Your Mind To Become Success",
        heroSubtitle: "Join industry leaders, innovators and creators for two days of talks, workshops and networking.",
        heroCtaPrimary: { label: "Get Tickets", href: "/events" },
        heroCtaSecondary: { label: "Meet Speakers", href: "/speakers" },
        eventVenue: "Mardavall Hotel, New York",
        showCountdown: true,
        aboutTitle: "About the Conference",
        aboutBody: "ManUp brings together the brightest minds in technology and business. Across multiple tracks you'll find keynotes, panels, hands-on workshops and unforgettable networking.",
        aboutStats: [
          { value: "2K+", label: "Attendees" },
          { value: "40+", label: "Speakers" },
          { value: "25+", label: "Sessions" },
          { value: "2", label: "Days" },
        ],
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log("→ siteSettings/maintenance");
  await db.collection("siteSettings").doc("maintenance").set(
    {
      enabled: false,
      emergencyLock: false,
      title: "We'll be back soon",
      message: "Our website is temporarily under maintenance. Thanks for your patience.",
      expectedReturn: "",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log("→ navigation");
  await db.collection("navigation").doc("header").set({
    links: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Speakers", href: "/speakers" },
      { label: "Events", href: "/events" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
    updatedAt: FieldValue.serverTimestamp(),
  });
  await db.collection("navigation").doc("footer").set({
    links: [
      { label: "About", href: "/about" },
      { label: "Events", href: "/events" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
    ],
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log("→ socialLinks");
  for (const s of [
    { label: "Facebook", href: "https://facebook.com", icon: "facebook" },
    { label: "Instagram", href: "https://instagram.com", icon: "instagram" },
    { label: "YouTube", href: "https://youtube.com", icon: "youtube" },
    { label: "LinkedIn", href: "https://linkedin.com", icon: "linkedin" },
  ]) {
    const snap = await db.collection("socialLinks").where("label", "==", s.label).limit(1).get();
    if (snap.empty) {
      await db.collection("socialLinks").add({ ...s, updatedAt: FieldValue.serverTimestamp() });
      console.log(`  ✓ socialLinks/${s.label}`);
    } else {
      console.log(`  ↺ socialLinks/${s.label} exists, skipping`);
    }
  }

  console.log("→ categories");
  const keynote = await ensureBySlug("categories", "keynotes", { name: "Keynotes", description: "Main-stage talks", color: "#b99352" });
  await ensureBySlug("categories", "workshops", { name: "Workshops", description: "Hands-on sessions", color: "#ddc99e" });
  await ensureBySlug("categories", "community", { name: "Community", description: "Stories from attendees", color: "#673ab7" });

  console.log("→ speakers");
  const speakerIds: string[] = [];
  speakerIds.push(await ensureBySlug("speakers", "jayden", {
    name: "Jayden", title: "Founder", company: "Northwind", featured: true, status: "published",
    bio: "Jayden has spent a decade building developer communities and opens our main stage with lessons on momentum.",
    socials: [{ label: "LinkedIn", url: "https://linkedin.com" }],
  }));
  speakerIds.push(await ensureBySlug("speakers", "sara", {
    name: "Sara", title: "CTO", company: "Acme Inc.", featured: true, status: "published",
    bio: "Sara leads engineering at Acme and speaks about scaling teams without losing the craft.",
    socials: [{ label: "LinkedIn", url: "https://linkedin.com" }],
  }));
  speakerIds.push(await ensureBySlug("speakers", "emma", {
    name: "Emma", title: "Design Director", company: "Studio North", featured: true, status: "published",
    bio: "Emma designs event experiences attended by thousands and shares her playbook for unforgettable moments.",
    socials: [{ label: "Website", url: "https://example.com" }],
  }));
  speakerIds.push(await ensureBySlug("speakers", "harriet", {
    name: "Harriet", title: "Author & Speaker", company: "", featured: false, status: "published",
    bio: "Harriet writes about focus and creativity, and closes day one with a keynote on doing work that matters.",
    socials: [],
  }));

  console.log("→ events");
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  await ensureBySlug("events", "opening-keynote", {
    title: "Opening Keynote: Change Your Mind", status: "published", featured: true,
    description: "Kick off the conference with a high-energy keynote on growth, momentum and building what's next.",
    contentHtml: "<p>Doors open at 8:30 AM. The keynote starts at 9:30 AM sharp in the Main Hall.</p>",
    startAt: nextMonth, venue: "Main Hall", address: "Mardavall Hotel, New York",
    speakerIds: [speakerIds[0]], price: "Included with ticket",
  });
  const day2 = new Date(nextMonth);
  day2.setDate(day2.getDate() + 1);
  await ensureBySlug("events", "scaling-teams-workshop", {
    title: "Workshop: Scaling Teams Without Losing Craft", status: "published", featured: false,
    description: "A hands-on workshop with real org charts, real trade-offs and a playbook you can use Monday morning.",
    contentHtml: "<p>Limited to 60 seats. Laptops required.</p>",
    startAt: day2, venue: "Workshop Room B", address: "Mardavall Hotel, New York",
    speakerIds: [speakerIds[1]], price: "$49 add-on",
  });

  console.log("→ posts");
  const now = new Date();
  await ensureBySlug("posts", "welcome-to-manup", {
    title: "Welcome to the new ManUp", status: "published", featured: true,
    authorName: "ManUp Team", categoryId: keynote, categorySlug: "keynotes",
    tags: ["announcement", "conference"],
    excerpt: "A faster, more accessible ManUp — with a brand-new schedule, speaker lineup and blog.",
    contentHtml: "<p>Welcome to the new ManUp platform. Browse the schedule, meet the speakers and grab your ticket.</p><h2>What is new</h2><ul><li>Dynamic schedule and speaker pages</li><li>A proper blog with categories</li><li>Accessible, mobile-first design</li></ul>",
    readingMinutes: 2, publishedAt: now,
  });
  await ensureBySlug("posts", "five-talks-not-to-miss", {
    title: "Five talks you should not miss", status: "published", featured: false,
    authorName: "ManUp Team", categoryId: keynote, categorySlug: "keynotes",
    tags: ["guide", "schedule"],
    excerpt: "Our curation team's shortlist of the sessions with the highest signal per minute.",
    contentHtml: "<p>With 25+ sessions across two days, choosing is hard. Here is our shortlist.</p><h2>1. The opening keynote</h2><p>Sets the tone for everything else.</p><h2>2. Scaling teams</h2><p>Practical, honest, immediately useful.</p>",
    readingMinutes: 3, publishedAt: now,
  });

  console.log("\nDone. Next: create your owner account via /setup (see docs).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
