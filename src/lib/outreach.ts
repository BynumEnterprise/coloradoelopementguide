// Outreach Template v4, onboarding drip copy, and the naturalCheck gate every automated email passes.
import { CATEGORIES, REGIONS } from './taxonomy';
import { textToHtml } from './mail';

export const SITE_URL = 'https://coloradoelopementguide.com';
export const POSTAL_ADDRESS = '1905 Sherman Street, Ste 200 1074, Denver, CO 80203';
export const FEATURED_LINK = 'https://buy.stripe.com/7sYaEZffj1AaaWr93A9oc02';

// Phrases that read as machine written. Matched case insensitively as substrings, outside URLs.
export const AI_TELLS = [
  'I hope this email finds you well', 'I hope this finds you', 'excited to', 'thrilled', 'elevate', 'seamless',
  'delve', 'journey', 'unlock', 'leverage', 'empower', 'robust', 'cutting edge', 'game changer', "in today's",
  'look no further', "don't hesitate", 'feel free to', 'at your earliest convenience', 'as an AI',
  'I wanted to reach out', 'reaching out', 'touch base', 'circle back', 'synergy', 'landscape', 'tapestry',
  'testament', 'vibrant', 'dive into', 'navigate', "it's worth noting", 'in conclusion'
];

const DASH_RE = /[\-‐‑‒–—―]/;
const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;
const EMOJI_RE = /\p{Extended_Pictographic}/u;

// Throws when the text would read as AI generated or breaks an owner directive. Returns the text otherwise.
export function naturalCheck(text: string, label = 'text', allow: string[] = []): string {
  // Business names are allowed to contain words from the AI tell list (a vendor called Elevate Photography is not an AI tell).
  let prose = text.replace(URL_RE, ' ');
  for (const a of allow) { if (a && a.trim()) prose = prose.split(a).join(' '); }
  const m = DASH_RE.exec(prose);
  if (m) throw new Error(`naturalCheck ${label}: dash near "${prose.slice(Math.max(0, m.index - 25), m.index + 25).replace(/\s+/g, ' ')}"`);
  if (prose.includes('--')) throw new Error(`naturalCheck ${label}: double hyphen`);
  for (const bad of ['bynum', 'enterprises']) {
    if (prose.toLowerCase().includes(bad)) throw new Error(`naturalCheck ${label}: contains "${bad}"`);
  }
  const norm = prose.toLowerCase().replace(/[‘’ʼ]/g, "'");
  for (const tell of AI_TELLS) {
    if (norm.includes(tell.toLowerCase())) throw new Error(`naturalCheck ${label}: AI tell "${tell}"`);
  }
  if ((prose.match(/!/g) || []).length > 1) throw new Error(`naturalCheck ${label}: more than one exclamation mark`);
  if (EMOJI_RE.test(prose)) throw new Error(`naturalCheck ${label}: emoji`);
  if (prose.includes('**')) throw new Error(`naturalCheck ${label}: markdown bold`);
  return text;
}

// Business names as they should appear in prose: no dashes, pipes or slashes as separators, no shouting marks.
export function displayName(name: string): string {
  return String(name || '')
    .replace(/\s+[\-‐-―|/]+\s+/g, ', ')
    .replace(/[\-‐-―]+/g, ' ')
    .replace(/[|/]+/g, ', ')
    .replace(/!/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*,+/g, ',')
    .replace(/[,\s]+$/g, '')
    .trim();
}

export function categoryPlural(category: string): string {
  const c = CATEGORIES[category];
  if (!c) return 'wedding vendors';
  let p = c.name.toLowerCase().replace(/&/g, 'and').replace(/[\-‐-―]/g, ' ');
  if (category === 'hair-makeup') p += ' artists';
  return p;
}

export function regionName(sub_region: string | null | undefined): string | null {
  if (!sub_region || sub_region === 'other-colorado' || !REGIONS[sub_region]) return null;
  return REGIONS[sub_region].name.replace(/&/g, 'and').replace(/[\-‐-―]/g, ' ');
}

// "couples browsing Estes Park and RMNP elopement photographers can find you here:"
export function regionClause(sub_region: string | null | undefined, category: string): string {
  const r = regionName(sub_region);
  return r ? `couples browsing ${r} ${categoryPlural(category)} can find you here:` : 'couples planning a Colorado elopement can find you here:';
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Common US first names; an email local part that starts with one of these gets a personal greeting.
const FIRST_NAMES = new Set(('james john robert michael william david richard joseph thomas charles christopher daniel matthew anthony mark donald steven paul andrew joshua kenneth kevin brian george timothy ronald edward jason jeffrey ryan jacob gary nicholas eric jonathan stephen larry justin scott brandon benjamin samuel gregory alexander frank patrick raymond jack dennis jerry tyler aaron jose adam nathan henry douglas zachary peter kyle ethan walter noah jeremy christian keith roger terry austin sean gerald carl harold dylan arthur lawrence jordan jesse bryan billy bruce gabriel joe logan alan juan albert willie elijah wayne randy vincent mason roy ralph bobby russell bradley philip eugene ' +
  'mary patricia jennifer linda elizabeth barbara susan jessica sarah karen lisa nancy betty sandra margaret ashley kimberly emily donna michelle carol amanda melissa deborah stephanie dorothy rebecca sharon laura cynthia amy kathleen angela shirley brenda emma anna pamela nicole samantha katherine christine helen debra rachel carolyn janet maria catherine heather diane olivia julie joyce victoria ruth virginia lauren kelly christina joan evelyn judith andrea hannah megan cheryl jacqueline martha madison teresa gloria sara janice ann kathryn abigail sophia frances jean alice judy isabella julia grace amber denise danielle marilyn beverly charlotte natalie theresa diana brittany doris kayla alexis lori tiffany ' +
  'kristin kristen kristy kristi kate katie kathy cathy cate kim jen jenny jess jessie liz beth becky beckie bekah jamie jaime jackie jacki jo joey josh mike matt dave dan danny tom tommy tim timmy chris steve bill will billy bob rob robbie rick ricky rich nick nicky tony alex sam sammy ben benny jake jon greg drew jeff ken andy pat patty peg peggy sue susie suzy suzie susan deb debbie barb cindy sandy mandy molly mollie holly polly carrie kari keri carly carla carlos luis miguel jorge pedro sergio ricardo raul javier marco mario eduardo fernando roberto ana rosa elena lucia sofia camila valeria mariana gabriela daniela isabel ines lola ' +
  'aiden liam lucas oliver owen caleb isaac levi eli jude ezra asher miles max leo finn theo jasper silas wyatt hudson parker cooper carter colton brody landon grayson nolan easton bentley ava mia zoe zoey chloe ella lily lila layla leah nora ellie stella hazel violet aurora penelope aria riley avery harper addison brooklyn savannah skylar paisley everly kinsley willow ivy iris ruby eva elise elle sadie piper maggie margo greta heidi ingrid astrid freya brooke paige claire clare bridget shannon erin colleen meghan maureen tara kara dana jill jenna jenni jenn tess tessa tori toni terri sherri cheri lacey casey cassie stacy stacey tracy tracey cory corey kelsey chelsea lindsey lindsay whitney courtney kristina tina gina nina lena lana lara mara cara sara zara dara ' +
  'ryan ty tyler trevor travis troy tanner taylor tucker trent todd ted teddy tony toby terrence terrance derek darren darrell dale dean devin dustin dwayne duane brent brett brad bret blake blaine barry bart beau boyd clay clayton cliff clint cody colin collin craig curt curtis dakota dalton damon dane darin dave dawson dax drake dwight earl eddie eddy eli elliot elliott emmett evan everett ezekiel floyd forrest franklin fred freddie gavin gene glen glenn gordon grady grant graham hank harvey hayden heath hector herb howard hugh hunter ian ira irving isaiah ivan jackson jared jarrod jay jd jed jerome jim jimmy joel johnny jonah jordy judd julian kai kane karl kelvin kendall kent kirk kurt kyler lance lane lee leon leroy les leslie lloyd lonnie lorenzo lou louis luke lyle malcolm marcus marshall marty marvin maurice maxwell merle micah mitch mitchell monte morgan murray myron neal neil nelson norman oscar otis pablo perry pete phil preston quentin quinn rafael ramon randall reed reese reggie reid rex rhett riley rodney ronnie rory ross rudy rusty sal salvador sammy saul seth shane shaun shawn sid sidney simon sonny spencer stan stanley stuart tate thad theodore toby tristan vance vaughn vern vernon victor virgil wade walt warren wes wesley wilbur willis winston zach zack zane ' +
  'abby addie adele adrienne agnes aimee alana alejandra alexa alexandra alexandria ali alicia alisha alison allison allie alma alyssa amelia anita annette annie antoinette april ariel arlene ashlee ashlyn audrey autumn bailey barbie bea beatrice belinda bella bernadette bernice bertha bethany bianca blair blanca bonnie brandi brandy breanna bree brianna bridgette brigitte britney brittney caitlin caitlyn callie camille candace candice candy carina carmen carol carole caroline carolina cassandra cecilia celeste celia chandra charlene chelsey cherie cherry cheyenne christie christy claudia colette connie constance cora corinne cristina crystal daisy dallas daphne darla darlene dawn deanna dee deirdre delia della delores desiree dixie dolores dominique dora doreen edith edna eileen elaine eleanor elena eliza ellen elsa elsie emilia erica erika erma esther ethel eunice faith fay faye felicia fern flora florence fran francine gabrielle gail gayle genevieve georgia geraldine gerri gertrude gillian ginger ginny gwen gwendolyn harriet hattie hayley hilary hillary hope ida ilene imogene irene irma isabelle jade jan jana jane janelle janie janine jasmine jayne jeanette jeanine jeanne jeannie jenifer jennie jewel jillian jodi jody johanna jolene joni josephine josie joy juanita judi juliana julianne juliet juliette june kaitlin kaitlyn kara karin karina karla kasey katelyn katharine katrina kaye kayleigh keisha kellie kelli kendra kenya kerri kerry kimberley kirsten kris krista kristine krystal lacy lakisha latasha latoya laurel laurie leann leanne leigh lela lesley leticia letitia lillian lillie lilly linda lindsay lois lorena loretta lorraine lottie louise luann lucille lucinda lydia lynda lynn lynne mabel mable mackenzie madeline madeleine mae mallory mamie mandy marcia marci marcy margarita margie marguerite marian marianne marie marion marisa marissa marjorie marla marlene marsha maryann maryanne mattie maude maxine may maya meagan melanie melinda melody mercedes meredith merle mia michele mildred millie mindy minnie miranda miriam misty mona monica monique muriel myra myrtle nadia nadine nancy naomi natasha nell nellie nettie nichole nikki nina noelle noreen norma olga opal ophelia paula pauline pearl penny phoebe phyllis priscilla rachael rachelle ramona raquel reba regina renee rhonda rita roberta robin robyn rochelle rosalie rosemary rosie roxanne sabrina sadie sally sallie selena serena shana shari sharla shawna sheila shelby shelia shelley shelly sheree sheri sherry sheryl silvia simone sondra sonia sonja sonya sophie stefanie stella summer susanna susanne suzanne sybil sylvia tabitha tamara tami tammi tammy tamika tania tanya tasha tasha terra terri thelma tiffani tina tonya tracie tricia trina trisha trudy valerie vanessa velma vera verna veronica vicki vickie vicky viola vivian wanda wendi wendy wilma winifred yolanda yvette yvonne zelda').split(/\s+/));

// "Hi Julie," when the mailbox is a person; otherwise "Hi {business} team,".
export function greetingFor(email: string, business: string): string {
  const local = (String(email || '').split('@')[0] || '').toLowerCase();
  const first = local.split(/[^a-z]+/).filter(Boolean)[0] || '';
  if (first && FIRST_NAMES.has(first)) return `Hi ${cap(first)},`;
  return `Hi ${business} team,`;
}

export type OutreachVendor = {
  id: number; name: string; slug: string; category: string; sub_region: string | null;
  website?: string | null; contact_email: string; outreach_personal?: string | null;
};

export type RenderedMail = { subject: string; text: string; html: string };

// Template v4. Every automated claim invite is rendered here and gated by naturalCheck before it is sent.
export function renderV4(v: OutreachVendor): RenderedMail {
  const business = displayName(v.name);
  const plural = categoryPlural(v.category);
  const personal = (v.outreach_personal || '').trim() ||
    `Couples use the site to compare a few ${plural} in one place before they reach out, so a complete listing with a photo and a current website link matters.`;
  const subject = `Your ${business.replace(/^the\s+/i, '')} listing on Colorado Elopement Guide`;
  const text = `${greetingFor(v.contact_email, business)}

I run Colorado Elopement Guide, a site that helps couples find vendors for small Colorado weddings, organized by region. ${business} is already listed there, free, and ${regionClause(v.sub_region, v.category)}
${SITE_URL}/vendor/${v.slug}

${personal}

Couples can also send you an availability question straight from the page. If you want to take over the listing, you can fix any details, read those inquiries, and see how many couples open your page and click through to your site or phone number. That part is free as well. Your page to claim it is here:
${SITE_URL}/claim/${v.slug}

No card and no catch. If you would rather not be listed at all, reply with the word remove and I will take it down within a business day.

Thanks,
Ryan
Colorado Elopement Guide
${POSTAL_ADDRESS}

You are getting this one note because your business is publicly listed as a Colorado wedding vendor. Reply unsubscribe and you will not hear from me again.
`;
  naturalCheck(subject, `subject (${v.slug})`, [v.name, business]);
  naturalCheck(text, `body (${v.slug})`, [v.name, business]);
  return { subject, text, html: textToHtml(text) };
}

export type DripUser = {
  user_id: string; email: string; token: string; vendor_name: string; slug: string; category: string;
  sub_region: string | null; has_password: boolean; last_login_at: string | null; created_at: string;
  views_30d: number; description_len: number; vendor_status?: string; step: number;
};

const dripFooter = (token: string) => `Thanks,
Ryan
Colorado Elopement Guide
${POSTAL_ADDRESS}

You are getting a few setup reminders because you have a vendor account. Stop them here:
${SITE_URL}/api/unsub?t=${token}
`;

// Onboarding drips. Each one is plain, short, signed Ryan, and carries the unsubscribe link.
export function renderDrip(u: DripUser): RenderedMail {
  const business = displayName(u.vendor_name);
  const greeting = greetingFor(u.email, business);
  const login = `${SITE_URL}/vd/${u.token}`;
  let subject: string; let text: string;

  if (u.step === 1) {
    subject = 'Your Colorado Elopement Guide login';
    const descLine = u.description_len < 300
      ? 'Replace the description with your own words. The current one is a short placeholder.'
      : 'Read the description once more and make sure it still says what you want couples to read first.';
    text = `${greeting}

Your ${business} dashboard on Colorado Elopement Guide is set up, but nobody has signed in yet. This link signs you straight in:
${login}

Three things worth five minutes once you are in:

1. Check that your phone number and website are right. Couples tap both from your page.
2. ${descLine}
3. Look at your numbers. The dashboard shows real views and clicks, with bots filtered out.

Reply to this email if anything looks off and I will fix it.

${dripFooter(u.token)}`;
  } else if (u.step === 2) {
    subject = 'What couples see first on your listing';
    const views = Number(u.views_30d) > 0
      ? `Your page had ${Number(u.views_30d)} ${Number(u.views_30d) === 1 ? 'view' : 'views'} in the last 30 days.\n\n`
      : '';
    text = `${greeting}

When a couple lands on your ${business} page, two things get judged in about a second: the photo and the first sentence of your description.

${views}If that first sentence is a town name or a list of services, swap it for the one thing you want a couple to know about working with you. The editor is here and this link signs you in:
${login}

Your photo comes from your Google listing. If you would rather use a different one, reply with it attached and I will swap it in.

${dripFooter(u.token)}`;
  } else {
    const where = regionName(u.sub_region) || categoryPlural(u.category).replace(/ artists$/, '');
    subject = `The top spot for ${where} listings`;
    const regionPage = regionName(u.sub_region) ? `the ${regionName(u.sub_region)} page` : 'your region page';
    text = `${greeting}

A quick note on the one paid option on the site, now that ${business} has been listed for a few weeks.

Featured moves your listing to the top of the ${categoryPlural(u.category)} page, ${regionPage}, and the homepage rotation. It is always labeled Featured, so couples know it is a placement and not a ranking.

It costs 40 dollars a month. The first month is 1 dollar with the code FIRSTMONTH1, and you can cancel any time.
${FEATURED_LINK}

If the free listing is already bringing you what you need, ignore this. It stays free either way.

${dripFooter(u.token)}`;
  }
  naturalCheck(subject, `drip ${u.step} subject (${u.slug})`, [u.vendor_name]);
  naturalCheck(text, `drip ${u.step} body (${u.slug})`, [u.vendor_name]);
  return { subject, text, html: textToHtml(text) };
}

export type FollowupVendor = { id: number; name: string; slug: string; category: string; sub_region: string; contact_email: string; followups: number };

// Follow ups to vendors who never answered the claim invite. Two at most, then we leave them alone.
export function renderFollowup(v: FollowupVendor): RenderedMail {
  const business = displayName(v.name);
  const plural = categoryPlural(v.category);
  const region = regionName(v.sub_region);
  const where = region ? `${region} ${plural}` : `Colorado ${plural}`;
  let subject: string; let text: string;
  if (v.followups === 0) {
    subject = `Quick one on the ${business.replace(/^the\s+/i, '')} listing`;
    text = `${greetingFor(v.contact_email, business)}

I wrote a few days ago about the free ${business} listing on Colorado Elopement Guide. No pressure either way, I know inboxes get buried.

The short version: the listing is already live for couples looking at ${where}, and taking it over lets you fix the details, add photos, and see how many couples open your page and click through to your site. It takes about a minute and there is no card involved:
${SITE_URL}/claim/${v.slug}

If you would rather I leave it alone, no reply needed. If you want it gone, reply remove and I will take it down.

Thanks,
Ryan
Colorado Elopement Guide
${POSTAL_ADDRESS}

Reply unsubscribe and you will not hear from me again.
`;
  } else {
    subject = `Last note from me about ${business.replace(/^the\s+/i, '')}`;
    text = `${greetingFor(v.contact_email, business)}

This is the last time I will write about this, so I will keep it short. Your free ${business} listing stays up either way at ${SITE_URL}/vendor/${v.slug} and couples can find you there.

If you ever want to manage it yourself, add photos, or check how many couples are clicking through to you, the page to claim it is ${SITE_URL}/claim/${v.slug} and it stays free.

Thanks for reading, and best of luck with the season.

Ryan
Colorado Elopement Guide
${POSTAL_ADDRESS}

Reply remove to take the listing down, or unsubscribe to stop emails.
`;
  }
  naturalCheck(subject, `followup subject (${v.slug})`, [v.name, business]);
  naturalCheck(text, `followup body (${v.slug})`, [v.name, business]);
  return { subject, text, html: textToHtml(text) };
}

// ---------- Couple inquiries (vendor lead form) and the Featured slot cap ----------

export const FEATURED_CAP = 3;

// Short place names for the slot line: "2 of 3 Featured spots open for Estes Park photographers".
const REGION_SHORT: Record<string, string> = {
  'estes-park': 'Estes Park', 'summit-county': 'Summit County', 'vail-aspen': 'Vail and Aspen',
  'telluride-san-juans': 'Telluride and the San Juans', 'colorado-springs': 'Colorado Springs', 'boulder': 'Boulder',
  'denver-foothills': 'Denver and the foothills', 'northern-colorado': 'Northern Colorado'
};
const CATEGORY_SHORT: Record<string, string> = {
  photographers: 'photographers', venues: 'venues', florists: 'florists', 'hair-makeup': 'hair and makeup artists',
  officiants: 'officiants', planners: 'planners'
};

export function slotLine(open: number, category: string, sub_region: string): string {
  const cat = CATEGORY_SHORT[category] || 'vendors';
  const where = sub_region === 'other-colorado' || !REGION_SHORT[sub_region] ? `${cat} statewide` : `${REGION_SHORT[sub_region]} ${cat}`;
  return `${open} of ${FEATURED_CAP} Featured spots open for ${where}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function fmtDateLong(iso: string | null | undefined): string | null {
  const m = /^(\d{4})(?:\D(\d{2})\D(\d{2}))?/.exec(iso || ''); if (!m || !m[2]) return null;
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}
export function fmtMonthYear(iso: string | null | undefined): string | null {
  const m = /^(\d{4})\D(\d{2})/.exec(iso || ''); if (!m) return null;
  return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

export type InquiryIn = { slug: string; vendorName: string; names: string; email: string; weddingDate: string | null; guests: number | null; message: string; sub_region: string; category: string };

// Full inquiry to a claimed or Featured vendor's account email. Reply To is the couple.
export function inquiryVendorEmail(q: InquiryIn): { subject: string; text: string; html: string } {
  const business = displayName(q.vendorName);
  const subject = `New inquiry from ${q.names} via Colorado Elopement Guide`;
  const text = `Hello ${business},

A couple sent this through your listing on Colorado Elopement Guide. Reply to this email and your answer goes straight to them at ${q.email}.

Names: ${q.names}
Email: ${q.email}
Wedding date: ${fmtDateLong(q.weddingDate) || 'not given'}
Guests: ${q.guests ?? 'not given'}

Their message:
${q.message}

Every inquiry also stays in your dashboard, where you can manage email from us: ${SITE_URL}/vendor-dashboard

Colorado Elopement Guide
${POSTAL_ADDRESS}
`;
  const allow = [q.vendorName, business, q.names, q.email, q.message];
  naturalCheck(subject, `inquiry subject (${q.slug})`, allow);
  naturalCheck(text, `inquiry body (${q.slug})`, allow);
  return { subject, text, html: textToHtml(text) };
}

// Short notice to an unclaimed listing: no couple contact details, the full message waits behind the free claim.
export function inquiryNoticeEmail(q: InquiryIn): { subject: string; text: string; html: string } {
  const business = displayName(q.vendorName);
  const when = fmtMonthYear(q.weddingDate);
  const region = regionName(q.sub_region);
  const details = [
    when ? `Wedding: ${when}` : null,
    q.guests ? `Guests: ${q.guests}` : null,
    `Region: ${region || 'Colorado'}`
  ].filter(Boolean).join('\n');
  const subject = `A couple asked about availability with ${business}`;
  const text = `Hello,

A couple asked about your availability${when ? ` for ${when}` : ''} through the free ${business} listing on Colorado Elopement Guide.

${details}

Claim the free listing to read their message and reply: ${SITE_URL}/vendor-dashboard?vendor=${q.slug}

The full inquiry waits in your dashboard. Claiming costs nothing and takes about a minute.

Colorado Elopement Guide
${POSTAL_ADDRESS}

Reply unsubscribe and we will not email you again.
`;
  const allow = [q.vendorName, business];
  naturalCheck(subject, `inquiry notice subject (${q.slug})`, allow);
  naturalCheck(text, `inquiry notice body (${q.slug})`, allow);
  return { subject, text, html: textToHtml(text) };
}

// ---------- Founding Featured offer and the one time activation note to claimed vendors ----------

// The first 10 Featured vendors keep $40 a month for as long as they stay subscribed.
// Spots left are computed from the live featured count (ceg_public_stats), never hard coded.
export const FOUNDING_CAP = 10;
export function foundingLine(left: number): string {
  const n = Math.max(0, Math.min(FOUNDING_CAP, Math.floor(Number(left) || 0)));
  return `${n} of ${FOUNDING_CAP} founding spots left`;
}

export type ActivationUser = {
  user_id: string; email: string; token: string; vendor_name: string; slug: string;
  category: string; sub_region: string | null; vendor_status: string; views_30d: number;
};

// Drip step 10. Short, plain, signed Ryan, with the mailbox address and a one line opt out.
export function renderActivation(u: ActivationUser, foundingLeft: number): RenderedMail {
  const business = displayName(u.vendor_name);
  const greeting = greetingFor(u.email, business);
  const n = Number(u.views_30d) || 0;
  const views = n === 0
    ? 'Your page had no views in the last 30 days, so the chart has room to grow.'
    : `Your page had ${n} ${n === 1 ? 'view' : 'views'} in the last 30 days.`;
  const left = Math.max(0, Math.min(FOUNDING_CAP, Math.floor(Number(foundingLeft) || 0)));
  const featuredLine = u.vendor_status === 'featured'
    ? 'You are already Featured, and your 40 dollar price stays the same for as long as you stay subscribed.'
    : `Featured is 40 dollars a month, and the first ${FOUNDING_CAP} Featured vendors keep that price for as long as they stay subscribed. ${left === FOUNDING_CAP ? `All ${FOUNDING_CAP} spots are open` : `${left} of those ${FOUNDING_CAP} spots are open`}. The first month is 1 dollar with the code FIRSTMONTH1.`;
  const subject = `What is new on your ${business} listing`;
  const text = `${greeting}

A few things changed since ${business} joined Colorado Elopement Guide.

Couples can now send you an inquiry from your page, and it comes to your email so you can reply directly.
Your dashboard has a 30 day traffic chart and shows where you rank among ${categoryPlural(u.category)} on the site.
There is a small badge for your website that links to your listing.
${featuredLine}

${views}

${SITE_URL}/vendor-dashboard

Ryan
Colorado Elopement Guide
${POSTAL_ADDRESS}

Prefer no more updates? ${SITE_URL}/api/unsub?t=${u.token}
`;
  naturalCheck(subject, `activation subject (${u.slug})`, [u.vendor_name]);
  naturalCheck(text, `activation body (${u.slug})`, [u.vendor_name]);
  return { subject, text, html: textToHtml(text) };
}
