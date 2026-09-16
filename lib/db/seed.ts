import "server-only";
import { getAdminDb, getDataBackend } from "@/lib/firebase/admin";
import { DEFAULT_PUBLIC_SETTINGS } from "@/lib/firestore/settings";

/**
 * Seeds a complete, launch-ready content set the first time the embedded
 * store is opened: navigation, social links, categories, speakers, events,
 * blog posts, legal pages and public site settings. Idempotent — it runs
 * once per database (guarded by a marker document).
 */

const IMG = {
  stage: "/images/hero-stage.jpg",
  portrait: "/images/hero-portrait.jpg",
  audience: "/images/audience.jpg",
  silk: "/images/cta-silk.jpg",
  foyer: "/images/page-header.jpg",
  panel: "/images/gallery-panel.jpg",
  networking: "/images/gallery-networking.jpg",
};

function daysFromNow(days: number, hour = 9): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function p(paragraphs: string[]): string {
  return paragraphs.map((t) => `<p>${t}</p>`).join("");
}

function h2(title: string): string {
  return `<h2>${title}</h2>`;
}

export async function seedIfEmpty(force = false): Promise<{ seeded: boolean; counts: Record<string, number> }> {
  const db = getAdminDb();
  if (!db) return { seeded: false, counts: {} };

  const marker = await db.collection("siteSettings").doc("seedState").get();
  if (marker.exists && !force) return { seeded: false, counts: {} };

  const now = new Date();

  /* ------------------------------ Settings ----------------------------- */
  await db.collection("siteSettings").doc("public").set(
    {
      ...DEFAULT_PUBLIC_SETTINGS,
      siteName: process.env.NEXT_PUBLIC_APP_NAME ?? "ManUp",
      tagline: "Change Your Mind To Become Success",
      contactEmail: process.env.CONTACT_EMAIL ?? "hello@manup.events",
      phone: "+1 (212) 555-0141",
      address: "Grand Meridian Hall, 128 Lexington Ave, New York, NY",
      timezone: "America/New_York",
      updatedAt: now,
      appearance: {
        primaryColor: "#c9a227",
        secondaryColor: "#e6c65c",
        theme: "dark",
      },
      homepage: {
        ...DEFAULT_PUBLIC_SETTINGS.homepage,
        heroBadge: "The 2026 Annual Summit",
        heroTitle: "Where Ambition Meets The Stage",
        heroSubtitle:
          "Two days of keynote conversations, hands-on workshops and black-tie networking with the founders, operators and creatives shaping what comes next.",
        heroCtaPrimary: { label: "Reserve Your Seat", href: "/events" },
        heroCtaSecondary: { label: "Meet The Speakers", href: "/speakers" },
        heroImage: IMG.portrait,
        eventDateISO: daysFromNow(45, 9).toISOString(),
        eventVenue: "Grand Meridian Hall, New York",
        showCountdown: true,
        aboutTitle: "An Invitation To Rise",
        aboutBody:
          "ManUp is a curated stage for people who refuse to settle. Across two days and four tracks we pair world-class keynotes with intimate workshops, so every idea you hear is one you can act on before you fly home.\n\nExpect candid conversations, real numbers and a room full of people who are already building the next chapter.",
        aboutImage: IMG.audience,
        aboutStats: [
          { value: "2,400+", label: "Attendees" },
          { value: "48", label: "Speakers" },
          { value: "32", label: "Sessions" },
          { value: "2", label: "Days" },
        ],
        stats: [
          { value: "2,400+", label: "Attendees" },
          { value: "48", label: "Speakers" },
          { value: "32", label: "Sessions" },
          { value: "2", label: "Days" },
        ],
        experience: {
          eyebrow: "The Experience",
          title: "Designed Down To The Last Detail",
          body:
            "From the moment the doors open to the final toast, every hour is engineered for momentum — crisp sessions, generous breaks and rooms built for serendipity.",
          items: [
            {
              title: "Main Stage Keynotes",
              description: "Forty-minute talks with no filler: the strategy, the numbers and the mistakes.",
              image: IMG.stage,
            },
            {
              title: "Hands-On Workshops",
              description: "Small-room sessions where you leave with the work actually done.",
              image: IMG.panel,
            },
            {
              title: "Black-Tie Networking",
              description: "Curated introductions and long-table dinners with people worth knowing.",
              image: IMG.networking,
            },
          ],
        },
        venue: {
          title: "Grand Meridian Hall",
          address: "128 Lexington Ave, New York, NY 10016",
          note: "Doors open at 08:00. Valet parking and a private lounge are available for ticket holders.",
          image: IMG.foyer,
        },
        announcement: "Early-bird seats for the 2026 summit are open",
        tickets: [
          {
            name: "Salon Pass",
            price: "$499",
            note: "Single attendee",
            perks: [
              "Both summit days",
              "All keynote sessions",
              "Networking reception",
              "12 months of session recordings",
            ],
          },
          {
            name: "Founder's Pass",
            price: "$1,190",
            note: "Most chosen",
            featured: true,
            perks: [
              "Everything in the Salon Pass",
              "Reserved front-of-house seating",
              "Two hands-on workshops",
              "Black-tie gala dinner seat",
              "Curated introduction list",
            ],
          },
          {
            name: "Table of Six",
            price: "$6,400",
            note: "For teams",
            perks: [
              "Six Founder's Passes",
              "A reserved table for the gala",
              "Private lounge access",
              "Post-event strategy debrief",
            ],
          },
        ],
        testimonials: [
          {
            quote:
              "The only conference I have attended where I left with a decision made, not just notes taken.",
            name: "Elena Márquez",
            role: "Chief Operating Officer, Vantage Labs",
          },
          {
            quote:
              "Two days here replaced six months of introductions. The room is curated, and it shows.",
            name: "Tobias Lund",
            role: "Founder, Northlane Studio",
          },
        ],
        faqs: [
          {
            q: "What is included with my ticket?",
            a: "Every pass covers all keynotes, workshops, the networking dinner and on-demand session recordings for twelve months.",
          },
          {
            q: "Can I transfer my ticket?",
            a: "Yes. Transfers are free up to 72 hours before doors open — just share your confirmation email with the new attendee.",
          },
          {
            q: "Is there a dress code?",
            a: "Smart casual for the sessions and black-tie optional for the evening gala.",
          },
          {
            q: "Will sessions be recorded?",
            a: "Main-stage sessions are recorded. Workshop recordings are released only with the speaker's consent.",
          },
        ],
      },
    },
    { merge: true }
  );

  /* ---------------------------- Navigation ----------------------------- */
  await db.collection("navigation").doc("header").set(
    {
      links: [
        { label: "Home", href: "/" },
        { label: "About", href: "/about" },
        { label: "Speakers", href: "/speakers" },
        { label: "Events", href: "/events" },
        { label: "Journal", href: "/blog" },
        { label: "Contact", href: "/contact" },
      ],
      updatedAt: now,
    },
    { merge: true }
  );

  await db.collection("navigation").doc("footer").set(
    {
      links: [
        { label: "About", href: "/about" },
        { label: "Events", href: "/events" },
        { label: "Speakers", href: "/speakers" },
        { label: "Journal", href: "/blog" },
        { label: "Contact", href: "/contact" },
        { label: "Privacy", href: "/privacy" },
      ],
      updatedAt: now,
    },
    { merge: true }
  );

  /* --------------------------- Social links ---------------------------- */
  const socials: { id: string; label: string; href: string; icon: string }[] = [
    { id: "linkedin", label: "LinkedIn", href: "https://linkedin.com", icon: "linkedin" },
    { id: "instagram", label: "Instagram", href: "https://instagram.com", icon: "instagram" },
    { id: "x", label: "X", href: "https://x.com", icon: "twitter" },
    { id: "youtube", label: "YouTube", href: "https://youtube.com", icon: "youtube" },
  ];
  for (const s of socials) {
    await db.collection("socialLinks").doc(s.id).set({ label: s.label, href: s.href, icon: s.icon, updatedAt: now }, { merge: true });
  }

  /* ---------------------------- Categories ----------------------------- */
  const categories = [
    { id: "leadership", name: "Leadership", color: "#c9a227", description: "Strategy, culture and the craft of running things." },
    { id: "product", name: "Product & Design", color: "#e6c65c", description: "Building things people actually want." },
    { id: "growth", name: "Growth", color: "#8f7b2f", description: "Distribution, story and compounding traction." },
    { id: "backstage", name: "Backstage", color: "#6f6a58", description: "Notes and interviews from behind the curtain." },
  ];
  for (const c of categories) {
    await db.collection("categories").doc(c.id).set(
      { name: c.name, slug: c.id, color: c.color, description: c.description, createdAt: now, updatedAt: now },
      { merge: true }
    );
  }

  /* ------------------------------ Speakers ----------------------------- */
  const speakers = [
    {
      id: "amara-bell",
      name: "Amara Bell",
      title: "Chief Executive Officer",
      company: "Northwind Group",
      bio: "Amara scaled Northwind from a twelve-person studio into a multinational group with offices on four continents. She speaks about the unglamorous middle years of company building — the part nobody photographs.",
      featured: true,
      photoURL: IMG.portrait,
    },
    {
      id: "daniel-okafor",
      name: "Daniel Okafor",
      title: "Founder & Chief Engineer",
      company: "Threadline",
      bio: "Daniel built Threadline's infrastructure twice: once for 10,000 users and once for eleven million. His talks are dense with diagrams, trade-offs and hard-won scar tissue.",
      featured: true,
      photoURL: IMG.stage,
    },
    {
      id: "sofia-marchetti",
      name: "Sofia Marchetti",
      title: "Design Director",
      company: "Atelier Mono",
      bio: "Sofia leads a design practice that refuses to ship anything forgettable. She teaches teams how to earn attention honestly and how taste compounds faster than budget.",
      featured: true,
      photoURL: IMG.panel,
    },
    {
      id: "jonas-reid",
      name: "Jonas Reid",
      title: "Managing Partner",
      company: "Halcyon Ventures",
      bio: "Jonas has written early cheques into forty companies and sat on the boards of a dozen. He brings a blunt, numbers-first view of what separates survivors from statistics.",
      featured: true,
      photoURL: IMG.networking,
    },
    {
      id: "priya-raman",
      name: "Dr. Priya Raman",
      title: "Behavioural Scientist",
      company: "Institute of Applied Cognition",
      bio: "Priya studies how people decide under pressure. Her frameworks are used by negotiators, surgeons and founders who cannot afford to be wrong twice.",
      featured: false,
      photoURL: IMG.audience,
    },
    {
      id: "marcus-hale",
      name: "Marcus Hale",
      title: "Head of Story",
      company: "Quill & Field",
      bio: "Marcus has written launch narratives for products used by hundreds of millions of people. He argues that clarity is the only marketing channel that never saturates.",
      featured: false,
      photoURL: IMG.foyer,
    },
  ];

  for (const s of speakers) {
    await db.collection("speakers").doc(s.id).set(
      {
        name: s.name,
        slug: s.id,
        title: s.title,
        company: s.company,
        bio: s.bio,
        photoURL: s.photoURL,
        featured: s.featured,
        status: "published",
        socials: [
          { label: "LinkedIn", url: "https://linkedin.com" },
          { label: "X", url: "https://x.com" },
        ],
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  }

  /* ------------------------------- Events ------------------------------ */
  const events = [
    {
      id: "annual-summit-2026",
      title: "ManUp Annual Summit 2026",
      slug: "annual-summit-2026",
      description:
        "The flagship gathering: two days, four tracks and a room full of people who are building the next decade.",
      startAt: daysFromNow(45, 9),
      endAt: daysFromNow(46, 18),
      venue: "Grand Meridian Hall",
      address: "128 Lexington Ave, New York, NY",
      coverImage: IMG.stage,
      price: "From $499",
      featured: true,
      registrationUrl: "/contact",
      speakerIds: ["amara-bell", "daniel-okafor", "sofia-marchetti", "jonas-reid"],
      contentHtml:
        h2("Two days that change the shape of your year") +
        p([
          "The Annual Summit is our flagship stage. Expect candid keynotes, small-room workshops and long dinner tables where the real conversations happen.",
          "Every ticket includes all sessions, the networking gala and twelve months of on-demand recordings.",
        ]) +
        h2("What's on the schedule") +
        p([
          "Day one opens with a keynote on building through uncertainty, followed by workshop tracks on product, growth and leadership.",
          "Day two closes with an investor roundtable and the black-tie gala.",
        ]),
    },
    {
      id: "founders-workshop",
      title: "Founders' Workshop: The First 100 Days",
      slug: "founders-workshop",
      description:
        "A hands-on afternoon with operators who have launched, killed and relaunched products — bring a real decision you're facing.",
      startAt: daysFromNow(18, 13),
      endAt: daysFromNow(18, 18),
      venue: "The Atelier Room",
      address: "44 Crosby Street, New York, NY",
      coverImage: IMG.panel,
      price: "$180",
      featured: false,
      speakerIds: ["daniel-okafor", "jonas-reid"],
      contentHtml:
        h2("Bring a decision, leave with a plan") +
        p([
          "This is not a lecture. You will work through a live decision with two operators and eleven peers, then present it back to the room.",
          "Seats are capped at twenty-four so every case gets real airtime.",
        ]),
    },
    {
      id: "story-night",
      title: "Story Night — An Evening of Candid Talks",
      slug: "story-night",
      description:
        "Four speakers, fifteen minutes each, no slides. The stories that don't make it into the keynote deck.",
      startAt: daysFromNow(9, 19),
      endAt: daysFromNow(9, 22),
      venue: "Quill & Field Loft",
      address: "9 Great Jones Street, New York, NY",
      coverImage: IMG.networking,
      price: "$65",
      featured: false,
      speakerIds: ["marcus-hale", "priya-raman"],
      contentHtml:
        h2("No slides. No filler.") +
        p([
          "Four speakers get fifteen minutes and a microphone. The brief is simple: tell us the story you have never told on a stage.",
          "Doors at seven, talks at eight, drinks after.",
        ]),
    },
    {
      id: "executive-roundtable",
      title: "Executive Roundtable: Pricing & Positioning",
      slug: "executive-roundtable",
      description:
        "A closed-door session for founders and senior operators on pricing power, packaging and defending margin.",
      startAt: daysFromNow(-12, 10),
      endAt: daysFromNow(-12, 16),
      venue: "Halcyon Boardroom",
      address: "500 Fifth Avenue, New York, NY",
      coverImage: IMG.foyer,
      price: "Invitation only",
      featured: false,
      speakerIds: ["amara-bell", "jonas-reid"],
      contentHtml: h2("Closed doors, open numbers") + p([
        "Twelve operators compare real pricing decisions. Chatham House rules apply.",
      ]),
    },
  ];

  for (const e of events) {
    await db.collection("events").doc(e.id).set(
      {
        title: e.title,
        slug: e.slug,
        description: e.description,
        contentHtml: e.contentHtml,
        startAt: e.startAt,
        endAt: e.endAt,
        timezone: "America/New_York",
        venue: e.venue,
        address: e.address,
        coverImage: e.coverImage,
        speakerIds: e.speakerIds,
        registrationUrl: e.registrationUrl,
        price: e.price,
        status: "published",
        featured: e.featured,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  }

  /* -------------------------------- Posts ------------------------------ */
  const posts = [
    {
      id: "the-quiet-compounding-of-taste",
      title: "The Quiet Compounding of Taste",
      slug: "the-quiet-compounding-of-taste",
      excerpt:
        "Taste is not a soft skill. It is the cheapest competitive advantage available to a small team — and the slowest to copy.",
      categoryId: "product",
      categorySlug: "product",
      tags: ["design", "craft", "strategy"],
      authorName: "Sofia Marchetti",
      coverImage: IMG.panel,
      featured: true,
      contentHtml:
        p([
          "Every team says it wants better taste. Very few are willing to pay what it costs: attention, patience and the discipline to ship less.",
        ]) +
        h2("Taste is a filter, not a flourish") +
        p([
          "Taste shows up long before anything is styled. It is the decision to cut the third feature, to rewrite the onboarding for the fourth time, to say no to the partnership that would have paid this quarter's bills.",
          "When quality is your filter, every other decision gets cheaper. Roadmaps shorten. Reviews get faster. Hiring gets sharper because the bar is legible.",
        ]) +
        h2("How to compound it deliberately") +
        p([
          "Collect references with intent. Write down why something works, not just that you like it. Review the gaps between your work and the work you admire — then close exactly one of them per cycle.",
          "This is unglamorous and it is the whole game.",
        ]),
    },
    {
      id: "what-2400-attendees-taught-us",
      title: "What 2,400 Attendees Taught Us About Rooms",
      slug: "what-2400-attendees-taught-us",
      excerpt:
          "We changed three things about the main hall last year. Here is what the data — and the hallway conversations — told us.",
      categoryId: "backstage",
      categorySlug: "backstage",
      tags: ["events", "operations"],
      authorName: "ManUp Editorial",
      coverImage: IMG.audience,
      featured: false,
      contentHtml:
        p([
          "Conferences are logistics dressed up as inspiration. Get the room wrong and no keynote can save it.",
        ]) +
        h2("One: shorter sessions, longer breaks") +
        p([
          "Cutting keynotes from fifty minutes to forty lifted session completion in the room by a third. The extra ten minutes went to coffee, where the actual deals happen.",
        ]) +
        h2("Two: seats in curves, not rows") +
        p(["Curved seating improved sightlines and made eye contact between attendees possible. Both matter more than you expect."]) +
        h2("Three: name what the room is for") +
        p([
          "Announcing the purpose of each space — 'this room is for hiring conversations' — tripled the number of introductions made.",
        ]),
    },
    {
      id: "pricing-is-a-product-decision",
      title: "Pricing Is a Product Decision",
      slug: "pricing-is-a-product-decision",
      excerpt:
        "If your pricing lives in a spreadsheet owned by finance, you have already lost. Packaging is positioning with a number attached.",
      categoryId: "growth",
      categorySlug: "growth",
      tags: ["pricing", "growth"],
      authorName: "Jonas Reid",
      coverImage: IMG.stage,
      featured: false,
      contentHtml:
        p([
          "Most teams treat pricing as arithmetic to be avoided. The best teams treat it as a design surface.",
        ]) +
        h2("Start with the story, not the number") +
        p([
          "Write the sentence a customer would use to justify the price to their own boss. If that sentence is weak, no discount will fix it.",
        ]) +
        h2("Packages are positioning") +
        p([
          "Three tiers is not a rule, it is a convenience. What matters is that each tier has an obvious reason to exist and an obvious neighbour it makes look sensible.",
        ]),
    },
    {
      id: "the-middle-years",
      title: "The Middle Years Nobody Photographs",
      slug: "the-middle-years",
      excerpt:
        "Between the announcement and the exit there is a decade of unremarkable Tuesdays. That is where companies are actually made.",
      categoryId: "leadership",
      categorySlug: "leadership",
      tags: ["leadership", "culture"],
      authorName: "Amara Bell",
      coverImage: IMG.foyer,
      featured: false,
      contentHtml:
        p([
          "The launch gets the photographs. The middle years get the work.",
        ]) +
        h2("Boring systems beat heroic effort") +
        p([
          "Every company that survived its middle years built habits it could repeat on a bad day: a weekly review that happens whether or not the founder is inspired, a hiring loop that does not bend, a budget that survives a bad quarter.",
        ]) +
        h2("Keep a written record") +
        p([
          "Write down the decisions and the reasoning. Two years later the reasoning is the only asset left, and it is the one that makes the next decision faster.",
        ]),
    },
  ];

  for (const post of posts) {
    await db.collection("posts").doc(post.id).set(
      {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        contentHtml: post.contentHtml,
        coverImage: post.coverImage,
        categoryId: post.categoryId,
        categorySlug: post.categorySlug,
        tags: post.tags,
        authorName: post.authorName,
        status: "published",
        featured: post.featured,
        readingMinutes: 4,
        publishedAt: post.featured ? daysFromNow(-6, 8) : daysFromNow(-20, 8),
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  }

  /* -------------------------------- Pages ------------------------------ */
  await db.collection("pages").doc("privacy").set(
    {
      slug: "privacy",
      title: "Privacy Policy",
      status: "published",
      contentHtml:
        h2("What we collect") +
        p([
          "We collect the information you give us directly: your name, email address and any message you send through the contact form. Newsletter subscribers are recorded with the address you provide and the page you subscribed from.",
        ]) +
        h2("How we use it") +
        p([
          "Your details are used to answer your message, deliver the announcements you asked for and keep the platform secure. We never sell personal data and we do not run third-party advertising trackers on this site.",
        ]) +
        h2("Your choices") +
        p([
          "Every newsletter includes a one-click unsubscribe link. You can ask us to delete your account data at any time by writing to the contact address in the footer.",
        ]) +
        h2("Retention") +
        p([
          "Contact messages are kept for twenty-four months. Subscriber records are kept until you unsubscribe, after which only an anonymous suppression entry remains so we never contact you again.",
        ]),
      updatedAt: now,
    },
    { merge: true }
  );

  await db.collection("pages").doc("about").set(
    {
      slug: "about",
      title: "About ManUp",
      status: "published",
      contentHtml:
        h2("Why we exist") +
        p([
          "ManUp began as a single room of forty operators who were tired of panels that said nothing. We kept the format that worked: fewer talks, sharper briefs and time built in for the conversations that outlast the agenda.",
        ]) +
        h2("How we program") +
        p([
          "Every speaker is asked for one idea they have never presented publicly. Sessions are rehearsed with a producer. Workshops are capped so nobody performs to a silent room.",
        ]) +
        h2("Who it is for") +
        p([
          "Founders, senior operators, designers, engineers and the people who back them. If you are in the middle of building something difficult, this stage was built for you.",
        ]),
      updatedAt: now,
    },
    { merge: true }
  );

  await db.collection("pages").doc("contact").set(
    {
      slug: "contact",
      title: "Contact",
      status: "published",
      contentHtml:
        p([
          "For partnerships, press, speaker submissions and ticket support, use the form on this page or write to the address in the footer. We reply to everything within two business days.",
        ]),
      updatedAt: now,
    },
    { merge: true }
  );

  const counts = {
    speakers: speakers.length,
    events: events.length,
    posts: posts.length,
    categories: categories.length,
    pages: 3,
  };

  await db.collection("siteSettings").doc("seedState").set({ seededAt: now, driver: getDataBackend(), counts }, { merge: true });

  return { seeded: true, counts };
}
