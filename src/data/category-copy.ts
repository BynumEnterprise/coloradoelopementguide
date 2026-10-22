// Editorial copy for the seven vendor category pages (/category/{slug}) and the
// per region photographer pages (/photographers/{region}). Hand written.
// Search volumes are from CONTENT-MAP.md and a DataForSEO pull on 2026-10-12.
// Rules: second person, no dashes as punctuation, no exclamation marks, no invented prices.
// Any price is a labeled typical estimate that matches /resources/colorado-elopement-cost.
// {n} is replaced with the live vendor count at build time.

export type Faq = { q: string; a: string };
export type Link = { href: string; label: string; note: string };

export type CategoryCopy = {
  term: string;               // primary target term
  h1: [string, string];       // [plain, italic]
  crumb: string;              // breadcrumb label
  title: string;              // under 160 characters after {n}
  description: string;        // under 160 characters
  intro: string[];            // paragraphs, may contain anchors
  questions: string[];        // exactly 6
  faqs: Faq[];                // exactly 4, plain text
  links: Link[];              // related resources and guides
};

export const CATEGORY_COPY: Record<string, CategoryCopy> = {
  photographers: {
    term: 'colorado elopement photographer',
    h1: ['Colorado Elopement Photographers', 'and small wedding photographers'],
    crumb: 'Elopement Photographers',
    title: 'Colorado Elopement Photographers: {n} Wedding Photographers by Region | Colorado Elopement Guide',
    description: 'Colorado elopement and wedding photographers by region, with how to choose one for altitude, weather, permits and sunrise timelines, plus questions to ask.',
    intro: [
      'A Colorado elopement photographer does a different job from a photographer who works ballrooms. On a small mountain wedding they may be the only other person at your ceremony: the one who knows which trailhead fills by 6 a.m., where the first light lands, and how to keep your vows card dry when the wind picks up at 11,000 feet. A beautiful gallery matters, but how someone works outdoors at altitude matters just as much.',
      'Start with weather. Thunderstorms build over the mountains most summer afternoons, and snow can fall above treeline in any month. A photographer who works here often will steer you toward a sunrise ceremony, name a backup spot below treeline, and tell you plainly whether they reschedule, move locations or shoot through rain. Get that policy in writing before you pay a deposit.',
      'Permits come next. The <a href="/resources/rocky-mountain-national-park-wedding-permit">Rocky Mountain National Park wedding permit</a> covers your photographer for the permitted period, but some national forests expect professional photographers to hold their own commercial permits, and Jefferson County Open Space issues separate photography permits. Ask which permits they carry and whether they help you book the ceremony site. Our <a href="/resources/national-forest-and-blm-elopements">national forest and BLM page</a> explains where the lines fall.',
      'Then match fitness and pace. If you want vows on a ridge at dawn, your photographer is hiking in the dark with heavy gear at altitude. Ask how far they routinely hike, what they carry for you, and how they plan the day if you are flying in from sea level and need a slower first morning.',
      'Finally, read the package. Most elopement photographers sell by hours of coverage, and a travel fee often applies outside their home area. Our <a href="/resources/colorado-elopement-cost">cost guide</a> lists typical ranges as estimates, not quotes. Hiring someone based in the region where you are marrying usually saves the travel fee and buys local knowledge of the light, the lots and the rangers. Every photographer below is grouped by where they are based, so start with your region and tap the heart to save the ones you like to your planner.'
    ],
    questions: [
      'Which permits do you hold for our location, and will you help us book the ceremony site?',
      'What is your weather plan: do you reschedule, move to a backup spot or shoot through rain and snow?',
      'How far and how high are you comfortable hiking, and how do you pace a sunrise for couples coming from sea level?',
      'Is there a travel fee to our location, and does it include lodging the night before an early start?',
      'How many hours of coverage does our timeline need, and what does each package include?',
      'Can we see a complete gallery from a Colorado elopement at a similar spot and time of day?'
    ],
    faqs: [
      { q: 'How much does a Colorado elopement photographer cost?', a: 'Based on packages Colorado photographers publish, a two to three hour sunrise session typically falls between about $2,500 and $4,000, and a full day of six to ten hours between about $4,500 and $7,000. These are typical estimates, not quotes. Travel fees, a second shooter, film and video all change the total, so compare what each package includes rather than the headline price.' },
      { q: 'Does our photographer need a permit?', a: 'It depends on the land. In Rocky Mountain National Park the wedding permit covers your photographer and videographer for the permitted period. On national forest land a small ceremony of your own often needs no permit, but the Forest Service may require commercial photographers to hold their own, and Jefferson County Open Space issues commercial photography permits. Ask your photographer which permits they carry for your exact location.' },
      { q: 'When should we book an elopement photographer?', a: 'Search interest for Colorado elopement photographers peaks from January through April as couples book summer and fall dates, and September weekends are the first to go. If you want a weekend in peak season, start reaching out as soon as you have a date and a region. Weekday and winter dates are usually easier to get on shorter notice.' },
      { q: 'Is sunrise or sunset better for a Colorado elopement?', a: 'In summer, sunrise usually wins: afternoon thunderstorms are common in the mountains, popular trailheads fill early, and the light is soft with few people around. Sunset works well in spring and fall and at west facing spots such as Lost Gulch in Boulder or Sapphire Point in Summit County. A photographer who knows your site will tell you which side the light hits.' }
    ],
    links: [
      { href: '/resources/best-places-to-elope-in-colorado', label: 'Best places to elope', note: 'Twenty ceremony spots by region, with permit status' },
      { href: '/resources/rocky-mountain-national-park-wedding-permit', label: 'RMNP wedding permit', note: 'Fee, sites, group limits and what the permit covers' },
      { href: '/resources/national-forest-and-blm-elopements', label: 'National forest and BLM rules', note: 'When a small ceremony needs a permit' },
      { href: '/resources/colorado-elopement-cost', label: 'What an elopement costs', note: 'Typical ranges for every line of the budget' },
      { href: '/resources/elopement-packages-colorado', label: 'Elopement packages compared', note: 'Photographer, planner and venue packages' },
      { href: '/guides', label: 'Region planning guides', note: 'Ceremony spots, timing and sample days in eight regions' }
    ]
  },

  venues: {
    term: 'colorado elopement venues',
    h1: ['Colorado Elopement Venues', 'and micro wedding venues'],
    crumb: 'Elopement Venues',
    title: 'Colorado Elopement Venues: {n} Micro Wedding Venues, Lodges and Ranches by Region | Colorado Elopement Guide',
    description: 'Colorado elopement and micro wedding venues by region: lodges, ranches, inns and chapels for 2 to 50 guests, and what to ask about storms and minimums.',
    intro: [
      'You do not need a venue to elope in Colorado. Plenty of couples marry on a trail or an overlook with a permit and book nothing else. A venue earns its fee when you want three things in one place: chairs and a roof if the weather turns, a dinner table for the people you love, and somewhere to sleep that night. The venues below were chosen for small weddings, from lodges and ranches to inns, chapels and restaurants with a private room.',
      'The first thing to check is whether a venue actually wants a small wedding. Many mountain properties are built for 150 guests and price accordingly, with a food and beverage minimum that makes no sense for twelve people. Ask directly for elopement, weekday or micro wedding packages, and ask what the minimum is on the day you want.',
      'Next, ask about the storm plan. Afternoon thunderstorms are routine in the high country from June through August, and snow is possible at elevation in any month. A good venue has a covered or indoor ceremony space you would be happy with, and a clear rule about who makes the call and when.',
      'Altitude shapes the day too. Mountain venues commonly sit between 7,500 and 9,500 feet. Guests flying in from sea level can feel it on the first day, so plan an easy arrival, keep the welcome drinks light, and choose a venue where older guests do not have to hike to the ceremony. In winter, ask whether the road and the lot are plowed and who handles it.',
      'Finally, ask about your own vendors. Some venues require their preferred list, which can rule out the photographer you love. Others welcome anyone with insurance. If you want to marry at a public site such as <a href="/resources/rocky-mountain-national-park-wedding-permit">Rocky Mountain National Park</a> or <a href="/resources/maroon-bells-elopement-permit">the Maroon Bells</a> and come back for dinner, find a venue that is happy to host the second half of the day. For venue lists by town, with storm plan checklists, see our <a href="/venues">wedding venue pages</a>.'
    ],
    questions: [
      'Do you offer elopement, weekday or micro wedding packages, and is there a food and beverage minimum on our date?',
      'Where does the ceremony move if a storm rolls in, and who decides when to move it?',
      'Can we bring our own photographer, officiant and florist, or do you require your vendor list?',
      'How many guests can stay on site, and are the road and parking plowed in winter?',
      'How many hours is the space ours, and how early can a ceremony start?',
      'Can we marry somewhere else, such as a park or a trailhead, and come back to you for dinner?'
    ],
    faqs: [
      { q: 'What counts as a micro wedding or an elopement?', a: 'There is no legal definition. Most venues and planners use elopement for the couple alone or with a handful of guests, and micro wedding for roughly 20 to 50 guests. Colorado has no witness requirement and allows self solemnization, so an elopement can legally be just the two of you.' },
      { q: 'Do we need a venue to elope in Colorado?', a: 'No. Many couples marry on public land and book a venue only for dinner or lodging. Public sites have their own rules: Rocky Mountain National Park requires a $300 wedding permit, the Maroon Bells amphitheater is reserved on Recreation.gov, and Sapphire Point is reserved in three hour blocks for up to 30 people. A venue makes sense when you want chairs, weather backup and a meal in one place.' },
      { q: 'How far ahead should we book a Colorado venue?', a: 'Search interest for venues peaks in September and October as couples plan the following year, and fall Saturdays at popular mountain venues go first. Weekdays, winter dates and the shoulder months of April, May and November are much easier. Ask each venue for its open dates before you lock in anything else.' },
      { q: 'Will altitude affect our guests?', a: 'It can. Many mountain venues sit between about 7,500 and 9,500 feet, and guests coming from sea level often feel short of breath or tired on the first day. Plan an easy arrival day, drink plenty of water and go light on alcohol the first night. Guests with heart or lung conditions should ask their doctor before the trip.' }
    ],
    links: [
      { href: '/venues', label: 'Wedding venues by town', note: 'Estes Park, Boulder, Denver, Vail, Aspen, Telluride and more' },
      { href: '/venues/micro-wedding-venues-colorado', label: 'Micro wedding venues', note: 'Hand picked venues for 20 to 50 guests' },
      { href: '/resources/best-places-to-elope-in-colorado', label: 'Best places to elope', note: 'Public ceremony spots and their permit status' },
      { href: '/resources/elopement-packages-colorado', label: 'Elopement packages', note: 'All inclusive and venue led packages explained' },
      { href: '/resources/colorado-elopement-cost', label: 'What an elopement costs', note: 'Typical ranges, labeled as estimates' },
      { href: '/guides', label: 'Region planning guides', note: 'Where to stay and how to time the day' }
    ]
  },

  florists: {
    term: 'colorado wedding florist',
    h1: ['Colorado Wedding Florists', 'for elopements and small weddings'],
    crumb: 'Florists',
    title: 'Colorado Wedding Florists for Elopements: {n} Florists by Region | Colorado Elopement Guide',
    description: 'Colorado wedding florists for elopements and micro weddings, with the public land flower rules, bouquets that survive altitude and wind, and questions to ask.',
    intro: [
      'Flowers for a Colorado elopement have a harder life than flowers in a reception hall. They ride in a car before dawn, hike up a trail, sit in thin dry air and strong sun, and get pushed around by wind on an overlook. The best wedding florist for a small mountain wedding is one who designs for that, not one who scales down a ballroom centerpiece.',
      'Start with the rules where you are marrying, because they shape what your florist should make. Picking wildflowers is not allowed in Rocky Mountain National Park or in Colorado state parks, and Leave No Trace asks you to leave them everywhere else, so plan to bring your flowers rather than gather them. The <a href="/resources/rocky-mountain-national-park-wedding-permit">RMNP wedding permit</a> restricts floral displays and prohibits scattering anything, and the <a href="/resources/maroon-bells-elopement-permit">Maroon Bells amphitheater</a> bans thrown petals. On most public land, whatever you bring must leave with you, including a stray ribbon.',
      'Durability comes next. Low humidity and high sun pull water out of cut stems quickly, and delicate blooms can look tired within an hour out of water. Ask your florist which flowers in your palette hold up best for a few hours in the open, and whether dried or preserved elements make sense for your month. A bouquet you can carry with one hand on a trail, with a wrapped stem and a little water tube or a carrier for the car, is worth more than a large arrangement.',
      'Timing matters as much as design. Sunrise ceremonies start long before shops open, so most couples arrange delivery to their lodging the evening before. Ask how to store the flowers overnight: cool but not freezing, and never in a car that will bake in the sun or freeze in a January night.',
      'Finally, ask about travel. Many florists are based along the Front Range, and a delivery to Breckenridge, Vail or Estes Park often carries a travel fee. A florist who already delivers to your region regularly will know the drive and the timing. Browse by region below and tap the heart to save a florist to your planner.'
    ],
    questions: [
      'Which flowers in our palette hold up best in dry air, strong sun and wind?',
      'Can you deliver the evening before a sunrise ceremony, and how should we store the flowers overnight?',
      'Do you deliver to our mountain town, and what is the travel or delivery fee?',
      'Can you design a bouquet that is easy to carry on a hike, with a wrapped stem or a water tube?',
      'Which of your designs fit the rules at our site, with nothing loose to scatter or leave behind?',
      'Which seasonal or Colorado grown flowers are at their best in our month?'
    ],
    faqs: [
      { q: 'Can we pick wildflowers for our bouquet?', a: 'Not in Rocky Mountain National Park or Colorado state parks, where removing plants is prohibited, and Leave No Trace asks you to leave wildflowers where they grow on other public land too. Bring flowers from a florist instead, and pack out every stem, petal and ribbon.' },
      { q: 'Can we throw petals at a public ceremony site?', a: 'Usually not. The Rocky Mountain National Park wedding permit prohibits scattering anything, and the Maroon Bells amphitheater rules ban thrown petals, rice and confetti. If you want a petal moment, save it for a private venue or your lodging and ask your florist for something you can carry out.' },
      { q: 'How much do elopement flowers cost in Colorado?', a: 'As a typical estimate, a bridal bouquet and a boutonniere from a Colorado florist run about $250 to $500 together, and adding a second bouquet or a small arrangement moves the total toward $600 to $900. These are estimates, not quotes, and delivery to a mountain town can add a travel fee.' },
      { q: 'How do we keep a bouquet fresh at altitude?', a: 'Keep it in water as long as you can, out of direct sun and out of a hot or freezing car, and take it out only when you leave for the ceremony. Dry mountain air pulls water from cut stems quickly, so ask your florist which stems they would choose for a few hours outdoors in your month.' }
    ],
    links: [
      { href: '/resources/rocky-mountain-national-park-wedding-permit', label: 'RMNP wedding permit', note: 'What the permit allows for flowers and decorations' },
      { href: '/resources/maroon-bells-elopement-permit', label: 'Maroon Bells rules', note: 'Amphitheater decorations and what cannot be thrown' },
      { href: '/resources/national-forest-and-blm-elopements', label: 'National forest and BLM rules', note: 'Props, permits and Leave No Trace' },
      { href: '/resources/colorado-elopement-cost', label: 'What an elopement costs', note: 'Florals and every other line, as estimates' },
      { href: '/checklist', label: 'Planning checklist', note: 'When to book flowers in a Colorado timeline' },
      { href: '/guides', label: 'Region planning guides', note: 'Sample sunrise days, hour by hour' }
    ]
  },

  'hair-makeup': {
    term: 'colorado wedding hair and makeup',
    h1: ['Colorado Wedding Hair and Makeup Artists', 'for elopements on location'],
    crumb: 'Hair And Makeup',
    title: 'Colorado Wedding Hair and Makeup Artists for Elopements: {n} by Region | Colorado Elopement Guide',
    description: 'Colorado wedding hair and makeup artists who travel for elopements: what holds up in mountain wind, dry air and sun, early call times and questions to ask.',
    intro: [
      'Hair and makeup for a Colorado elopement has to survive things a hotel ballroom never asks of it: a 4 a.m. start, a drive up a canyon, a hike in cold air, wind on an overlook and strong sun at altitude. The right artist plans for all of that, and the result looks the same in the last portrait as it did in the mirror.',
      'Begin with travel. Most artists come to your hotel or rental and work there, because a trailhead lot at sunrise is dark, cold and windy. Ask where they are based, what the travel fee is to your mountain town, and whether there is an early start fee for a call time before dawn. Our region guides show sample sunrise timelines with hair and makeup starting around 4:15 to 4:45 a.m., so make sure your artist is comfortable with that hour and knows how long they need for each person.',
      'Wind is the biggest styling question. Passes and ridges such as Loveland Pass can be gusty even on a clear morning, and loose waves rarely last. Talk about secured styles, how the veil will be pinned, and what you can fix yourself with a few pins and a small touch up kit when the artist is not with you.',
      'Altitude and dry air change the makeup too. Skin dries out quickly in the mountains and the sun is strong, so ask about hydrating prep, long wearing products and sun protection under makeup. If your ceremony involves a hike, ask how they set makeup so it holds up through some effort, and whether they offer lip color you can reapply on the trail.',
      'Book a trial if you can, ideally in Denver or the town you are staying in before the day, so you can see the look in daylight and in photos. Some artists will also travel to the ceremony for touch ups for an added fee, which can be worth it for a long day. Browse artists by region below, and tap the heart to save the ones you like to your planner.'
    ],
    questions: [
      'Will you come to our hotel or rental, and what are your travel and early start fees?',
      'How do you style hair to hold up in mountain wind, and how will you secure the veil?',
      'What do you use for dry air and strong sun at altitude, and how long will the makeup last?',
      'Can you stay or come to the ceremony site for touch ups, and what does that add?',
      'Do you offer a trial, and can we do it before we drive into the mountains?',
      'How much time do you need per person, and what start time do you recommend for our sunrise ceremony?'
    ],
    faqs: [
      { q: 'How much does wedding hair and makeup cost for a Colorado elopement?', a: 'As a typical estimate, on location hair and makeup for one person runs about $250 to $450 for the service, with an early start fee of about $50 to $150 for a call before dawn and a travel fee when the artist drives to a mountain town. A trial is usually another $100 to $200. These are estimates, not quotes, so ask each artist for current pricing.' },
      { q: 'Will a hair and makeup artist come to a trailhead?', a: 'Most artists prefer to work at your lodging, where there is light, heat and power, and you leave for the ceremony when they finish. Some will travel to the ceremony site or stay for touch ups for an added fee. Ask early, because a sunrise call time in a mountain town limits how many bookings they can take that morning.' },
      { q: 'What hairstyle holds up in mountain wind?', a: 'Secured styles such as low buns, braids and pinned half up looks generally hold better than loose curls on a windy ridge. Ask your artist how they will anchor the veil, and carry a few pins and a small touch up kit so you can fix things between the ceremony and portraits.' },
      { q: 'How early does hair and makeup start for a sunrise elopement?', a: 'Sample sunrise timelines in our region guides start hair and makeup around 4:15 to 4:45 a.m., depending on the drive to the ceremony site and the season. Your artist will tell you how long they need per person; work backward from sunrise, the drive and any hike to set the start.' }
    ],
    links: [
      { href: '/guides/summit-county', label: 'Summit County guide', note: 'A full sunrise timeline at Sapphire Point' },
      { href: '/guides/boulder', label: 'Boulder guide', note: 'A dawn amphitheater hour on Flagstaff Mountain' },
      { href: '/resources/colorado-elopement-cost', label: 'What an elopement costs', note: 'Hair and makeup and every other line, as estimates' },
      { href: '/resources/best-places-to-elope-in-colorado', label: 'Best places to elope', note: 'How far each spot is from town' },
      { href: '/checklist', label: 'Planning checklist', note: 'When to book a trial' },
      { href: '/guides', label: 'Region planning guides', note: 'Weather and timing by month' }
    ]
  },

  officiants: {
    term: 'wedding officiant colorado',
    h1: ['Colorado Wedding Officiants', 'for elopements and small weddings'],
    crumb: 'Officiants',
    title: 'Colorado Wedding Officiants for Elopements: {n} Officiants and Self Solemnization | Colorado Elopement Guide',
    description: 'Colorado wedding officiants for elopements, plus when self solemnization means you need none, when you still want one, and questions to ask before you book.',
    intro: [
      'Colorado is one of the few states where you do not need a wedding officiant at all. Under C.R.S. 14-2-109 the two of you can solemnize your own marriage, there is no witness requirement, and you sign the certificate yourselves. Our <a href="/resources/self-solemnization-colorado">self solemnization guide</a> walks through the form. So the real question is not whether you need an officiant, but whether you want one.',
      'Plenty of couples do. An officiant gives the ceremony a shape: words written for you, a moment for a reading or a ring exchange, someone to look at instead of reading your own script into the wind. If you have family with you, a guided ceremony helps everyone know when to stand, when to listen and when to cheer. If your faith matters to you, a minister, rabbi or other clergy member may be the whole point.',
      'An officiant also handles paperwork. The certificate must be completed correctly and returned to the clerk that issued the license within 63 days, and the license itself must be used within 35 days of issue. Experienced officiants do this every week. If you want a friend to lead the ceremony, know that a friend can sign as officiant only if a religious body has ordained or recognized them; otherwise you can self solemnize and let your friend lead the words. Our <a href="/resources/how-to-get-married-in-colorado">how to get married in Colorado</a> page explains the choice.',
      'For an outdoor elopement, ask the same questions you would ask a photographer. Can they hike to your spot before dawn? Have they married couples there and do they know the permit rules? Rocky Mountain National Park wedding permits run in a two hour window that includes setup and photos, and amplified sound is restricted at most public sites, so you want someone who keeps a ceremony tight and can be heard over a breeze without a microphone.',
      'Finally, ask about travel and the weather plan. Many officiants are based in Denver and travel statewide, often for a fee. Browse by region below, start with officiants based near your ceremony, and tap the heart to save the ones you like to your planner.'
    ],
    questions: [
      'Will you write a custom ceremony for us, and how long does it usually run?',
      'Who completes and returns the license, and how do you make sure it reaches the clerk within 63 days?',
      'Are you comfortable hiking to our site before sunrise, and what is your travel fee?',
      'Have you married couples at our location, and do you know the permit rules there?',
      'What happens if weather pushes our time back or moves us to a backup spot?',
      'Can you keep the ceremony inside our permit window and be heard outdoors without a microphone?'
    ],
    faqs: [
      { q: 'Do we need an officiant to get married in Colorado?', a: 'No. Colorado allows self solemnization under C.R.S. 14-2-109, so the two of you can marry yourselves and sign the certificate as the parties to the marriage. Witnesses are not required either. Many couples still hire an officiant for the ceremony itself, the words and the paperwork.' },
      { q: 'Can a friend officiate our Colorado wedding?', a: 'A friend can lead your ceremony. To sign the certificate as officiant, they need to be ordained or recognized by a religious body; otherwise the two of you can self solemnize and your friend leads the words. Jefferson County notes that if the officiant line carries no recognizable title, it records the marriage as self solemnized.' },
      { q: 'How much does a wedding officiant cost in Colorado?', a: 'As a typical estimate, a simple ceremony with a short script runs about $300 to $500, and a celebrant who writes a custom ceremony, travels to a trailhead at dawn and handles the license runs about $500 to $800. These are estimates, not quotes. Clergy fees vary with the tradition, and self solemnization costs nothing.' },
      { q: 'Who returns the marriage license after the ceremony?', a: 'Whoever solemnizes the marriage completes the certificate and returns it to the clerk that issued the license within 63 days: your officiant, or the two of you if you self solemnize. Ask your officiant to confirm when they have mailed or delivered it.' }
    ],
    links: [
      { href: '/resources/self-solemnization-colorado', label: 'Self solemnization', note: 'How to marry yourselves and fill out the certificate' },
      { href: '/resources/how-to-get-married-in-colorado', label: 'How to get married in Colorado', note: 'License, ceremony, signing and filing in order' },
      { href: '/resources/colorado-marriage-license', label: 'Colorado marriage license', note: 'Fees, deadlines and clerk offices' },
      { href: '/resources/colorado-marriage-laws', label: 'Colorado marriage laws', note: 'Officiants, witnesses and the statutes' },
      { href: '/resources/rocky-mountain-national-park-wedding-permit', label: 'RMNP wedding permit', note: 'The two hour window and sound rules' },
      { href: '/resources/colorado-elopement-cost', label: 'What an elopement costs', note: 'Officiant fees as typical estimates' }
    ]
  },

  planners: {
    term: 'colorado elopement planner',
    h1: ['Colorado Elopement Planners', 'and small wedding planners'],
    crumb: 'Elopement Planners',
    title: 'Colorado Elopement Planners and Wedding Planners: {n} by Region | Colorado Elopement Guide',
    description: 'Colorado elopement and wedding planners by region: when a planner earns the fee, which permits they book, typical cost estimates and questions to ask.',
    intro: [
      'A two person elopement in Colorado does not always need a planner. Many photographers help you pick the spot, book the permit and build the timeline, and the legal side is simple: a $30 license, no witnesses and the option to marry yourselves. A planner earns the fee when the logistics multiply: guests flying in, a ceremony on public land and dinner somewhere else, a permit that opens on one morning, or a date you cannot move.',
      'In Colorado the hard part is usually access, not decor. The <a href="/resources/maroon-bells-elopement-permit">Maroon Bells amphitheater</a> is reserved on Recreation.gov, comes with a handful of vehicle passes and sits behind a shuttle system. The <a href="/resources/rocky-mountain-national-park-wedding-permit">Rocky Mountain National Park permit</a> runs in a two hour window with group caps by site. Boulder books its Sunrise Amphitheater up to two years ahead, and Denver opens next year\'s most popular park sites on a single morning in early November. An experienced planner knows those calendars and books them on time.',
      'Ask what kind of planning you are buying. Full planning covers vendor selection, guest logistics and the whole weekend. Partial planning or day of coordination means you book most things and the planner runs the day. Elopement specialists often bundle permits, a timeline and a vendor team into a package. Our <a href="/resources/elopement-packages-colorado">elopement packages page</a> compares those models.',
      'For a micro wedding, ask how they handle the people. Guests arriving from sea level need an easy first day at altitude, a plan for parking at trailheads that cap vehicles, and transport if the ceremony is up a pass. Ask about the storm plan too: afternoon thunderstorms are routine in summer, and the planner should have a covered backup and a clear rule about when to call it.',
      'Finally, ask how they choose vendors and whether they take referral fees, so you know whose interests a recommendation serves. Browse planners by region below, start with someone who works your area every week, and tap the heart to save them to your planner.'
    ],
    questions: [
      'Which permits and reservations will you book for us, and which do we book ourselves?',
      'Have you planned at our ceremony site, and what is your weather backup there?',
      'Is this full planning, partial planning or day of coordination, and how many hours are you with us on the day?',
      'Do you have a preferred vendor team, and do you receive referral fees from them?',
      'How do you handle guest lodging, transport, parking caps and altitude for a micro wedding?',
      'What does your fee include, and are travel and assistants extra?'
    ],
    faqs: [
      { q: 'Do we need a planner for a Colorado elopement?', a: 'Not always. For two people at a site that needs a simple permit, many couples rely on their photographer for location and timeline help. A planner earns the fee when you have guests, several vendors, a ceremony and dinner in different places, or a permit that must be booked the moment it opens.' },
      { q: 'How much does an elopement planner cost in Colorado?', a: 'As a typical estimate, partial planning or day of coordination runs about $1,500 to $3,000, and full planning for a weekend with guests about $3,500 to $6,000 and up. These are estimates, not quotes. Many elopement planners also sell packages that bundle the planner with a photographer or officiant.' },
      { q: 'When do popular Colorado ceremony sites open for booking?', a: 'Each manager runs its own calendar. Boulder takes Sunrise Amphitheater reservations up to two years ahead, Denver opens its most popular park sites for the following year on one morning in early November, and the Maroon Bells amphitheater and Sapphire Point are reserved on Recreation.gov. A planner who works your region will know the dates.' },
      { q: 'What is the difference between an elopement planner and a wedding planner?', a: 'An elopement planner specializes in very small ceremonies, usually on public land, and focuses on permits, access, timing and a small vendor team. A wedding planner more often runs larger events at a venue, with guest management, rentals and a reception. Many Colorado planners do both, so ask which they do most.' }
    ],
    links: [
      { href: '/resources/elopement-packages-colorado', label: 'Elopement packages compared', note: 'Planner led, photographer led and venue led' },
      { href: '/resources/maroon-bells-elopement-permit', label: 'Maroon Bells permit', note: 'Amphitheater reservation, passes and shuttles' },
      { href: '/resources/rocky-mountain-national-park-wedding-permit', label: 'RMNP wedding permit', note: 'Sites, group limits and timing' },
      { href: '/resources/how-to-get-married-in-colorado', label: 'How to get married in Colorado', note: 'The legal steps in order' },
      { href: '/resources/colorado-elopement-cost', label: 'What an elopement costs', note: 'Planning fees as typical estimates' },
      { href: '/checklist', label: 'Planning checklist', note: 'Everything in the order to book it' }
    ]
  },

  packages: {
    term: 'colorado elopement packages',
    h1: ['Colorado Elopement Packages', 'all inclusive and bundled'],
    crumb: 'Elopement Packages',
    title: 'Colorado Elopement Packages: {n} All Inclusive and Bundled Options by Region | Colorado Elopement Guide',
    description: 'Colorado elopement packages that bundle officiant, photography, planning, flowers and more from one team, with what each type includes and the questions to ask.',
    intro: [
      'A Colorado elopement package puts the whole day under one roof. Instead of booking a photographer, an officiant, a planner and a florist separately, you hire one team that brings them together, sets the timeline and shows up with everything. For couples flying in from out of state, or anyone who would rather spend their energy on the vows than on vendor emails, that is the whole appeal.',
      'The word package gets used loosely, so read what is actually inside. The businesses on this page sell bundles that combine at least three parts of the day. Most include an officiant and photography, many add planning and permit help, and the fuller ones bring flowers, a small cake, hair and makeup, a ceremony arch or chairs, and a coordinator who runs the hour so you do not have to. A photographer who adds planning support, or a planner who sells planning only, is listed with the <a href="/category/photographers">photographers</a> and <a href="/category/planners">planners</a> instead.',
      'Packages come in a few shapes. Officiant led packages start with the ceremony and add photography and florals around it. Photographer led packages start with the pictures and add an officiant, planning and sometimes video. Planner led packages assemble a hand picked team under one contract. Venue packages pair a private ceremony site with the vendors. Our <a href="/resources/elopement-packages-colorado">elopement packages guide</a> breaks each type down, with typical price ranges marked as estimates.',
      'The two things a package rarely includes are the marriage license and the land. The $30 license comes from any county clerk, and ceremony permits for places like <a href="/resources/rocky-mountain-national-park-wedding-permit">Rocky Mountain National Park</a> are issued to you rather than your vendor, though a good package team will tell you exactly which one you need and when to apply. Ask who books the permit, who holds it on the day, and what happens if the site is full.',
      'Finally, compare guest counts and hours rather than headline prices. A package built for the two of you and a package built for twenty guests with chairs and cake are different products. Check the maximum guest count, how many hours of photography are included, whether travel to your region is covered, and what the weather plan looks like. Every package below is grouped by where the team is based, so start with your region and tap the heart to save the ones you like to your planner.'
    ],
    questions: [
      'Exactly which vendors are included, and which are add ons or referrals we book ourselves?',
      'What is the maximum guest count, and how many hours of photography and coordination does the package cover?',
      'Who applies for the ceremony permit, who holds it on the day, and is the fee included?',
      'Is travel to our location included, and does the price change by region or season?',
      'What is the weather plan if we need to move the time or the site?',
      'Can we see a full gallery and a sample timeline from a package at a similar spot and guest count?'
    ],
    faqs: [
      { q: 'How much does a Colorado elopement package cost?', a: 'It depends on what is bundled. Based on packages Colorado teams publish, a photographer led package with planning typically runs about $2,500 to $7,000, a planner led package about $1,500 to $6,000 plus the vendors it coordinates, and a venue package about $1,500 to $8,000. These are typical estimates, not quotes. All inclusive bundles that add florals, cake, hair and makeup and a coordinator sit toward the top of those ranges.' },
      { q: 'What does an all inclusive elopement package usually include?', a: 'Most include an officiant, photography, planning help and a ceremony location recommendation. Fuller packages add florals, a small cake or a toast, hair and makeup, an arch or chairs, music and a coordinator for the day. The $30 marriage license and public land permits are almost always separate, so ask who handles them.' },
      { q: 'Do we still need a permit with a package?', a: 'Usually yes. Ceremony permits in Rocky Mountain National Park, Denver Mountain Parks and most state parks are issued to the couple rather than the vendor. A good package team tells you which permit your spot needs, when to apply and what the group limit is, and some will file it for you. A private venue included in a package needs no public permit.' },
      { q: 'Is a package cheaper than booking vendors separately?', a: 'Often, but not always. A bundle saves the time of coordinating four or five contracts and usually prices the parts below what they cost one by one. Compare it against the sum of the individual vendors you would actually choose, and check that the included photographer or florist is someone whose work you like, since you are hiring the whole team.' }
    ],
    links: [
      { href: '/resources/elopement-packages-colorado', label: 'Elopement packages compared', note: 'Photographer, planner, venue and all inclusive packages' },
      { href: '/resources/colorado-elopement-cost', label: 'What an elopement costs', note: 'Typical ranges for every line of the budget' },
      { href: '/resources/best-places-to-elope-in-colorado', label: 'Best places to elope', note: 'Twenty ceremony spots by region, with permit status' },
      { href: '/resources/rocky-mountain-national-park-wedding-permit', label: 'RMNP wedding permit', note: 'Fee, sites, group limits and what the permit covers' },
      { href: '/resources/colorado-marriage-license', label: 'Colorado marriage license', note: 'Fees, deadlines and clerk offices' },
      { href: '/guides', label: 'Region planning guides', note: 'Ceremony spots, timing and sample days in eight regions' }
    ]
  }
};

// Per region photographer landing pages (/photographers/{region}).
// A page builds only when at least MIN_PHOTOGRAPHERS live photographers are based in the region.
export const MIN_PHOTOGRAPHERS = 8;

export type PhotographerPage = {
  region: string;             // sub_region slug and URL segment
  place: string;              // short display name
  term: string;               // target term
  h1: [string, string];
  title: string;              // {n} replaced
  description: string;
  intro: string[];
  faqs: Faq[];                // {n} replaced
  links: Link[];
};

export const PHOTOGRAPHER_PAGES: PhotographerPage[] = [
  {
    region: 'summit-county',
    place: 'Breckenridge and Summit County',
    term: 'breckenridge elopement photographer',
    h1: ['Breckenridge Elopement Photographers', 'and Summit County wedding photographers'],
    title: 'Breckenridge Elopement Photographers: {n} Summit County Wedding Photographers | Colorado Elopement Guide',
    description: 'Breckenridge and Summit County elopement photographers for Sapphire Point, Loveland Pass and resort ceremonies, with permit, timing and weather advice.',
    intro: [
      'Summit County is the most convenient real mountain elopement in Colorado, and one of the deepest benches of elopement photographers in the state lives here. Many work out of Breckenridge, with others in Frisco, Dillon and Silverthorne, which puts them within twenty minutes of the county\'s ceremony spots.',
      'The site you choose shapes which photographer to hire. <a href="/resources/sapphire-point-overlook-elopement">Sapphire Point Overlook</a> is reserved in three hour blocks for up to 30 people, it is non exclusive, and Recreation.gov notes that commercial use there is prohibited, so ask any photographer exactly how they work at the overlook before you book. Loveland Pass sits on the Continental Divide at 11,990 feet with nothing to reserve and wind that builds through the morning; it is a sunrise site. The resort ceremony decks at Keystone, Breckenridge, Copper and Arapahoe Basin are booked through the resorts and bring their own rules.',
      'Ask about altitude and weather. You will be at 9,000 feet or higher, afternoon storms are routine in July and August, and snow can arrive in any month. A local photographer will plan a dawn start, a backup below the pass and an easy pace if you flew in yesterday. Late September is the month locals marry, when the aspens along Boreas Pass Road peak, so book those weekends early.'
    ],
    faqs: [
      { q: 'How many elopement photographers are based in Summit County?', a: 'We list {n} photographers based in Breckenridge and the rest of Summit County, ranked by Google rating and review count with any featured listings first and labeled. Statewide photographers who travel here are listed on our Colorado elopement photographers page.' },
      { q: 'Can a photographer work at Sapphire Point?', a: 'Sapphire Point is reserved on Recreation.gov in three hour blocks for up to 30 people, and the listing notes that commercial use at the site is prohibited. Ask your photographer how they handle that before you book, and call the Dillon Ranger District at 970-468-5400 if anything is unclear.' },
      { q: 'What is the best time of day for a Summit County elopement?', a: 'Sunrise, most of the year. Loveland Pass is windiest after mid morning, summer storms usually build after 1 p.m., and the Sapphire Point lot is quietest at dawn. Sapphire Point faces west, so sunset works too in calm fall weather if you accept more people on the trail.' },
      { q: 'When are the aspens at their best in Summit County?', a: 'Usually in the last two weeks of September, best seen along Boreas Pass Road south of Breckenridge. Early October can be gorgeous or wintry in the same week, so ask your photographer for a backup plan if you choose a fall date.' }
    ],
    links: [
      { href: '/guides/summit-county', label: 'Summit County planning guide', note: 'Ceremony spots, timing and a sample sunrise day' },
      { href: '/resources/sapphire-point-overlook-elopement', label: 'Sapphire Point guide', note: 'Reservations, the 30 person limit and parking' },
      { href: '/resources/summit-county-marriage-license', label: 'Summit County marriage license', note: 'Appointments and fees in Breckenridge' },
      { href: '/region/summit-county', label: 'Every Summit County vendor', note: 'Venues, florists, officiants and planners' }
    ]
  },
  {
    region: 'northern-colorado',
    place: 'Fort Collins and Northern Colorado',
    term: 'fort collins wedding photographer',
    h1: ['Fort Collins Elopement Photographers', 'and Northern Colorado wedding photographers'],
    title: 'Fort Collins Elopement and Wedding Photographers: {n} in Northern Colorado | Colorado Elopement Guide',
    description: 'Fort Collins and Northern Colorado elopement and wedding photographers for Horsetooth, Lory State Park and the Poudre Canyon, with permits and timing.',
    intro: [
      'Northern Colorado is the understated choice, and many of the photographers we list here are based in Fort Collins, with a few in Loveland and nearby towns. They work a landscape that tourists mostly skip: a red hogback over Horsetooth Reservoir, the granite of Lory State Park and forty miles of the Cache la Poudre, Colorado\'s only Wild and Scenic river.',
      'Ask a photographer which light they like for your site, because it differs sharply here. Horsetooth faces east over the plains, so a sunrise from Horsetooth Rock or the dam overlooks is the signature image, after a steady climb by headlamp. The Poudre Canyon stays shaded until mid morning and glows in late afternoon. Larimer County handles small ceremonies at Horsetooth and Devil\'s Backbone with a simple permit and a daily vehicle entrance permit, Lory State Park needs a special activity agreement, and the Forest Service may ask for a permit along the Wild and Scenic corridor, so a photographer who knows those rules saves you a phone call or three.',
      'If you plan to marry in Rocky Mountain National Park, Estes Park is about an hour away, so ask about travel fees. Late September and early October are the best weeks in the canyon, with golden cottonwoods and aspens near Cameron Pass.'
    ],
    faqs: [
      { q: 'How many wedding photographers are based in Fort Collins and Northern Colorado?', a: 'We list {n} photographers based in Fort Collins, Loveland and the rest of Northern Colorado, ranked by Google rating and review count with any featured listings first and labeled.' },
      { q: 'Do we need a permit for photos at Horsetooth?', a: 'Horsetooth Mountain, the reservoir parks and Devil\'s Backbone are managed by Larimer County, which handles ceremonies of 20 or fewer through a simple permit and requires a daily entrance permit for every vehicle. Larger groups reserve a pavilion or apply for a special event permit. Check the county parks permits page or call the Horsetooth information center.' },
      { q: 'What is the best time of day for photos near Fort Collins?', a: 'Sunrise for Horsetooth Rock and the reservoir, which face east over the plains. Late afternoon for the Poudre Canyon, which is shaded until mid morning. Summer thunderstorms build over the foothills most afternoons, so mornings are the safer choice from June through August.' },
      { q: 'Will Fort Collins photographers travel to Estes Park?', a: 'Many photographers travel, but ask each one: Estes Park is about an hour from Fort Collins, and a travel fee may apply. The Rocky Mountain National Park wedding permit covers your photographer for the permitted period.' }
    ],
    links: [
      { href: '/guides/northern-colorado', label: 'Northern Colorado planning guide', note: 'Horsetooth, Lory, the Poudre and a sample day' },
      { href: '/venues/fort-collins-wedding-venues', label: 'Fort Collins wedding venues', note: 'Venues in and around Fort Collins' },
      { href: '/resources/colorado-state-parks-elopements', label: 'State park elopements', note: 'Special activity agreements and passes' },
      { href: '/region/northern-colorado', label: 'Every Northern Colorado vendor', note: 'Venues, florists, officiants and planners' }
    ]
  },
  {
    region: 'denver-foothills',
    place: 'Denver and the Foothills',
    term: 'denver wedding photographer',
    h1: ['Denver Elopement and Wedding Photographers', 'for the city and the foothills'],
    title: 'Denver Elopement and Wedding Photographers: {n} in Denver and the Foothills | Colorado Elopement Guide',
    description: 'Denver elopement and wedding photographers for Red Rocks, Mount Falcon, Guanella Pass and city ceremonies, with the park permits that apply to photographers.',
    intro: [
      'Denver is the practical elopement: a license downtown in the morning, a red rock park or a foothills meadow by lunch, and dinner without a mountain pass between you and the airport. The photographers we list here are based in Denver, its suburbs and the foothill towns, so most can reach Red Rocks, Golden or Evergreen inside an hour.',
      'The foothills have three main landlords, and each treats photographers differently. Denver treats a private ceremony in any Denver park, including Red Rocks Park and Lookout Mountain, as a special occasion that needs a permit applied for at least 30 days ahead. Jefferson County Open Space, which runs Mount Falcon, issues its own commercial photography and officiant permits. State parks such as Staunton and Golden Gate Canyon use a special activity agreement. Ask a photographer which of those they hold and which sites they shoot most.',
      'Light matters too. Red Rocks faces east, so the monoliths glow at sunrise; the Walker ruins on Mount Falcon catch sunset with the plains turning purple below; Guanella Pass is a sunrise site before the wind and storms arrive. September is the sweet spot, with aspens turning on the pass in the last two weeks of the month.'
    ],
    faqs: [
      { q: 'How many elopement photographers are based in Denver?', a: 'We list {n} photographers based in Denver and the foothills, ranked by Google rating and review count with any featured listings first and labeled. Statewide photographers who travel to Denver are on our Colorado elopement photographers page.' },
      { q: 'Do we need a permit for wedding photos at Red Rocks?', a: 'A private ceremony in Red Rocks Park goes through Denver\'s parks special occasion permit, applied for at least 30 days ahead; the amphitheater itself is a separate rental through Denver Arts and Venues, and the park closes early on concert days. Ask your photographer how they handle portrait sessions there.' },
      { q: 'Which foothills parks require photographer permits?', a: 'Jefferson County Open Space, which manages Mount Falcon and Lookout Mountain Nature Preserve, issues commercial permits for portrait photographers and officiants. State parks use a special activity agreement for weddings. Confirm with your photographer that their permits cover your chosen park.' },
      { q: 'What is the best season for a Denver elopement?', a: 'September and early October bring dry days and aspens on Guanella Pass. The city works year round: winter days are often sunny and mild between storms, while March and April bring Denver\'s biggest snows, so keep a backup date. Summer afternoons are hot with thunderstorms over the foothills by about 2 p.m.' }
    ],
    links: [
      { href: '/guides/denver-foothills', label: 'Denver and Foothills planning guide', note: 'Red Rocks, Mount Falcon, Guanella Pass and a sample day' },
      { href: '/resources/red-rocks-and-denver-foothills-ceremony-sites', label: 'Red Rocks and foothills permits', note: 'Denver Mountain Parks and Jeffco Open Space rules' },
      { href: '/resources/denver-marriage-license', label: 'Denver marriage license', note: 'Appointments, ID and returning the license' },
      { href: '/region/denver-foothills', label: 'Every Denver area vendor', note: 'Venues, florists, officiants and planners' }
    ]
  },
  {
    region: 'boulder',
    place: 'Boulder',
    term: 'boulder wedding photographer',
    h1: ['Boulder Elopement and Wedding Photographers', 'under the Flatirons'],
    title: 'Boulder Elopement and Wedding Photographers: {n} for Chautauqua and Flagstaff | Colorado Elopement Guide',
    description: 'Boulder elopement and wedding photographers for Chautauqua, Sunrise Amphitheater, Lost Gulch and Eldorado Canyon, with permits, light and timing advice.',
    intro: [
      'Boulder is the shortest distance between an airport and a mountain ceremony in Colorado, and the photographers we list here are based in Boulder, Longmont and the surrounding county. They work a small, well mapped set of places, which makes it easy to ask the right questions.',
      'Ask which light they want for your site. Chautauqua\'s meadow faces the Flatirons, so sunrise warms the rock while the lawn is still empty; groups under 50 need no permit there. Sunrise Amphitheater on Flagstaff Mountain looks east over the plains and is reserved through the city from May through October, with one hour blocks from 6 to 9 a.m. that are the best value in town. Lost Gulch Overlook faces west to the Continental Divide and belongs to sunset, with no reservations and a small lot. Eldorado Canyon State Park needs a special activity agreement and, on summer weekends, a timed vehicle reservation.',
      'Weather here has its own quirks. Chinook winds can gust hard in winter, March and April bring the heaviest snows, and summer storms build over the Divide by early afternoon. September and October are Boulder\'s finest weeks, with clear sunsets at Lost Gulch and aspens up the Peak to Peak Highway late in September.'
    ],
    faqs: [
      { q: 'How many elopement photographers are based in Boulder?', a: 'We list {n} photographers based in Boulder and Boulder County, ranked by Google rating and review count with any featured listings first and labeled.' },
      { q: 'Do we need a permit for photos at Chautauqua?', a: 'Groups under 50 on the Chautauqua lawn need no permit and simply follow park rules. Groups of 50 to 100 apply for the city\'s large group lawn permit, which covers four hours between 8 a.m. and 5 p.m. and does not reserve a specific patch of grass.' },
      { q: 'How do we book Sunrise Amphitheater?', a: 'Through the City of Boulder Open Space and Mountain Parks facility rentals, up to two years ahead, for dates from May 1 through October 30. One hour blocks from 6 to 9 a.m. are $100 for residents and $150 for non residents, and cars not registered in Boulder County need a $5 daily parking permit.' },
      { q: 'Is Lost Gulch good for elopement photos?', a: 'Yes, at sunset. The overlook faces west to the Indian Peaks and the Continental Divide, but there is no reservation system and the lot is small, so golden hour draws a crowd. Keep the group to a few people and choose a weekday.' }
    ],
    links: [
      { href: '/guides/boulder', label: 'Boulder planning guide', note: 'Chautauqua, Flagstaff, Lost Gulch and a sample day' },
      { href: '/venues/boulder-wedding-venues', label: 'Boulder wedding venues', note: 'Venues in Boulder and the foothills' },
      { href: '/resources/colorado-state-parks-elopements', label: 'State park elopements', note: 'Eldorado Canyon and special activity agreements' },
      { href: '/region/boulder', label: 'Every Boulder vendor', note: 'Venues, florists, officiants and planners' }
    ]
  }
];

export const LIVE_STATUSES = ['seeded', 'claimed', 'featured'];

export function photographersIn(region: string, all: any[]) {
  return all.filter(v => v.category === 'photographers' && v.sub_region === region && LIVE_STATUSES.includes(v.status));
}

// Pages that clear the threshold against the current vendor set.
export function livePhotographerPages(all: any[]) {
  return PHOTOGRAPHER_PAGES.filter(p => photographersIn(p.region, all).length >= MIN_PHOTOGRAPHERS);
}
