// Venue list landing pages (/venues/{slug}). Copy is hand written per town.
// Matching is done at build time against the live vendor collection; a page only
// builds when at least MIN_VENUES live venues match (see matchVenues).
export const MIN_VENUES = 6;

export type VenuePage = {
  slug: string;
  town: string;               // display name used in headings and links
  term: string;               // target search term
  volume: number;             // monthly US searches (CONTENT-MAP.md, 2026-10-10)
  region: string;             // sub_region in p2_vendors
  towns?: string[];           // primary towns (address town); shown first
  strictTowns?: boolean;      // only list venues whose address town is in towns
  groups?: string[];          // multi region page: one section per sub_region
  pick?: string[];            // curated page: only these vendor slugs (still must be live)
  h1: [string, string];       // [plain, italic]
  title: string;              // {n} is replaced with the venue count
  description: string;        // under 160 characters
  guide?: string;             // /guides/{guide}
  permit?: { href: string; label: string };
  intro: string[];            // paragraphs, may contain anchors
  choose: { h: string; p: string }[];
  faqs: { q: string; a: string }[]; // {n} replaced with venue count; plain text
};

export function addressTown(address: string | null | undefined): string | null {
  if (!address) return null;
  const parts = address.split(',').map(s => s.trim());
  return parts.length >= 2 ? parts[parts.length - 2] : null;
}

export function matchVenues(page: VenuePage, all: any[]) {
  const live = all.filter(v => v.category === 'venues' && ['seeded', 'claimed', 'featured'].includes(v.status));
  if (page.pick) {
    const picked = live.filter(v => page.pick!.includes(v.slug));
    return page.groups ? picked.filter(v => page.groups!.includes(v.sub_region)) : picked;
  }
  if (page.groups) return live.filter(v => page.groups!.includes(v.sub_region));
  const inRegion = live.filter(v => v.sub_region === page.region);
  if (page.strictTowns && page.towns) return inRegion.filter(v => page.towns!.includes(addressTown(v.address) || ''));
  return inRegion;
}

export const VENUE_PAGES: VenuePage[] = [
  {
    slug: 'estes-park-wedding-venues',
    town: 'Estes Park',
    term: 'estes park wedding venues',
    volume: 2400,
    region: 'estes-park',
    towns: ['Estes Park'],
    h1: ['Estes Park Wedding Venues', 'for Elopements and Small Weddings'],
    title: 'Estes Park Wedding Venues: {n} Venues for Elopements and Small Weddings | Colorado Elopement Guide',
    description: 'Estes Park wedding venues for elopements and small weddings: lodges, chapels and inns by Rocky Mountain National Park, plus permit and booking advice.',
    guide: 'estes-park',
    permit: { href: '/resources/rocky-mountain-national-park-wedding-permit', label: 'Rocky Mountain National Park wedding permit' },
    intro: [
      'Estes Park sits at about 7,500 feet at the east entrance of Rocky Mountain National Park, and that one fact shapes every venue decision you make here. Most couples who search for a venue in Estes Park are really choosing between two kinds of day: a ceremony inside the park at a designated site with a short guest list, or a private venue in the valley where you control the decor, the music and the clock.',
      'The park route is simple and strict. The <a href="/resources/rocky-mountain-national-park-wedding-permit">Rocky Mountain National Park wedding permit</a> covers named ceremony sites only, caps the group at 30 people and rules out arches and decorations. That is why so many small weddings here pair a park ceremony at sunrise with a lodge, inn or chapel in town for the dinner. The venues below make that easy, because nearly all of them are ten or fifteen minutes from a park entrance.',
      'Seasons matter more than in the city. June through early October is the main window, and summer afternoons bring thunderstorms often enough that an indoor room or a covered deck is a real requirement, not a nice extra. September and early October bring golden aspens and elk in the meadows around town, along with the heaviest traffic of the year. Winter is quiet, cheaper to book and genuinely beautiful, but Trail Ridge Road closes for the season and some lodges run reduced hours, so confirm the date before you fall for a photo.',
      'A small wedding in Estes Park tends to feel like a weekend rather than an evening. Guests stay in cabins along the Fall River or the Big Thompson, you walk the riverwalk downtown, and the reception is often a long table rather than a dance floor. A few venues on this list sit just outside town in Allenspark, Lyons and Grand Lake, which give you more privacy and a different side of the park. Your license comes from the Larimer County Clerk, which keeps an office in Estes Park by appointment; the <a href="/guides/estes-park">Estes Park planning guide</a> covers the ceremony sites, timing and a sample day.'
    ],
    choose: [
      { h: 'Count your real guest list', p: 'If you plan to marry inside the park, everyone including the photographer and officiant counts toward the 30 person cap. Pick a venue whose smallest room still feels full with your number.' },
      { h: 'Ask about the storm plan', p: 'Summer storms usually build after lunch. A morning ceremony or a venue with a covered deck or indoor room keeps the day on schedule.' },
      { h: 'Look for lodging on site', p: 'Several inns and resorts here have cabins or rooms for your guests, which removes the late drive on dark mountain roads.' },
      { h: 'Decide park or private land first', p: 'The park permit forbids decorations and limits time on site. If you want an arch, florals or amplified music, choose a private venue for the ceremony itself.' },
      { h: 'Check the drive to your photo spots', p: 'Bear Lake, Sprague Lake and the Moraine Park overlooks are each a different drive from town. Ask your photographer which venue makes the timeline easiest.' }
    ],
    faqs: [
      { q: 'How many wedding venues are listed in Estes Park?', a: 'We list {n} live wedding venues in Estes Park and the nearby towns of Allenspark, Lyons and Grand Lake, ranked by Google rating and review count. Featured venues are shown first and labeled.' },
      { q: 'Can we get married inside Rocky Mountain National Park?', a: 'Yes, at designated ceremony sites with a special use permit from the park. Groups are capped at 30 people and decorations such as arches are not allowed, which is why many couples hold the reception at a private venue in town.' },
      { q: 'When is the best time of year for an Estes Park wedding?', a: 'Mid June through early October is the main season. Plan for afternoon thunderstorms in July and August, and expect heavy visitor traffic during the September and October elk season. Winter is quieter but Trail Ridge Road is closed.' },
      { q: 'Where do we get a marriage license for Estes Park?', a: 'From the Larimer County Clerk, which has an Estes Park office by appointment. A Colorado license can be issued by any county clerk in the state and must be used within 35 days.' }
    ]
  },
  {
    slug: 'colorado-springs-wedding-venues',
    town: 'Colorado Springs',
    term: 'colorado springs wedding venues',
    volume: 2400,
    region: 'colorado-springs',
    towns: ['Colorado Springs'],
    h1: ['Colorado Springs Wedding Venues', 'for Elopements and Small Weddings'],
    title: 'Colorado Springs Wedding Venues: {n} Venues for Small Weddings | Colorado Elopement Guide',
    description: 'Colorado Springs wedding venues for elopements and small weddings, from Garden of the Gods to Manitou Springs and the Pikes Peak foothills.',
    guide: 'colorado-springs',
    permit: { href: '/resources/garden-of-the-gods-elopement', label: 'Garden of the Gods ceremony rules' },
    intro: [
      'Colorado Springs is the most accessible big scenery wedding in the state. The city sits at about 6,000 feet with Pikes Peak filling the western sky, the Colorado Springs airport is roughly twenty minutes from downtown, and the climate is mild enough that a January date is a reasonable plan rather than a gamble. For a small wedding, that combination means guests can fly in Friday, see red rock Saturday morning and be home Sunday.',
      'Many couples here split the day. The ceremony happens at Garden of the Gods, which is a free city park with designated wedding areas on a first come basis and no decorations allowed; the <a href="/resources/garden-of-the-gods-elopement">Garden of the Gods ceremony rules</a> explain the group caps and what needs a permit. Dinner and the rest of the celebration then move to one of the venues below, where you can bring flowers, a cake and a playlist.',
      'The venue mix is wider than in the mountain towns. You will find historic hotels downtown, a grand resort at the foot of Cheyenne Mountain, garden spaces near Old Colorado City, the Victorian inn in Manitou Springs, and ranch and forest properties north toward Palmer Lake, Larkspur and Black Forest or west in Woodland Park. The ranch venues trade a longer drive for privacy and big open views; the city venues trade some scenery for walkable restaurants and hotels.',
      'Spring and fall are the sweet spots: April through early June and September through October bring cool mornings and soft light. Summer afternoons can bring thunderstorms and heavy crowds at the park, so an early ceremony with a covered fallback at your venue is the safer plan. Licenses come from the El Paso County Clerk, with a main office downtown. The <a href="/guides/colorado-springs">Colorado Springs planning guide</a> walks through ceremony spots, timing and a sample day.'
    ],
    choose: [
      { h: 'Match the room to your number', p: 'Several venues here are built for large receptions. Ask for the smallest room or a weekday package so twenty guests do not look lost in a ballroom.' },
      { h: 'Plan an indoor backup', p: 'Afternoon storms roll off Pikes Peak in summer. Make sure the venue has a covered or indoor ceremony option you would actually be happy to use.' },
      { h: 'Consider lodging on site', p: 'Resorts and historic hotels let guests walk from room to reception. Ranch venues may require a shuttle or a designated driver.' },
      { h: 'Decide park or private ceremony', p: 'Garden of the Gods is free and first come with no decor. If you want an arch, chairs or florals at the ceremony, hold it at the venue instead.' },
      { h: 'Map the photo stops', p: 'Garden of the Gods, Manitou Springs and the Cheyenne Mountain area are close together. A venue on the west side keeps travel between them short.' }
    ],
    faqs: [
      { q: 'How many wedding venues are listed in Colorado Springs?', a: 'We list {n} live wedding venues in Colorado Springs and the surrounding area, including Manitou Springs, Woodland Park, Palmer Lake and Larkspur. They are ranked by Google rating and review count, with any Featured venues shown first.' },
      { q: 'Do we need a permit to get married at Garden of the Gods?', a: 'Small ceremonies in the designated wedding areas are free and first come, with no decorations allowed. Larger groups and anything beyond a simple ceremony fall under the city rules described on our Garden of the Gods page.' },
      { q: 'What is the best season for a Colorado Springs wedding?', a: 'April through early June and September through October offer the most comfortable weather. Sunrise ceremonies work year round, and winter is often mild enough for an outdoor ceremony.' },
      { q: 'Where do we get a marriage license in Colorado Springs?', a: 'From the El Paso County Clerk, which has a downtown office and branch offices. Any Colorado county clerk can issue the license, and it must be used within 35 days.' }
    ]
  },
  {
    slug: 'boulder-wedding-venues',
    town: 'Boulder',
    term: 'boulder wedding venues',
    volume: 1000,
    region: 'boulder',
    towns: ['Boulder'],
    h1: ['Boulder Wedding Venues', 'for Elopements and Small Weddings'],
    title: 'Boulder Wedding Venues: {n} Venues for Elopements and Small Weddings | Colorado Elopement Guide',
    description: 'Boulder wedding venues for elopements and small weddings: Chautauqua, Flagstaff Mountain, historic hotels and canyon lodges under the Flatirons.',
    guide: 'boulder',
    permit: { href: '/guides/boulder', label: 'Boulder ceremony permits and Sunrise Amphitheater' },
    intro: [
      'Boulder is where the plains stop and the Flatirons begin, and its wedding venues follow that line. Within fifteen minutes of downtown you can choose between a historic hotel on a walkable street, a dining hall at the foot of the Flatirons, a stone amphitheater on top of Flagstaff Mountain, or a lodge tucked into Boulder Canyon or Four Mile Canyon. Denver International is about 45 minutes away, which makes Boulder one of the easiest mountain feeling weddings for guests who are flying in.',
      'The city is unusually clear about its public land. The Chautauqua lawn needs no permit for a small group under 50, and Sunrise Amphitheater on Flagstaff Mountain can be reserved through the city from May to October. Lost Gulch Overlook is a public overlook rather than a bookable venue, so plan on sunrise or a weekday if you want it to yourself. The <a href="/guides/boulder">Boulder planning guide</a> covers the permit details, the overlooks and the timing.',
      'For the reception, small weddings in Boulder lean toward food. Several of the venues below are restaurants or hotels with private dining rooms that comfortably seat a long table of twenty to forty, and the farm to table culture here is the real thing. A few larger event spaces sit east of town in Lafayette and Broomfield; they work well if your list is closer to fifty or you want a single place for ceremony and dinner.',
      'Boulder has a long season. May through October works for Flagstaff and the canyon, September brings warm days and some early color, and winter weddings at Chautauqua can be clear and bright between storms. Summer afternoons often bring thunderstorms over the foothills, so a morning ceremony or an indoor option is worth confirming. Licenses come from the Boulder County Clerk, with offices in Boulder, Longmont and Lafayette.'
    ],
    choose: [
      { h: 'Ask for the small room', p: 'Hotels and restaurants here often have private dining rooms for twenty to forty guests. That is usually a better fit than the main ballroom.' },
      { h: 'Have a plan for afternoon storms', p: 'Clouds build over the foothills most summer afternoons. Choose a morning ceremony or confirm the indoor fallback before you sign.' },
      { h: 'Keep guests close', p: 'Downtown hotels let everyone walk from ceremony to dinner. Canyon lodges are quieter but mean a drive on a winding road after dark.' },
      { h: 'Decide on public land or private', p: 'Chautauqua and Sunrise Amphitheater are public spaces with their own rules. A private venue is the easier choice if you want decor, music or a long timeline.' },
      { h: 'Think about the photo spots', p: 'Chautauqua, Flagstaff Road and Lost Gulch are all on the west edge of town. A venue nearby gives you time for portraits before the light goes.' }
    ],
    faqs: [
      { q: 'How many wedding venues are listed in Boulder?', a: 'We list {n} live wedding venues in Boulder and nearby Lafayette and Broomfield, ranked by Google rating and review count. Any Featured venues are shown first and labeled.' },
      { q: 'Do we need a permit to get married at Chautauqua in Boulder?', a: 'The city does not require a permit for a small group under 50 on the Chautauqua lawn. Sunrise Amphitheater on Flagstaff Mountain is reserved through the City of Boulder from May to October.' },
      { q: 'What is the best time of year for a Boulder wedding?', a: 'May through October is the main season for Flagstaff Mountain and the canyons, with September often the most settled month. Chautauqua and downtown venues work year round.' },
      { q: 'Where do we get a marriage license in Boulder?', a: 'From the Boulder County Clerk and Recorder, which has offices in Boulder, Longmont and Lafayette. The license must be used within 35 days.' }
    ]
  },
  {
    slug: 'denver-wedding-venues',
    town: 'Denver',
    term: 'small wedding venues denver',
    volume: 140,
    region: 'denver-foothills',
    towns: ['Denver'],
    h1: ['Denver Wedding Venues', 'for Elopements and Small Weddings'],
    title: 'Denver Wedding Venues: {n} Small Wedding Venues in Denver and the Foothills | Colorado Elopement Guide',
    description: 'Denver wedding venues for elopements and small weddings: foothills mansions, mountain lodges and garden spaces from Golden to Evergreen and Morrison.',
    guide: 'denver-foothills',
    permit: { href: '/guides/denver-foothills', label: 'Denver and Jefferson County park permits' },
    intro: [
      'Denver is the practical choice for a small wedding in Colorado. You can pick up your license downtown in the morning, be in the foothills before lunch and sit down to a serious dinner that evening without crossing a mountain pass. Denver International is about 35 minutes from downtown and 45 from Golden, so guests who fly in lose very little of the weekend to driving.',
      'Most of the venues on this list are not downtown at all. They sit in the foothills west and south of the city: a mansion on Lookout Mountain above Golden, a lake house in Evergreen, ranches and estates around Morrison, Pine and Idaho Springs, and garden spaces in Littleton and Castle Rock. That spread is the point. You can choose a venue that feels like the mountains while staying within an hour of a hotel near the airport.',
      'Public ceremony sites around Denver come with their own landlords. Denver Mountain Parks, which include Red Rocks, require a special occasion permit about 30 days ahead, and Jefferson County Open Space has its own rules for commercial photographers and officiants. A private venue avoids all of that and gives you full control over chairs, flowers and music. The <a href="/guides/denver-foothills">Denver and foothills planning guide</a> lays out each park and its permit.',
      'The city side of the region works year round, and the foothills venues are at their best from May through October. Summer afternoons often bring thunderstorms over the foothills, so check the covered or indoor option at any outdoor venue. A Denver small wedding often looks like a ceremony in the foothills at golden hour followed by dinner at the venue, with guests staying in Golden or downtown. Licenses come from the Denver Clerk and Recorder downtown or the Jefferson County Clerk in Golden.'
    ],
    choose: [
      { h: 'Look past the ballroom', p: 'Several foothills venues host large weddings on weekends. Ask about weekday dates or a smaller space if your group is under fifty.' },
      { h: 'Confirm the weather fallback', p: 'Storms build over the foothills on summer afternoons. A covered ceremony site or an indoor room you like keeps the plan intact.' },
      { h: 'Weigh lodging against location', p: 'Few foothills venues have rooms on site. Golden and downtown Denver hotels are the usual base, so check the drive time at night.' },
      { h: 'Know which park needs which permit', p: 'Red Rocks and other Denver Mountain Parks need a special occasion permit. A private venue removes the paperwork entirely.' },
      { h: 'Plan the portrait drive', p: 'Lookout Mountain, Red Rocks and Evergreen Lake are close to several venues on this list. Pick one that keeps your photographer within twenty minutes.' }
    ],
    faqs: [
      { q: 'How many wedding venues are listed for Denver?', a: 'We list {n} live wedding venues in Denver and the foothills, including Golden, Evergreen, Morrison, Littleton and Castle Rock, ranked by Google rating and review count. Featured venues are shown first.' },
      { q: 'Can we get married at Red Rocks?', a: 'Red Rocks Park is a Denver Mountain Park, and ceremonies there require a special occasion permit from Denver Parks and Recreation, generally requested about 30 days ahead. Our Denver planning guide covers the details.' },
      { q: 'What is the best time of year for a Denver area wedding?', a: 'May through October suits the foothills venues and the mountain passes. Venues in the city and lower foothills host weddings year round.' },
      { q: 'Where do we get a marriage license near Denver?', a: 'From the Denver Clerk and Recorder downtown or the Jefferson County Clerk in Golden. A Colorado license from any county is valid statewide and must be used within 35 days.' }
    ]
  },
  {
    slug: 'fort-collins-wedding-venues',
    town: 'Fort Collins',
    term: 'fort collins wedding venues',
    volume: 720,
    region: 'northern-colorado',
    towns: ['Fort Collins'],
    h1: ['Fort Collins Wedding Venues', 'for Elopements and Small Weddings'],
    title: 'Fort Collins Wedding Venues: {n} Venues in Northern Colorado | Colorado Elopement Guide',
    description: 'Fort Collins wedding venues for elopements and small weddings: Old Town hotels, historic houses, ranches in Loveland and spaces near Horsetooth.',
    guide: 'northern-colorado',
    permit: { href: '/guides/northern-colorado', label: 'Horsetooth and Lory State Park ceremony permits' },
    intro: [
      'Fort Collins is close, relaxed and much less crowded than the mountain towns an hour to the west. Old Town has historic hotels, a brewery on every other block and restaurants that handle a private dinner for twenty without blinking. Horsetooth Reservoir and Lory State Park sit just west of the city, and the Poudre Canyon climbs into the mountains from the north edge of town. Denver International is about an hour and fifteen minutes away.',
      'The venues below cover a wide range. In town you will find boutique hotels on College Avenue, a historic house near Old Town and smaller spaces with a neighborhood feel. To the south and east, Loveland, Windsor and Severance offer ranches, wineries and event centers with open views of the Front Range; one sits on the Big Thompson River at the mouth of its canyon. Laporte, at the edge of the foothills, adds a garden venue near the Poudre.',
      'Public land here is easy to work with. Larimer County manages Horsetooth with a simple permit for small ceremonies and a pavilion or special event permit for larger groups, and Lory State Park uses a special activity agreement. Many couples hold a sunrise ceremony on a ridge above the reservoir and then move to one of these venues for brunch or dinner. The <a href="/guides/northern-colorado">Northern Colorado planning guide</a> covers each site and permit.',
      'May through early October is the main season, and late September brings color to the canyon. Summer afternoons regularly bring thunderstorms, so an indoor or covered space matters for evening receptions. A Fort Collins small wedding usually feels like a long, easy weekend: a brewery welcome night, a short ceremony, a good meal and a walk through Old Town. Licenses come from the Larimer County Clerk, which takes walk ins in Fort Collins and appointments in Loveland.'
    ],
    choose: [
      { h: 'Size the room to your guest list', p: 'A few venues here are built for large events. For a group under forty, ask about the smallest room or a private dining space.' },
      { h: 'Check the indoor option', p: 'Afternoon storms are common from June through August. Make sure the ceremony can move indoors without losing the feel of the day.' },
      { h: 'Think about where guests sleep', p: 'Old Town hotels let everyone walk to dinner. Ranch and winery venues in Loveland and Windsor usually mean a shuttle or a short drive.' },
      { h: 'Pick park permit or private venue', p: 'Horsetooth and Lory State Park each have their own permit. A private venue is simpler if you want decor, music or a long timeline.' },
      { h: 'Plan around the canyon light', p: 'Horsetooth faces east and is best at sunrise. The Poudre Canyon is at its best late in the day. Choose a venue that fits the time you want portraits.' }
    ],
    faqs: [
      { q: 'How many wedding venues are listed in Fort Collins?', a: 'We list {n} live wedding venues in Fort Collins and Northern Colorado, including Loveland, Windsor, Laporte and Severance, ranked by Google rating and review count. Featured venues appear first.' },
      { q: 'Can we get married at Horsetooth Reservoir?', a: 'Yes. Larimer County offers a simple permit for small ceremonies in its parks and a pavilion or special event permit for larger groups. Lory State Park next door uses a state special activity agreement.' },
      { q: 'When is the best time for a Fort Collins wedding?', a: 'May through early October is the main season, with late September bringing fall color to the Poudre Canyon. Old Town venues host small weddings year round.' },
      { q: 'Where do we get a marriage license in Fort Collins?', a: 'From the Larimer County Clerk, which accepts walk ins at its Fort Collins office and appointments in Loveland. The license must be used within 35 days.' }
    ]
  },
  {
    slug: 'vail-wedding-venues',
    town: 'Vail',
    term: 'vail wedding venues',
    volume: 880,
    region: 'vail-aspen',
    towns: ['Vail', 'Avon'],
    strictTowns: true,
    h1: ['Vail Wedding Venues', 'for Elopements and Small Weddings'],
    title: 'Vail Wedding Venues: {n} Venues in Vail, Beaver Creek and Avon | Colorado Elopement Guide',
    description: 'Vail wedding venues for elopements and small weddings: alpine gardens, village hotels and Beaver Creek lodges, with permit and timing advice.',
    guide: 'vail-aspen',
    permit: { href: '/resources/national-forest-and-blm-elopements', label: 'national forest ceremony rules' },
    intro: [
      'Vail Village sits at about 8,150 feet in a narrow valley along Gore Creek, with the ski mountain rising directly behind it. For a small wedding, that layout is the appeal: your hotel, your ceremony and your dinner can all be a short walk apart, and the gondola puts a mountaintop within reach of guests who would never hike to one. Eagle County Regional Airport is about 35 minutes away, and Denver is roughly two hours in good weather.',
      'The venues below are in Vail itself and down valley in Avon and Beaver Creek. In Vail you will find the alpine gardens and the outdoor amphitheater in Ford Park, the village hotels with terraces over the creek, and the resort itself. In Avon and Beaver Creek the options lean toward large resorts with smaller spaces for intimate groups, including a mountainside hotel at Bachelor Gulch.',
      'Much of the land around Vail is White River National Forest. A small ceremony on forest land generally needs no permit, but larger gatherings and commercial vendors may; our <a href="/resources/national-forest-and-blm-elopements">national forest ceremony guide</a> explains the 75 person rule. The resort venues handle all of that for you and add an indoor fallback, which matters here because summer storms build most afternoons above treeline.',
      'Summer runs from late June to early October, and the aspens usually turn in the second half of September. Winter weddings are a real option in Vail in a way they are not in most of the state: the lifts are running, the village is lit and the hotels are set up for snow. Shoulder months in spring and late fall are quiet, and some venues close or reduce service. Licenses come from the Eagle County Clerk, with offices in Eagle and El Jebel. The <a href="/guides/vail-aspen">Vail and Aspen planning guide</a> covers ceremony sites and timing on both sides of the valley.'
    ],
    choose: [
      { h: 'Ask for the intimate space', p: 'Big resorts here have terraces, private dining rooms and small lawns that suit twenty or thirty guests better than the main ballroom.' },
      { h: 'Confirm the storm plan', p: 'Afternoon thunderstorms are common above treeline in summer. A morning ceremony or a covered terrace keeps the gondola and the photos on schedule.' },
      { h: 'Use the lodging on site', p: 'Most venues on this list are hotels, which means guests walk to the ceremony and no one drives a mountain road after dinner.' },
      { h: 'Know whose land you are on', p: 'Resort and forest land each have their own rules. Ask the venue whether a mountaintop ceremony needs a separate permit or lift ticket.' },
      { h: 'Plan the drive to photo spots', p: 'Vail Pass, the top of the gondola and Beaver Creek are close. Maroon Bells is near Aspen, about two hours away, so plan it as a separate day.' }
    ],
    faqs: [
      { q: 'How many wedding venues are listed in Vail?', a: 'We list {n} live wedding venues in Vail, Avon and Beaver Creek, ranked by Google rating and review count. Featured venues are shown first and labeled.' },
      { q: 'Can we have a winter wedding in Vail?', a: 'Yes. Vail is one of the few Colorado towns where winter weddings are routine, because the village hotels and the resort are fully open in ski season. Spring and late fall shoulder seasons are when some venues reduce service.' },
      { q: 'Do we need a permit to marry on national forest land near Vail?', a: 'Small noncommercial gatherings on national forest land generally do not need a special use permit, while groups of 75 or more do. Check our national forest page and ask the ranger district if your plans are close to that line.' },
      { q: 'Where do we get a marriage license for Vail?', a: 'From the Eagle County Clerk, with offices in Eagle and El Jebel. The license must be used within 35 days.' }
    ]
  },
  {
    slug: 'aspen-wedding-venues',
    town: 'Aspen',
    term: 'aspen wedding venues',
    volume: 880,
    region: 'vail-aspen',
    towns: ['Aspen', 'Snowmass Village', 'Redstone Historic District'],
    strictTowns: true,
    h1: ['Aspen Wedding Venues', 'for Elopements and Small Weddings'],
    title: 'Aspen Wedding Venues: {n} Venues in Aspen and Snowmass | Colorado Elopement Guide',
    description: 'Aspen wedding venues for elopements and small weddings: historic hotels, a ranch on Maroon Creek Road and Snowmass, plus Maroon Bells permit tips.',
    guide: 'vail-aspen',
    permit: { href: '/resources/maroon-bells-elopement-permit', label: 'Maroon Bells Amphitheater reservation' },
    intro: [
      'Aspen is a small town with an outsized hotel scene, and that shapes its wedding venues. The list below is heavy on historic and luxury hotels within a few blocks of each other downtown, along with the ski mountain, a riverside memorial garden, a ranch on Maroon Creek Road, Snowmass Village up the road and a historic lodge in Redstone in the Crystal River Valley. Aspen Pitkin County Airport is about fifteen minutes from town, though weather delays are common, and Denver is three to four hours by car.',
      'Most couples who search for Aspen venues are thinking about the Maroon Bells. The amphitheater at Maroon Lake is reserved on Recreation.gov, with Friday and Saturday ceremonies blocked from June through August and Friday through Sunday blocked in September; the road closes to cars in winter. Our <a href="/resources/maroon-bells-elopement-permit">Maroon Bells reservation guide</a> covers the shuttle, fees and blackout days. A common plan is a weekday ceremony at the Bells followed by dinner at one of the hotels below.',
      'Small weddings in Aspen tend to be polished. Hotel event teams here are used to private dinners for twenty, rooftop terraces and next day brunches, and many of them can arrange florals and transportation. If you want something more rustic, the ranch venues and Redstone give you open space and a slower pace at the cost of a longer drive back to town.',
      'Summer runs from late June to early October, and the aspen groves along Castle Creek and Maroon Creek usually peak in the second half of September. Independence Pass closes in winter, so routes from Denver change with the season. Winter weddings are common in town because the hotels are fully open for ski season. Licenses come from the Pitkin County Clerk in Aspen. The <a href="/guides/vail-aspen">Vail and Aspen planning guide</a> covers Independence Pass, the Bells and a sample day.'
    ],
    choose: [
      { h: 'Ask about small group packages', p: 'Aspen hotels regularly host private dinners for twenty to forty. Ask for the terrace or private dining room rather than the main event space.' },
      { h: 'Plan for afternoon storms', p: 'Summer storms build over the Elk Mountains most afternoons. Morning ceremonies and venues with covered terraces are the safer bet.' },
      { h: 'Book rooms where you celebrate', p: 'Hotel venues let guests walk home, which matters in a town where parking is scarce and taxis are limited late at night.' },
      { h: 'Check Bells reservation days first', p: 'Maroon Bells blackout days rule out many weekends. Lock the ceremony date before you sign a venue contract.' },
      { h: 'Map the drive to photo spots', p: 'Maroon Bells and Castle Creek are close to town; Independence Pass and Redstone are longer drives. Choose a venue that keeps portraits within reach.' }
    ],
    faqs: [
      { q: 'How many wedding venues are listed in Aspen?', a: 'We list {n} live wedding venues in Aspen, Snowmass Village and Redstone, ranked by Google rating and review count. Featured venues appear first.' },
      { q: 'Can we get married at Maroon Bells?', a: 'Yes, at the Maroon Bells Amphitheater with a reservation on Recreation.gov. Friday and Saturday ceremonies are blocked from June through August and Friday through Sunday in September, and the road closes to cars in winter.' },
      { q: 'What is the best time of year for an Aspen wedding?', a: 'Late June through early October for outdoor ceremonies, with fall color usually peaking in the second half of September. Town venues also host weddings throughout ski season.' },
      { q: 'Where do we get a marriage license for Aspen?', a: 'From the Pitkin County Clerk in Aspen. Any Colorado county clerk can issue a license that is valid statewide, and it must be used within 35 days.' }
    ]
  },
  {
    slug: 'telluride-wedding-venues',
    town: 'Telluride',
    term: 'telluride wedding venues',
    volume: 720,
    region: 'telluride-san-juans',
    towns: ['Telluride'],
    h1: ['Telluride Wedding Venues', 'for Elopements and Small Weddings'],
    title: 'Telluride Wedding Venues: {n} Venues in Telluride and Ouray | Colorado Elopement Guide',
    description: 'Telluride wedding venues for elopements and small weddings: Mountain Village hotels, the historic downtown and Ouray, plus town permit and travel tips.',
    guide: 'telluride-san-juans',
    permit: { href: '/guides/telluride-san-juans', label: 'Telluride town facility rules' },
    intro: [
      'Telluride sits in a box canyon in the San Juan Mountains, with Bridal Veil Falls at the head of the valley and peaks rising on three sides. The historic town is small enough to walk end to end, and a free gondola links it to Mountain Village, where most of the larger hotels are. For a small wedding, that geography means guests can stay, celebrate and sightsee without a car.',
      'The venues below split between those two places. In Mountain Village you will find full service hotels and the ski resort itself, with terraces and decks that look across the canyon. Downtown, a Victorian hotel on Colorado Avenue puts you in the middle of the old mining town. One listing is in Ouray, a little over an hour north by road through Ridgway, for couples who want hot springs and the Million Dollar Highway as part of the weekend.',
      'Telluride is protective of its public spaces. Private events in town parks go through a facility application about 45 days ahead, and forest sites such as Alta Lakes or Last Dollar Road are first come. Hotels and the resort handle their own spaces, which is the simplest path for a ceremony with chairs, florals or music. The <a href="/guides/telluride-san-juans">Telluride and San Juans planning guide</a> covers the town rules, the overlooks and a sample day.',
      'The season is short and spectacular. July through early October is the outdoor window, and the last week of September usually brings the aspens to peak across the valley. Summer afternoons often bring storms, so plan an early ceremony and confirm the covered fallback. Getting here takes planning: Montrose airport is about an hour and a half away, the Telluride airport is fifteen minutes out but often weather limited, and Denver is more than six hours by car. Licenses come from the San Miguel County Clerk in Telluride.'
    ],
    choose: [
      { h: 'Keep the group small', p: 'Mountain Village hotels have terraces and private rooms that suit twenty or thirty guests. Ask about off season and weekday options.' },
      { h: 'Plan for the afternoon storm', p: 'Storms build over the San Juans most summer afternoons. A morning ceremony with an indoor fallback keeps the day calm.' },
      { h: 'Stay where you celebrate', p: 'Travel here is long, so guests appreciate a venue with rooms. The gondola links town and Mountain Village, so either base works.' },
      { h: 'Know the town park rules', p: 'Ceremonies in Telluride town parks need a facility application about 45 days ahead. A hotel or resort venue avoids that step.' },
      { h: 'Plan the photo route', p: 'Bridal Veil Falls, Alta Lakes and Last Dollar Road are each a separate drive. Ask your photographer which venue fits the light you want.' }
    ],
    faqs: [
      { q: 'How many wedding venues are listed in Telluride?', a: 'We list {n} live wedding venues in Telluride, Mountain Village and Ouray, ranked by Google rating and review count. Featured venues are shown first.' },
      { q: 'How do guests get to a Telluride wedding?', a: 'Most fly into Montrose, about 90 minutes away, or into Telluride Regional, about 15 minutes out but often affected by weather. Denver is more than six hours by car. The free gondola connects town and Mountain Village.' },
      { q: 'When is the best time for a Telluride wedding?', a: 'July through early October for outdoor ceremonies, with the aspens usually peaking in the last week of September. Winter weddings work at the Mountain Village hotels during ski season.' },
      { q: 'Where do we get a marriage license in Telluride?', a: 'From the San Miguel County Clerk in Telluride. Ouray County and La Plata County clerks are other options nearby, and the license must be used within 35 days.' }
    ]
  },
  {
    slug: 'colorado-mountain-wedding-venues',
    town: 'Colorado Mountain',
    term: 'colorado mountain wedding venues',
    volume: 1300,
    region: 'summit-county',
    groups: ['estes-park', 'summit-county', 'vail-aspen', 'telluride-san-juans'],
    h1: ['Colorado Mountain Wedding Venues', 'Including Breckenridge and Summit County'],
    title: 'Colorado Mountain Wedding Venues: {n} Venues From Breckenridge to Telluride | Colorado Elopement Guide',
    description: 'Colorado mountain wedding venues for small weddings, grouped by region: Breckenridge and Summit County, Estes Park, Vail and Aspen, and Telluride.',
    guide: 'summit-county',
    permit: { href: '/resources/national-forest-and-blm-elopements', label: 'national forest ceremony rules' },
    intro: [
      'A mountain wedding in Colorado almost always means a venue above 7,500 feet, and that changes the practical questions. Weather moves faster, roads close for the season, and getting guests up from Denver is part of the plan. This page groups our live mountain venues by region so you can compare them side by side: Breckenridge and Summit County, Estes Park and Rocky Mountain National Park, Vail and Aspen, and Telluride.',
      'Breckenridge and Summit County are the closest high mountain towns to Denver, about an hour and forty five minutes on Interstate 70 in good conditions. The venues there are ski lodges, a Nordic center and resort spaces in Breckenridge, with Sapphire Point overlook near Dillon available for ceremonies through a Recreation.gov reservation in three hour blocks for up to 30 people. Licenses come from the Summit County Clerk in Breckenridge, and the <a href="/guides/summit-county">Summit County planning guide</a> covers Sapphire Point, Loveland Pass and timing.',
      'Each region has its own character. Estes Park pairs a strict national park permit with lodges and inns in the valley. Vail and Aspen offer the most polished hotels and the easiest winter weddings. Telluride is the most dramatic and the hardest to reach. If you already know your town, the dedicated pages for <a href="/venues/estes-park-wedding-venues">Estes Park</a>, <a href="/venues/vail-wedding-venues">Vail</a>, <a href="/venues/aspen-wedding-venues">Aspen</a> and <a href="/venues/telluride-wedding-venues">Telluride</a> go deeper.',
      'Across all of these regions, late June to early October is the outdoor season and the aspens turn in the second half of September. Summer afternoons bring thunderstorms above treeline almost daily, so morning ceremonies and venues with real indoor space are the norm. Winter weddings are realistic in the ski towns, where hotels and lifts are open, and much harder where passes close. Much of the surrounding land is national forest, where small noncommercial gatherings usually need no permit; our <a href="/resources/national-forest-and-blm-elopements">national forest guide</a> explains the 75 person rule. For the cold months, read our <a href="/resources/winter-elopement-colorado">winter elopement guide</a>.'
    ],
    choose: [
      { h: 'Start with the drive', p: 'Summit County is under two hours from Denver; Aspen and Telluride can take four to six. Pick the region your guests can actually reach.' },
      { h: 'Ask about the storm plan', p: 'Afternoon storms above treeline are routine from July through August. Confirm the indoor or covered fallback before you book.' },
      { h: 'Prefer venues with rooms', p: 'Mountain roads after dark are the riskiest part of the weekend. Lodges and hotels with rooms on site solve that.' },
      { h: 'Check land and permits', p: 'National parks, national forests and reservable overlooks like Sapphire Point each have their own limits. Private venues avoid most of them.' },
      { h: 'Respect the altitude', p: 'Guests coming from sea level feel 9,000 feet. Plan a light first day, plenty of water and a ceremony site that does not need a steep hike.' }
    ],
    faqs: [
      { q: 'How many mountain wedding venues are listed?', a: 'We list {n} live mountain wedding venues across Summit County, Estes Park, Vail and Aspen, and Telluride, ranked by Google rating and review count within each region.' },
      { q: 'Can we get married at Sapphire Point near Breckenridge?', a: 'Yes. Sapphire Point is reserved on Recreation.gov in three hour blocks with a limit of 30 people, and the site stays open to the public. Our Sapphire Point page covers the details.' },
      { q: 'What is the best season for a Colorado mountain wedding?', a: 'Late June through early October for outdoor ceremonies, with aspens turning in the second half of September. Ski towns such as Breckenridge, Vail and Aspen also host winter weddings.' },
      { q: 'Do we need a permit to marry on national forest land?', a: 'Small noncommercial gatherings on national forest land generally do not need a special use permit, but groups of 75 or more do. Reservable sites such as Sapphire Point and the Maroon Bells Amphitheater have their own rules.' }
    ]
  },
  {
    slug: 'affordable-wedding-venues-colorado',
    town: 'Colorado',
    term: 'affordable wedding venues colorado',
    volume: 1000,
    region: 'denver-foothills',
    groups: ['estes-park', 'boulder', 'denver-foothills', 'colorado-springs', 'northern-colorado', 'summit-county', 'vail-aspen', 'telluride-san-juans'],
    pick: [
      'saint-catherine-s-chapel-on-the-rock', 'ymca-of-the-rockies-estes-park-family-resort-and-cabins', 'the-appenzell-inn', 'riversong-inn-retreat',
      'sunrise-amphitheater', 'chautauqua-community-house', 'lost-gulch-overlook', 'gold-hill-inn',
      'boettcher-mansion-lookout-mt', 'evergreen-lake-house', 'the-hudson-gardens-event-center',
      'norris-penrose-event-center', 'pikes-peak-ranch', 'spruce-mountain-events',
      '1879-avery-house', 'wolverine-farm-publick-house', 'edwards-house', 'sylvan-dale-guest-ranch-retreat-wedding-venue', 'ellis-ranch-event-center-wedding-park',
      'breckenridge-nordic-center',
      'john-denver-sanctuary', 'betty-ford-alpine-gardens', 'avalanche-ranch', 'freight'
    ],
    h1: ['Affordable Wedding Venues in Colorado', 'Parks, Inns, Ranches and Community Spaces'],
    title: 'Affordable Wedding Venues in Colorado: {n} Parks, Inns and Ranches by Region | Colorado Elopement Guide',
    description: 'Affordable wedding venues in Colorado, hand picked by region: public parks, community halls, gardens, inns and ranches that suit a modest budget.',
    permit: { href: '/resources/colorado-elopement-cost', label: 'What a Colorado elopement really costs' },
    intro: [
      'Most couples who search for an affordable wedding venue in Colorado are not looking for the cheapest room in the state. They want a beautiful place that does not come with a ballroom minimum, a mandatory package for 150 people and a peak Saturday price. The good news is that Colorado has a deep bench of venues built for exactly that: city and county parks, community halls, public gardens, historic houses run by nonprofits, small inns and working ranches.',
      'This is a curated list from our live directory, grouped by region. We picked venues whose format tends to suit a modest budget: places owned by a city, county, park district or nonprofit, where the rental is often the main cost, and inns, lodges and ranches that take small groups. We do not publish prices on this page and we never guess them. Rates change by season, day of the week and room, so treat every card as a place worth asking, and check with the venue for its current rates and minimums.',
      'Two habits save more money than any single venue choice. The first is the calendar: a Friday or Sunday, or a date in May or late October, usually costs less than a Saturday in September. The second is the guest list, because food and drink minimums scale with headcount. A ceremony on public land with a short dinner afterward is often the best value of all; our <a href="/resources/best-places-to-elope-in-colorado">best places to elope</a> guide notes which sites need a permit, and the <a href="/resources/national-forest-and-blm-elopements">national forest guide</a> explains why most small ceremonies there need none.',
      'If you want to see the whole budget before you pick a room, our page on <a href="/resources/colorado-elopement-cost">what a Colorado elopement costs</a> breaks out the license, permits, photographer and dinner. For small venues without the budget angle, see <a href="/venues/micro-wedding-venues-colorado">micro wedding venues in Colorado</a>.'
    ],
    choose: [
      { h: 'Start with public and nonprofit venues', p: 'Park districts, county historic houses, public gardens and community halls often rent by the hour or the half day. Ask what the rental includes and what you must bring in yourself.' },
      { h: 'Ask about off peak dates', p: 'Weekdays, Sundays and shoulder months are where small budgets get the most room. Ask whether the venue has a separate weekday or off season rate rather than assuming.' },
      { h: 'Check vendor and alcohol rules', p: 'Being able to bring your own caterer, or buy your own wine, can matter more than the rental itself. Some public venues require licensed bartenders or event insurance; ask before you book.' },
      { h: 'Count the hidden line items', p: 'Cleaning fees, security deposits, staffing hours, chair and table rentals and permits for alcohol add up. Ask for a full written quote for your actual date and headcount.' },
      { h: 'Pair a free ceremony with a small dinner', p: 'Many couples marry on public land with a handful of guests, then book a private room at an inn or restaurant for dinner. It keeps the venue bill small without giving up the view.' }
    ],
    faqs: [
      { q: 'What makes a wedding venue affordable in Colorado?', a: 'Usually the format rather than the brand. Venues owned by a city, county, park district or nonprofit often rent by the hour, and small inns and ranches can host a short guest list without a large minimum. Prices change by season and day, so check with each venue for current rates.' },
      { q: 'How many venues are on this list?', a: 'This curated list has {n} live venues grouped by region. It is a hand picked selection of parks, community spaces, gardens, inns and ranches, not every venue we list; the town pages show the rest.' },
      { q: 'Do you list venue prices?', a: 'No. Venue rates depend on the date, the room, the guest count and food and drink minimums, and they change often. We list the venue so you can ask; check with the venue for its current pricing.' },
      { q: 'Are there free places to get married in Colorado?', a: 'Many national forest and BLM sites need no permit for small noncommercial ceremonies, and some city parks allow small informal gatherings. National parks, state parks and reservable overlooks such as Sapphire Point have their own permits and fees. Our best places to elope guide lists the rule for each site.' }
    ]
  },
  {
    slug: 'micro-wedding-venues-colorado',
    town: 'Colorado',
    term: 'small wedding venues colorado',
    volume: 1190,
    region: 'estes-park',
    groups: ['estes-park', 'boulder', 'denver-foothills', 'colorado-springs', 'northern-colorado', 'summit-county', 'vail-aspen', 'telluride-san-juans'],
    pick: [
      'riversong-inn-retreat', 'saint-catherine-s-chapel-on-the-rock', 'wild-basin-lodge', 'black-canyon-inn', 'the-inn-on-fall-river-fall-river-cabins', 'historic-crags-lodge',
      'chautauqua-dining-hall', 'sunrise-amphitheater', 'the-greenbriar-inn', 'flagstaff-house',
      'boettcher-mansion-lookout-mt', 'evergreen-lake-house', 'the-barn-at-evergreen-memorial-park', 'blackstone-rivers-ranch', 'woodlands',
      'pikes-peak-ranch', 'spruce-mountain-events', 'the-cliff-house-at-pikes-peak',
      'edwards-house', 'sylvan-dale-guest-ranch-retreat-wedding-venue', 'wolverine-farm-publick-house',
      'breckenridge-nordic-center', 'mountain-thunder-lodge',
      'betty-ford-alpine-gardens', 'avalanche-ranch', 'john-denver-sanctuary', 'sonnenalp-vail',
      'beaumont-hotel-spa', 'new-sheridan-hotel'
    ],
    h1: ['Micro Wedding Venues in Colorado', 'for Small Weddings of 2 to 50'],
    title: 'Micro Wedding Venues in Colorado: {n} Small Wedding Venues by Region | Colorado Elopement Guide',
    description: 'Small and micro wedding venues in Colorado, hand picked by region: inns, lodges, chapels, ranches and gardens that suit a guest list of 2 to 50.',
    permit: { href: '/resources/best-places-to-elope-in-colorado', label: 'Best places to elope in Colorado, with permit status' },
    intro: [
      'A micro wedding sits between an elopement and a traditional wedding: usually somewhere between ten and fifty people, one long table, and a day that feels like a gathering rather than a production. The hard part in Colorado is not finding a venue. It is finding one that does not swallow your group. Many of the best known venues in the state are built for 150 guests, and twenty people in a ballroom feels like a rehearsal.',
      'This page is a curated short list, not everything we have. We picked live venues from our directory whose format suits a small group: inns and lodges with a private room, chapels, guest ranches, gardens, historic houses and a few restaurants that seat a long table. We left out convention spaces, stadiums, theaters and big resort ballrooms, even when they host weddings. We do not publish capacities or prices for these venues, because they change by season and by room, so treat every card as a place to ask, not a promise.',
      'The list is grouped by region because the region decides more than the venue does. Estes Park and Rocky Mountain National Park pair a strict park permit with cozy valley inns. Boulder and the Denver foothills keep guests close to the airport. Colorado Springs adds red rock and mild winters. Northern Colorado is farmhouses and breweries. Summit County, Vail and Aspen, and Telluride bring the high peaks and the longer drives.',
      'If you are still deciding between a venue and public land, read our guide to the <a href="/resources/best-places-to-elope-in-colorado">best places to elope in Colorado</a>, which notes the permit status of each spot. Many couples hold a short ceremony at an overlook and then bring everyone to one of the venues below for dinner. If you would rather have someone else handle the whole day, our page on <a href="/resources/elopement-packages-colorado">Colorado elopement packages</a> explains what venue and all inclusive packages usually cover. Watching the budget? See our list of <a href="/venues/affordable-wedding-venues-colorado">affordable wedding venues in Colorado</a>.'
    ],
    choose: [
      { h: 'Ask for the smallest room first', p: 'Tell the venue your real number and ask which space they would put you in. A room that seats your group snugly will feel warmer than a big one with empty tables. Check with the venue on minimums for that room.' },
      { h: 'Ask about weekday and off season pricing', p: 'Small groups have leverage on Sundays through Thursdays and outside June to October. Many venues have a separate small wedding or elopement package; ask whether one exists rather than assuming.' },
      { h: 'Confirm the weather plan', p: 'Afternoon storms are routine in summer above about 7,000 feet. Ask to see the indoor or covered backup and decide now whether you would be happy using it.' },
      { h: 'Look for lodging on site or nearby', p: 'With a small guest list, an inn or ranch where everyone sleeps under one roof turns a dinner into a weekend and removes the late drive on mountain roads.' },
      { h: 'Check what you may bring in', p: 'Ask whether you can bring your own caterer, florist, officiant and photographer, and whether outside alcohol is allowed. Policies vary widely and are the main source of surprise costs.' }
    ],
    faqs: [
      { q: 'What counts as a micro wedding venue?', a: 'There is no official definition. We use the term for venues whose format suits roughly 2 to 50 guests: inns, lodges, chapels, ranches, gardens, historic houses and restaurants with a private room. Capacity and minimums vary by room and season, so check with the venue.' },
      { q: 'How many venues are on this list?', a: 'This curated list has {n} live venues grouped by region. It is a hand picked selection, not every venue we list; the town pages and the full venues category show the rest.' },
      { q: 'Can we hold the ceremony on public land and the dinner at a venue?', a: 'Yes, and many couples do. National park, national forest, state park and city park sites each have their own permit rules, so confirm the ceremony site first and then book a venue within a short drive.' },
      { q: 'Do small wedding venues in Colorado have lower prices?', a: 'Sometimes. Many venues offer weekday, off season or small wedding packages, but pricing depends on the room, the date and food and drink minimums. We do not publish prices; ask each venue for its current small wedding rates.' }
    ]
  }
];

// Which venue pages to promote from each region page.
export const REGION_VENUE_LINKS: Record<string, string[]> = {
  'estes-park': ['estes-park-wedding-venues'],
  'colorado-springs': ['colorado-springs-wedding-venues'],
  'boulder': ['boulder-wedding-venues'],
  'denver-foothills': ['denver-wedding-venues'],
  'northern-colorado': ['fort-collins-wedding-venues'],
  'vail-aspen': ['vail-wedding-venues', 'aspen-wedding-venues'],
  'telluride-san-juans': ['telluride-wedding-venues'],
  'summit-county': ['colorado-mountain-wedding-venues']
};
