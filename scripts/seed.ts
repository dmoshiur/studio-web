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
  console.log("Seeding Photography starter content…");

  console.log("→ siteSettings/public");
  await db.collection("siteSettings").doc("public").set(
    {
      siteName: "Photography",
      tagline: "Event Management Studio — Photo & Videography Events",
      contactEmail: "hello@example.com",
      timezone: "UTC",
      seo: {
        metaTitle: "Photography — Event Management Studio",
        metaDescription: "Photography is a modern event management studio — photo and video productions, schedules, speakers, tickets and stories.",
        keywords: "photography, event management studio, photo events, videography, speakers, schedule, tickets",
        twitterCard: "summary_large_image",
      },
      social: {},
      appearance: { primaryColor: "#b99352", secondaryColor: "#ddc99e", theme: "light" },
      homepage: {
        heroBadge: "Photo & Video Production Event",
        heroTitle: "Where Every Frame Tells The Story",
        heroSubtitle: "Join leading photographers, filmmakers and creators for days of shoots, workshops, lighting labs and portfolio reviews.",
        heroCtaPrimary: { label: "Get Tickets", href: "/events" },
        heroCtaSecondary: { label: "Meet Speakers", href: "/speakers" },
        eventVenue: "Grand Meridian Hall, New York",
        showCountdown: true,
        aboutTitle: "About The Studio",
        aboutBody: "Photography brings together the brightest image-makers in photo and video. Across multiple tracks you'll find keynotes, live shoots, hands-on workshops and unforgettable networking.",
        aboutStats: [
          { value: "2K+", label: "Attendees" },
          { value: "40+", label: "Speakers" },
          { value: "25+", label: "Sessions" },
          { value: "3", label: "Days" },
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
      { label: "Schedule", href: "/schedule" },
      { label: "Events", href: "/events" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
    updatedAt: FieldValue.serverTimestamp(),
  });
  await db.collection("navigation").doc("footer").set({
    links: [
      { label: "About", href: "/about" },
      { label: "Speakers", href: "/speakers" },
      { label: "Schedule", href: "/schedule" },
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
    topic: "Building A Studio That Outlives Trends",
    bio: "Jayden has spent a decade shooting editorial portraits and opens our main stage with lessons on momentum.",
    socials: [{ label: "LinkedIn", url: "https://linkedin.com" }],
  }));
  speakerIds.push(await ensureBySlug("speakers", "sara", {
    name: "Sara", title: "CTO", company: "Acme Inc.", featured: true, status: "published",
    topic: "Color Grading At Scale",
    bio: "Sara leads post-production at Acme Films and speaks about grading pipelines without losing the craft.",
    socials: [{ label: "LinkedIn", url: "https://linkedin.com" }],
  }));
  speakerIds.push(await ensureBySlug("speakers", "emma", {
    name: "Emma", title: "Design Director", company: "Studio North", featured: true, status: "published",
    topic: "Art Directing A Shoot",
    bio: "Emma designs visual experiences attended by thousands and shares her playbook for unforgettable frames.",
    socials: [{ label: "Website", url: "https://example.com" }],
  }));
  speakerIds.push(await ensureBySlug("speakers", "harriet", {
    name: "Harriet", title: "Author & Speaker", company: "", featured: false, status: "published",
    topic: "Why Some Images Persuade",
    bio: "Harriet writes about focus and visual storytelling, and closes day one with a keynote on work that matters.",
    socials: [],
  }));

  console.log("→ events");
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  await ensureBySlug("events", "opening-keynote", {
    title: "Opening Keynote: Where Every Frame Tells The Story", status: "published", featured: true,
    description: "Kick off the summit with a high-energy keynote on growth, momentum and building what's next.",
    contentHtml: "<p>Doors open at 8:30 AM. The keynote starts at 9:30 AM sharp in the Main Hall.</p>",
    startAt: nextMonth, venue: "Main Hall", address: "Grand Meridian Hall, New York",
    speakerIds: [speakerIds[0]], price: "Included with ticket",
  });
  const day2 = new Date(nextMonth);
  day2.setDate(day2.getDate() + 1);
  await ensureBySlug("events", "scaling-teams-workshop", {
    title: "Workshop: Scaling Teams Without Losing Craft", status: "published", featured: false,
    description: "A hands-on workshop with real org charts, real trade-offs and a playbook you can use Monday morning.",
    contentHtml: "<p>Limited to 60 seats. Laptops required.</p>",
    startAt: day2, venue: "Workshop Room B", address: "Grand Meridian Hall, New York",
    speakerIds: [speakerIds[1]], price: "$49 add-on",
  });


  console.log("→ scheduleDays");
  const summitStart = new Date();
  summitStart.setDate(summitStart.getDate() + 30);
  const day2Date = new Date(summitStart); day2Date.setDate(day2Date.getDate() + 1);
  const day3Date = new Date(summitStart); day3Date.setDate(day3Date.getDate() + 2);
  const scheduleDays = [
    {
      id: "day-1", day: 1, label: "Day 1", dateISO: summitStart.toISOString(),
      note: "Doors open 08:00", status: "published",
      sessions: [
        { id: "d1-opening", title: "Doors Open & Coffee Portrait Corner", description: "Badge pickup, coffee and a live portrait corner.", startTime: "08:00", endTime: "09:00", venue: "Foyer", track: "Arrival", speakerIds: [] },
        { id: "d1-keynote", title: "Building A Studio That Outlives Trends", description: "Opening keynote on the middle years of running a photo business.", startTime: "09:00", endTime: "09:45", venue: "Main Stage", track: "Keynote", speakerIds: [speakerIds[0]] },
        { id: "d1-art", title: "Art Directing A Shoot", description: "Building a set that photographs beautifully.", startTime: "10:15", endTime: "11:30", venue: "Lighting Lab A", track: "Workshop", speakerIds: [speakerIds[2]] },
        { id: "d1-color", title: "Color Grading At Scale", description: "A repeatable grading pipeline for teams.", startTime: "13:00", endTime: "14:15", venue: "Post-Production Room", track: "Workshop", speakerIds: [speakerIds[1]] },
      ],
    },
    {
      id: "day-2", day: 2, label: "Day 2", dateISO: day2Date.toISOString(),
      note: "Portfolio reviews all afternoon", status: "published",
      sessions: [
        { id: "d2-psych", title: "Why Some Images Persuade", description: "The psychology of first glances.", startTime: "09:30", endTime: "10:15", venue: "Main Stage", track: "Keynote", speakerIds: [speakerIds[3]] },
        { id: "d2-cine", title: "From Stills To Motion", description: "A cinematographer's crossover guide.", startTime: "11:15", endTime: "12:30", venue: "Screening Room", track: "Workshop", speakerIds: [speakerIds[1]] },
      ],
    },
    {
      id: "day-3", day: 3, label: "Day 3", dateISO: day3Date.toISOString(),
      note: "Gala dress code: black tie optional", status: "published",
      sessions: [
        { id: "d3-panel", title: "The State Of The Industry: Panel", description: "Rates, AI, licensing and where clients are spending.", startTime: "11:15", endTime: "12:15", venue: "Main Stage", track: "Panel", speakerIds: [speakerIds[0], speakerIds[3]] },
        { id: "d3-gala", title: "Closing Gala & Print Auction", description: "Dinner, the print auction and the awards.", startTime: "19:00", endTime: "23:00", venue: "Grand Ballroom", track: "Evening", speakerIds: [] },
      ],
    },
  ];
  for (const d of scheduleDays) {
    const snap = await db.collection("scheduleDays").doc(d.id).get();
    if (!snap.exists) {
      await db.collection("scheduleDays").doc(d.id).set({ ...d, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      console.log(`  ✓ scheduleDays/${d.id}`);
    } else {
      console.log(`  ↺ scheduleDays/${d.id} exists, skipping`);
    }
  }

  console.log("→ posts");
  const now = new Date();
  await ensureBySlug("posts", "welcome-to-photography", {
    title: "Welcome to the new Photography studio", status: "published", featured: true,
    authorName: "Photography Team", categoryId: keynote, categorySlug: "keynotes",
    tags: ["announcement", "conference"],
    excerpt: "A faster, more accessible Photography — with a brand-new schedule, speaker lineup and blog.",
    contentHtml: "<p>Welcome to the new Photography platform. Browse the schedule, meet the speakers and grab your ticket.</p><h2>What is new</h2><ul><li>Dynamic schedule and speaker pages</li><li>A proper blog with categories</li><li>Accessible, mobile-first design</li></ul>",
    readingMinutes: 2, publishedAt: now,
  });
  await ensureBySlug("posts", "five-talks-not-to-miss", {
    title: "Five sessions you should not miss", status: "published", featured: false,
    authorName: "Photography Team", categoryId: keynote, categorySlug: "keynotes",
    tags: ["guide", "schedule"],
    excerpt: "Our curation team's shortlist of the sessions with the highest signal per minute.",
    contentHtml: "<p>With 25+ sessions across three days, choosing is hard. Here is our shortlist.</p><h2>1. The opening keynote</h2><p>Sets the tone for everything else.</p><h2>2. Scaling teams</h2><p>Practical, honest, immediately useful.</p>",
    readingMinutes: 3, publishedAt: now,
  });

  console.log("\nDone. Next: create your owner account via /setup (see docs).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
