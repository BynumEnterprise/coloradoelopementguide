// Town by category landing pages (/local/{town}/{category}), GAP 5.2.
// A page builds only when (a) a hand written intro exists below for that town and category and (b) at least
// MIN_TOWN_VENDORS live vendors serve the town at build time. A vendor serves a town when its address town is
// one of the town's address names, or (for every category except venues) when it is based in or lists the
// town's region in served_regions. Statewide vendors (other-colorado) never count toward a town by region.
// Venue combos are left out where /venues/{town}-wedding-venues already exists, and photographer combos where
// the town is the whole region and /photographers/{region} already covers it, to avoid duplicate pages.

export const MIN_TOWN_VENDORS = 5;

export interface Town { name: string; region: string; addressNames: string[]; resources: string[] }

export const TOWNS: Record<string, Town> = {
  'estes-park': { name: 'Estes Park', region: 'estes-park', addressNames: ['Estes Park'], resources: ['rocky-mountain-national-park-wedding-permit', 'rocky-mountain-national-park-wedding-sites'] },
  'breckenridge': { name: 'Breckenridge', region: 'summit-county', addressNames: ['Breckenridge', 'Blue River'], resources: ['breckenridge-elopement', 'sapphire-point-overlook-elopement'] },
  'vail': { name: 'Vail', region: 'vail-aspen', addressNames: ['Vail'], resources: ['vail-elopement'] },
  'aspen': { name: 'Aspen', region: 'vail-aspen', addressNames: ['Aspen'], resources: ['aspen-elopement', 'maroon-bells-elopement-permit'] },
  'boulder': { name: 'Boulder', region: 'boulder', addressNames: ['Boulder'], resources: ['boulder-elopement-permits', 'boulder-county-marriage-license'] },
  'colorado-springs': { name: 'Colorado Springs', region: 'colorado-springs', addressNames: ['Colorado Springs', 'Manitou Springs'], resources: ['colorado-springs-ceremony-sites', 'garden-of-the-gods-elopement'] },
  'denver': { name: 'Denver', region: 'denver-foothills', addressNames: ['Denver'], resources: ['red-rocks-and-denver-foothills-ceremony-sites', 'denver-marriage-license'] },
  'fort-collins': { name: 'Fort Collins', region: 'northern-colorado', addressNames: ['Fort Collins'], resources: ['larimer-county-marriage-license'] },
  'golden': { name: 'Golden', region: 'denver-foothills', addressNames: ['Golden'], resources: ['evergreen-and-golden-elopement', 'jefferson-county-marriage-license'] },
  'telluride': { name: 'Telluride', region: 'telluride-san-juans', addressNames: ['Telluride', 'Mountain Village'], resources: [] },
  'crested-butte': { name: 'Crested Butte', region: 'other-colorado', addressNames: ['Crested Butte', 'Mt. Crested Butte', 'Mount Crested Butte'], resources: ['crested-butte-elopement'] }
};

export const TOWN_HEADINGS: Record<string, string> = {
  photographers: 'Elopement Photographers', planners: 'Elopement Planners', florists: 'Elopement Florists',
  'hair-makeup': 'Elopement Hair and Makeup Artists', officiants: 'Elopement Officiants', venues: 'Small Wedding Venues',
  packages: 'Elopement Packages'
};

// Intros: 150 to 250 words, written for the town and the category. Key is `${town}/${category}`.
export const TOWN_INTROS: Record<string, string[]> = {
  'estes-park/photographers': [
    'Estes Park is the gateway to Rocky Mountain National Park, and most elopement photographers who work here plan the day around the park\'s light and its rules. Sunrise at Bear Lake, Sprague Lake or the Moraine Park overlooks is the classic shoot, partly because the light is soft and partly because the trailheads are quiet before the crowds arrive. A photographer who knows the park will tell you which designated ceremony sites suit your guest count, how long the drive is from your lodging, and whether timed entry applies on your date.',
    'The park special use permit covers the ceremony, and photographers working inside the park need their own commercial authorization, so ask everyone on this list whether theirs is current. Summer afternoons bring storms often enough that a morning ceremony is the safer plan. In late September the elk rut fills the meadows with bugling bulls and visitors alike, which makes for beautiful frames and a crowded road. The photographers below are based in Estes Park or work the Estes Park and RMNP region; featured listings come first and are labeled.'
  ],
  'breckenridge/photographers': [
    'Breckenridge sits at about 9,600 feet at the foot of the Tenmile Range, and the town itself is half the appeal for an elopement shoot: Victorian storefronts on Main Street, the Blue River running through the center and ski runs rising behind everything. Most elopement photographers working here split the day between a short session in town and a ceremony site higher up, such as Sapphire Point above Dillon Reservoir, Boreas Pass Road or the meadows toward Hoosier Pass. Sapphire Point is reserved on Recreation.gov in three hour blocks with a 30 person cap, so book that slot before you lock in a timeline.',
    'Altitude shapes the plan more than people expect. Guests flying in from sea level tire quickly, sunrise sessions mean a cold start even in July, and Boreas Pass closes to cars in winter. In return you get snow from November into spring, gold aspens in mid September and a town full of places to eat afterward. The list below includes photographers based in Breckenridge plus those elsewhere in Summit County who shoot here every week. Featured listings come first and are labeled.'
  ],
  'breckenridge/florists': [
    'Flowers for a Breckenridge elopement have to survive two things: thin, dry air at nearly two miles up, and a ceremony site that might be a windy overlook rather than a reception hall. Local florists know which stems hold up in the sun at Sapphire Point and which wilt by the time you reach a trailhead on Boreas Pass Road, and many will build a bouquet and boutonniere set sized for two people rather than a full wedding order. Ask about seasonal stems in summer and dried arrangements in winter, which travel well and do not mind the cold.',
    'Delivery is the other question. Some florists in Summit County deliver to Breckenridge, Frisco, Keystone and Dillon, while others prefer pickup in town, which suits couples who are driving to a trailhead at dawn. The florists below are based in Breckenridge or serve Summit County. Ask about delivery windows, any minimum order for a small elopement, and whether they can hand off flowers the evening before a sunrise ceremony so nothing depends on a shop opening on time.'
  ],
  'vail/photographers': [
    'Vail is a ski village first, and an elopement shoot here usually moves between the covered bridge and pedestrian streets of Vail Village and somewhere much higher: a deck on the mountain, Shrine Pass, the Booth Falls trail or a meadow near Vail Pass. White River National Forest land surrounds the valley, and photographers who work there need to understand the forest rules on group size and commercial use, so ask how each one handles permits for the site you have in mind.',
    'Light in a narrow valley behaves differently from the open high country. The sun drops behind the ridges early, so golden hour starts sooner than the clock suggests, and a sunrise shoot on the pass can beat the valley light by an hour. Summer weekends are busy with festivals, while late September brings aspens across the slopes around East Vail. This list includes photographers based in Vail and others across the Vail and Aspen region who regularly shoot in the valley. Featured listings come first and are labeled.'
  ],
  'vail/planners': [
    'A planner earns the fee in Vail when the day involves more than a ceremony site and a photographer. The resorts and mountain wedding decks here, at Vail and at Beaver Creek, have their own booking rules, minimums and timelines, and a local planner already knows the people who run them. They can also handle the Eagle County marriage license appointment, transport up and down the mountain, a dinner for twelve on a festival weekend and a backup plan when afternoon storms roll through.',
    'Planners who work Vail usually also cover Beaver Creek, Edwards and the Aspen side of the region, so the list below includes planners based in Vail and planners elsewhere in the Vail and Aspen region. Ask each one whether they offer a day of coordination package for elopements, which is smaller and cheaper than full planning, and how far ahead they need you for a peak summer or September date. Featured listings come first and are labeled.'
  ],
  'aspen/photographers': [
    'Aspen elopements tend to orbit one place: the Maroon Bells. The Maroon Bells Amphitheater is reserved on Recreation.gov, with no Friday or Saturday ceremonies from June through August and no Friday to Sunday dates in September, and access to the lake is controlled in summer, so photographers who shoot here plan around shuttle hours and early starts. Ashcroft ghost town, Independence Pass and the trails above Snowmass are the quieter alternatives, each with its own season.',
    'Independence Pass closes in winter and the Bells road closes to cars for the season too, so a snowy Aspen elopement leans on the town, the slopes and private land. Aspen in summer is also a busy social town with high lodging prices, which is part of why many couples choose a weekday. The photographers below are based in Aspen or across the Vail and Aspen region and shoot the Roaring Fork Valley regularly. Ask each one how many Bells sessions they have done and how they handle the reservation.'
  ],
  'aspen/planners': [
    'Aspen is a place where logistics decide the day. The Maroon Bells reservation calendar, the summer shuttle schedule, a Pitkin County license appointment, a private chef or a dinner booking downtown, and lodging that sells out for summer festivals all need to line up. A good planner handles that while you think about vows. Local planners also know the private ranches and inns in the valley that host small weddings, which rarely show up in a simple search.',
    'The list below includes planners based in Aspen and those elsewhere in the Vail and Aspen region who work the Roaring Fork Valley. Ask whether they offer an elopement package rather than full wedding planning, how they handle a storm plan at a high site, and whether they can book the Maroon Bells Amphitheater or Ashcroft on your behalf. Featured planners come first and are labeled. Pricing varies widely in this market, so compare at least two quotes before you commit.'
  ],
  'boulder/florists': [
    'Boulder florists work for couples who usually want something that looks gathered rather than arranged: loose bouquets, seasonal stems and often a preference for growers who skip floral foam and plastic. That suits elopements well, because a small ceremony on the Chautauqua lawn, at Flagstaff Mountain or along Boulder Creek needs a bouquet, a boutonniere and maybe a handful of stems for a dinner table, not a full installation.',
    'The Chautauqua lawn needs no permit for groups under 50, and the Sunrise Amphitheater on Flagstaff is reserved through the city from May to October, so flowers can be planned around a fairly predictable site. Summer brings the widest choice of locally grown stems, from June into early autumn. The florists below are based in Boulder or serve the Boulder area. Ask about small order minimums, pickup versus delivery, and whether they can make a bouquet that will hold up on a hike to a viewpoint above town.'
  ],
  'colorado-springs/florists': [
    'Colorado Springs is one of the easier places in the state to plan flowers for an elopement. Garden of the Gods, the most popular ceremony spot in the area, is free and first come, with six ceremony areas and no decorations allowed, so the bouquet and boutonniere carry all of the color in your photos. Red sandstone and blue sky make a strong backdrop, and local florists often steer couples toward warm tones or soft whites that stand out against the rock.',
    'The milder weather and lower altitude also keep flowers fresher for longer than in the high mountain towns, and many florists here deliver to Manitou Springs, Old Colorado City and the hotels near Cheyenne Mountain. The list below includes florists based in Colorado Springs and others in the Pikes Peak region. Ask about a small elopement minimum, early pickup for a sunrise ceremony, and whether they can add a few loose stems for a dinner table afterward.'
  ],
  'colorado-springs/hair-makeup': [
    'Hair and makeup for a Colorado Springs elopement has to handle sun, wind and dry air at about 6,000 feet, especially at an exposed site like Garden of the Gods or a pullout on the Pikes Peak Highway. Local artists know that a long lasting base, a setting spray that survives a breezy overlook and a pinned style that holds through an hour of photos matter more here than at a ballroom wedding. Many come to your hotel or rental, which helps a lot when the ceremony is at sunrise.',
    'Ask each artist on this list about travel fees for Manitou Springs, Woodland Park or the Broadmoor area, whether they offer a smaller package for one or two people, and how early they can start. A trial is worth booking if you have never worn professional makeup outdoors. These artists are based in Colorado Springs or serve the Pikes Peak region, and featured listings come first and are labeled. Book early for September and October, when the weather is best and calendars fill fastest.'
  ],
  'colorado-springs/photographers': [
    'Colorado Springs gives elopement photographers a rare mix: red sandstone at Garden of the Gods, canyon trails above Manitou Springs and Pikes Peak filling the western sky, all a short drive from the airport and downtown hotels. Garden of the Gods is free and first come, with six ceremony areas, so photographers here often build the day around a sunrise slot before the park fills with hikers and climbers. Red Rock Canyon Open Space and the Cheyenne Mountain area are quieter local alternatives.',
    'The milder climate is the other draw. Sunrise works year round, and spring and fall are the strongest seasons for light and comfortable temperatures. A drive up the Pikes Peak Highway adds a high alpine look in summer, with its own fee and timing. City parks host groups under 50 without a permit. The photographers below are based in Colorado Springs or work across the Pikes Peak region. Ask each one how they time the light on the red rock and which corner of the park they prefer.'
  ],
  'denver/florists': [
    'Denver has more florists than anywhere else in Colorado, which means more choice and usually better prices for a small order than you will find in the mountain towns. Florists in the city handle everything from a single bouquet for a courthouse wedding to the flowers for a dinner of twenty in a restaurant private room, and many deliver up into the foothills for a ceremony at Red Rocks, Lookout Mountain or Evergreen.',
    'If you are eloping in the mountains but flying into Denver, picking flowers up in the city the day before is a practical plan; ask about overnight care and how the stems will ride in a car over a pass. Couples marrying after an appointment with the Denver Clerk and Recorder downtown often need only a bouquet and a boutonniere, ready at a set time. The florists below are based in Denver or the Denver and foothills region. Ask about minimum orders, pickup hours and delivery fees to the foothills.'
  ],
  'denver/hair-makeup': [
    'Denver has the deepest bench of bridal hair and makeup artists in Colorado, and most of them travel. That matters for elopements, because getting ready might happen in a downtown hotel, a rental in the Highlands or a cabin in Evergreen, and the ceremony might be at the courthouse or up at Red Rocks. Many artists here offer elopement or small party packages for one or two people, which cost far less than a full bridal party booking.',
    'Ask about travel fees past the city limits, how early they will start for a sunrise ceremony in the foothills, and what they use for long wear in dry mountain air. If your ceremony is higher up, a style that holds in wind is worth more than a delicate one that looks perfect for ten minutes. These artists are based in Denver or serve the Denver and foothills region, and featured listings come first and are labeled. For summer and fall Saturdays, book a few months ahead.'
  ],
  'denver/officiants': [
    'You do not need an officiant to marry in Colorado. The state allows self solemnization, so a couple can sign their own license with no officiant and no witnesses. Many still hire one, because a good officiant turns a signature into a ceremony: they write something personal, keep the timing on track, and make sure the license is completed correctly and returned to the clerk on time.',
    'Officiants in Denver handle everything from a ten minute ceremony after a license appointment downtown to a sunrise service at Red Rocks or a park in the foothills. Denver parks ask for a special occasion permit about 30 days ahead, so ask whether your officiant can help with that or suggest a spot that needs none. The officiants below are based in Denver or serve the Denver and foothills region. Ask about short notice fees, travel into the mountains and whether they are happy to include your kids or your dog in the ceremony.'
  ],
  'denver/planners': [
    'Denver planners cover a wider area than the name suggests. Many couples who elope in the mountains fly into Denver International, and a planner based in the city can handle the license appointment, a rental car or shuttle, lodging, a ceremony at Red Rocks, Lookout Mountain or Evergreen, and a dinner downtown on the way back. For a city wedding, they know which restaurants and rooftops host small private dinners and how far ahead the clerk books appointments.',
    'Elopement planning is usually sold as a package rather than a full wedding service, and the price depends on how many vendors you want the planner to book. Ask each planner on this list what is included, whether they handle Denver parks permits and Jefferson County photography permits, and how they plan around afternoon storms in the foothills. These planners are based in Denver or serve the Denver and foothills region, and featured listings come first and are labeled.'
  ],
  'fort-collins/florists': [
    'Fort Collins feels like a college town and a farm town at once, and that shows up in the flowers: seasonal, locally grown stems in summer, and dried and textured arrangements in the colder months. For an elopement in the Poudre Canyon, at Horsetooth Reservoir or in a city park, a florist here can put together a bouquet and boutonniere that suit a hike as well as a dinner in Old Town afterward.',
    'Larimer County parks host small ceremonies with a simple permit, and Lory State Park uses a special activity agreement, so flowers are often the only decoration that fits the rules. The florists below are based in Fort Collins or the Northern Colorado region, including Loveland. Ask about small order minimums, pickup hours for an early start up the canyon, and whether they can deliver to a rental or hotel the night before. Late September, when the canyon turns gold, is the busiest time to book.'
  ],
  'golden/venues': [
    'Golden sits right where the plains meet the foothills, with Clear Creek running through a walkable downtown, Lookout Mountain above it and Red Rocks a short drive south. For a small wedding that is the appeal: a mountain backdrop and a creekside ceremony without a drive over a pass, and guests can stay in Denver or right in town. The venues here range from creekside event spaces and restaurants with private rooms to historic buildings and foothills properties with a view back over the city.',
    'Golden parks and pavilions use city permits, and Jefferson County sets its own rules for photography in its open spaces, so a private venue with a ceremony spot on site can save a lot of paperwork. The license comes from the Jefferson County Clerk, whose main office is in Golden. The venues below have a Golden address. Ask each one about guest minimums, weekday pricing, an indoor storm plan and whether outside catering is allowed.'
  ],
  'telluride/photographers': [
    'Telluride is a box canyon, and that shapes everything about an elopement shoot here: Bridal Veil Falls at the head of the valley, the free gondola up to Mountain Village, and high basins and passes that open only from early summer into fall. Photographers who know the area plan around snowmelt, conditions on the jeep roads and the short window in late September when the aspens on the canyon walls turn gold.',
    'The Town of Telluride takes facility applications about 45 days ahead, while many forest sites around the valley are first come, so ask your photographer which spot fits your guest count and how they handle permits. Light leaves the canyon floor early, which makes sunrise or a high basin at sunset the usual plan. The photographers below are based in Telluride or work across the Telluride and San Juans region, including Ouray and Ridgway. Featured listings come first and are labeled.'
  ],
  'telluride/planners': [
    'Telluride is remote by Colorado standards. The regional airport is small and weather dependent, many guests fly into Montrose instead, and lodging in town and Mountain Village fills early on festival weekends. That is why planners here earn their fee: they coordinate transport, a San Miguel County license appointment, a ceremony site and a dinner, and they know which weekends to avoid before you fall for a date.',
    'Planners on this list are based in Telluride or serve the wider San Juans region. Ask whether they offer a smaller elopement package, how they schedule around the town facility application window of about 45 days, and what the storm plan looks like at a high basin or pass. If you want a sunrise ceremony at the top of a jeep road, ask whether they can arrange a driver who knows the route. Late September is the most requested time of year, so start early, and featured listings come first and are labeled.'
  ],
  'telluride/florists': [
    'Flowers in Telluride travel a long way. The town sits at the end of a box canyon, hours from the nearest large wholesale market, so florists here plan orders carefully, and a small elopement bouquet should be booked weeks ahead rather than days. In return you get florists who know how to keep stems fresh at nearly 8,800 feet and who are used to sending a bouquet up the gondola or out to a trailhead at dawn.',
    'Ceremony sites around Telluride range from the town park and Mountain Village plazas to Bridal Veil Falls and the high basins, and many forest sites limit decorations, so the bouquet and boutonniere do most of the work in photos. The florists below are based in Telluride or serve the Telluride and San Juans region. Ask about delivery to Mountain Village, any small order minimum, and whether they can find seasonal stems for a summer date. Book early for festival weekends and the late September aspen season.'
  ],
  'crested-butte/planners': [
    'Crested Butte is a small, remote mountain town with a big wildflower reputation, and that combination makes a planner unusually useful. Lodging is limited, the nearest airport is in Gunnison, the Gunnison County clerk issues licenses by appointment, and most ceremony sites sit on national forest or land trust property with their own rules. A local planner pulls those pieces together and knows which roads, like Kebler Pass, are open on your date.',
    'The planners below are based in Crested Butte. Ask each one about an elopement package for two to twenty guests, how they handle forest permits and Crested Butte Land Trust sites, and what the storm plan is for an afternoon ceremony in July, when the wildflowers peak and thunderstorms are common. Late September brings gold to the huge aspen groves along Kebler Pass, and those weekends book early, while weekday dates in June are easier to get. Featured listings come first and are labeled.'
  ]
};

export function addressTownOf(address: string | null | undefined): string | null {
  if (!address) return null;
  const m = /,\s*([^,]+),\s*(?:CO|Colorado)\b/i.exec(address);
  return m ? m[1].trim() : null;
}

// Live vendors for a town and category: featured first, then vendors with an address in town, then the
// region's vendors, each group keeping the site ranking from allVendors().
export function townVendors(townSlug: string, category: string, all: any[]): any[] {
  const t = TOWNS[townSlug]; if (!t) return [];
  const inTown = (v: any) => t.addressNames.includes(addressTownOf(v.address) || '');
  const byRegion = (v: any) => category !== 'venues' && t.region !== 'other-colorado' &&
    (v.sub_region === t.region || (Array.isArray(v.served_regions) && v.served_regions.includes(t.region)));
  const list = all.filter(v => v.category === category && (inTown(v) || byRegion(v)));
  const rank = (v: any) => (v.status === 'featured' ? 0 : inTown(v) ? 1 : 2);
  return list.map((v, i) => [v, i] as const).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([v]) => v);
}

export function liveTownPages(all: any[]) {
  return Object.keys(TOWN_INTROS).map(key => {
    const [town, category] = key.split('/');
    return { town, category, vendors: townVendors(town, category, all) };
  }).filter(p => p.vendors.length >= MIN_TOWN_VENDORS);
}
