// Fictional places used when no Qloo key is configured. Names are invented;
// tag types follow Qloo's place taxonomy so the model treats them the same
// way as live results. The UI labels everything from here as sample data.

import type { PlaceSnapshot, TagRef } from "../types";

const t = (type: string, slug: string, name: string): TagRef => ({
  id: `${type}:${slug}`,
  name,
  type,
});

const GENRE = "urn:tag:genre:place";
const AMBIENCE = "urn:tag:ambience:qloo";
const AMENITY = "urn:tag:amenity:place";
const ACCESS = "urn:tag:accessibility:place";
const CUISINE = "urn:tag:cuisine:qloo";

const wheelchair = t(ACCESS, "wheelchair_accessible_entrance", "Wheelchair accessible entrance");

export interface SamplePlace extends PlaceSnapshot {
  /** Keywords used to simulate taste affinity against a person's loves. */
  affinityKeys: string[];
  rating: number;
}

export const SAMPLE_PLACES: SamplePlace[] = [
  {
    id: "sample-silver-mane",
    name: "Silver Mane Stables",
    address: "4120 Hollow Rd, Columbus, OH",
    category: "Equestrian center",
    tags: [t(GENRE, "equestrian_center", "Equestrian center"), t(AMENITY, "outdoor_seating", "Outdoor area"), t(AMBIENCE, "relaxing", "Relaxing"), wheelchair],
    priceLevel: 1,
    lat: 40.0861,
    lon: -83.0426,
    rating: 4.8,
    source: "sample",
    affinityKeys: ["horse", "animal", "outdoor", "country"],
  },
  {
    id: "sample-big-sky-farm",
    name: "Big Sky Petting Farm",
    address: "880 Stelzer Ln, Westerville, OH",
    category: "Farm",
    tags: [t(GENRE, "farm", "Farm"), t(AMENITY, "petting_zoo", "Petting barn"), t(AMBIENCE, "family_friendly", "Family friendly"), wheelchair],
    priceLevel: 1,
    lat: 40.1262,
    lon: -82.9291,
    rating: 4.6,
    source: "sample",
    affinityKeys: ["horse", "animal", "outdoor", "garden"],
  },
  {
    id: "sample-la-palmita",
    name: "La Palmita Taqueria",
    address: "2250 N High St, Columbus, OH",
    category: "Mexican restaurant",
    tags: [t(`${GENRE}:restaurant`, "mexican", "Mexican restaurant"), t(CUISINE, "tacos", "Tacos"), t(AMBIENCE, "quiet", "Quiet"), t(AMBIENCE, "casual", "Casual"), wheelchair],
    priceLevel: 1,
    lat: 40.0103,
    lon: -83.0105,
    rating: 4.7,
    source: "sample",
    affinityKeys: ["taco", "mexican", "food", "selena", "latin"],
  },
  {
    id: "sample-casa-fiesta",
    name: "Casa Fiesta Cantina",
    address: "1580 Bethel Rd, Columbus, OH",
    category: "Mexican restaurant",
    tags: [t(`${GENRE}:restaurant`, "mexican", "Mexican restaurant"), t(CUISINE, "tacos", "Tacos"), t(AMBIENCE, "lively", "Lively"), t(AMENITY, "live_music", "Live music"), t(`${GENRE}:restaurant`, "bar", "Bar")],
    priceLevel: 2,
    lat: 40.0628,
    lon: -83.0637,
    rating: 4.3,
    source: "sample",
    affinityKeys: ["taco", "mexican", "food", "selena", "latin", "music"],
  },
  {
    id: "sample-tejano-nights",
    name: "Tejano Nights Dance Hall",
    address: "3300 Cleveland Ave, Columbus, OH",
    category: "Dance hall",
    tags: [t(GENRE, "dance_hall", "Dance hall"), t(AMENITY, "live_music", "Live music"), t(AMBIENCE, "lively", "Lively"), t(AMBIENCE, "festive", "Festive")],
    priceLevel: 2,
    lat: 40.0242,
    lon: -82.9631,
    rating: 4.4,
    source: "sample",
    affinityKeys: ["selena", "latin", "music", "dance"],
  },
  {
    id: "sample-riverbend",
    name: "Riverbend Commons Park",
    address: "Riverbend Dr, Columbus, OH",
    category: "Park",
    tags: [t(GENRE, "park", "Park"), t(AMENITY, "walking_paths", "Paved walking paths"), t(AMENITY, "picnic_tables", "Picnic tables"), t(AMBIENCE, "relaxing", "Relaxing"), wheelchair],
    lat: 40.0498,
    lon: -83.0251,
    rating: 4.6,
    source: "sample",
    affinityKeys: ["outdoor", "garden", "walk", "nature"],
  },
  {
    id: "sample-glasshouse",
    name: "Glasshouse Conservatory",
    address: "1777 E Broad St, Columbus, OH",
    category: "Botanical garden",
    tags: [t(GENRE, "botanical_garden", "Botanical garden"), t(AMBIENCE, "relaxing", "Relaxing"), t(AMBIENCE, "quiet", "Quiet"), wheelchair],
    priceLevel: 2,
    lat: 39.9658,
    lon: -82.9548,
    rating: 4.8,
    source: "sample",
    affinityKeys: ["garden", "flower", "nature", "quiet"],
  },
  {
    id: "sample-northgate-records",
    name: "Northgate Record Exchange",
    address: "3040 N High St, Columbus, OH",
    category: "Record store",
    tags: [t(GENRE, "record_store", "Record store"), t(AMBIENCE, "cozy", "Cozy"), t(AMENITY, "listening_station", "Listening station")],
    priceLevel: 1,
    lat: 40.0302,
    lon: -83.0157,
    rating: 4.7,
    source: "sample",
    affinityKeys: ["music", "selena", "dolly", "hip hop", "gospel", "latin", "vinyl"],
  },
  {
    id: "sample-paws-cafe",
    name: "Paws & Whiskers Cat Café",
    address: "640 N High St, Columbus, OH",
    category: "Cafe",
    tags: [t(`${GENRE}:restaurant`, "cafe", "Cafe"), t(AMBIENCE, "cozy", "Cozy"), t(AMENITY, "resident_cats", "Resident cats"), t(AMBIENCE, "relaxing", "Relaxing"), wheelchair],
    priceLevel: 1,
    lat: 39.9775,
    lon: -83.0034,
    rating: 4.5,
    source: "sample",
    affinityKeys: ["animal", "cat", "cozy", "coffee"],
  },
  {
    id: "sample-lanes",
    name: "Lanes & Games Bowl",
    address: "4900 Sinclair Rd, Columbus, OH",
    category: "Bowling alley",
    tags: [t(GENRE, "bowling_alley", "Bowling alley"), t(AMENITY, "arcade", "Arcade"), t(AMBIENCE, "lively", "Lively"), t(GENRE, "sports", "Sports")],
    priceLevel: 2,
    lat: 40.0617,
    lon: -82.9953,
    rating: 4.2,
    source: "sample",
    affinityKeys: ["bowling", "games", "sports", "basketball"],
  },
  {
    id: "sample-starline",
    name: "Starline Cinema 8",
    address: "1400 Morse Rd, Columbus, OH",
    category: "Cinema",
    tags: [t(GENRE, "movie_theater", "Movie theater"), t(AMENITY, "sensory_friendly_showings", "Sensory-friendly showings"), wheelchair],
    priceLevel: 2,
    lat: 40.0579,
    lon: -82.9872,
    rating: 4.4,
    source: "sample",
    affinityKeys: ["movie", "star wars", "marvel", "film", "selena"],
  },
  {
    id: "sample-clay-corner",
    name: "Clay Corner Pottery Studio",
    address: "1010 W 5th Ave, Columbus, OH",
    category: "Pottery studio",
    tags: [t(GENRE, "art_studio", "Pottery studio"), t(AMENITY, "workshop", "Drop-in workshop"), t(AMBIENCE, "relaxing", "Relaxing")],
    priceLevel: 2,
    lat: 39.9886,
    lon: -83.0339,
    rating: 4.9,
    source: "sample",
    affinityKeys: ["craft", "art", "garden", "hands"],
  },
  {
    id: "sample-mercado",
    name: "Mercado Latino Market",
    address: "2700 Morse Rd, Columbus, OH",
    category: "Market",
    tags: [t(GENRE, "market", "Market"), t(CUISINE, "tacos", "Taco counter"), t(AMBIENCE, "busy", "Busy")],
    priceLevel: 1,
    lat: 40.0601,
    lon: -82.9586,
    rating: 4.5,
    source: "sample",
    affinityKeys: ["taco", "mexican", "latin", "food", "selena"],
  },
  {
    id: "sample-westside-mall",
    name: "Westside Town Mall",
    address: "3555 W Broad St, Columbus, OH",
    category: "Shopping mall",
    tags: [t(GENRE, "shopping_mall", "Shopping mall"), t(AMBIENCE, "busy", "Busy"), wheelchair],
    priceLevel: 2,
    lat: 39.9548,
    lon: -83.1053,
    rating: 4.0,
    source: "sample",
    affinityKeys: ["shopping", "food"],
  },
  {
    id: "sample-fieldstone",
    name: "Fieldstone Orchard",
    address: "7060 Orchard Rd, Galena, OH",
    category: "Orchard",
    tags: [t(GENRE, "orchard", "Orchard"), t(AMENITY, "hayrides", "Hayrides"), t(AMBIENCE, "relaxing", "Relaxing")],
    priceLevel: 1,
    lat: 40.2131,
    lon: -82.9155,
    rating: 4.7,
    source: "sample",
    affinityKeys: ["outdoor", "garden", "horse", "nature", "dolly"],
  },
  {
    id: "sample-heritage",
    name: "Heritage Rail Museum",
    address: "990 Rail Yard Way, Worthington, OH",
    category: "Museum",
    tags: [t(GENRE, "museum", "Museum"), t(AMBIENCE, "quiet", "Quiet"), t(AMENITY, "model_trains", "Model train layout"), wheelchair],
    priceLevel: 1,
    lat: 40.0931,
    lon: -83.0174,
    rating: 4.8,
    source: "sample",
    affinityKeys: ["train", "history", "museum", "star wars"],
  },
  {
    id: "sample-court-house",
    name: "Hilltop Hoops Rec Center",
    address: "2300 Hilltop Ave, Columbus, OH",
    category: "Recreation center",
    tags: [t(GENRE, "sports", "Sports"), t(AMENITY, "open_gym", "Open gym"), t(AMBIENCE, "lively", "Lively"), wheelchair],
    priceLevel: 1,
    lat: 39.9467,
    lon: -83.0832,
    rating: 4.3,
    source: "sample",
    affinityKeys: ["basketball", "sports", "cavaliers", "hip hop"],
  },
  {
    id: "sample-wing-shack",
    name: "Wing Shack on Fifth",
    address: "550 W 5th Ave, Columbus, OH",
    category: "American restaurant",
    tags: [t(`${GENRE}:restaurant`, "american", "American restaurant"), t(CUISINE, "wings", "Wings"), t(AMBIENCE, "casual", "Casual"), t(AMENITY, "sports_on_tv", "Sports on TV")],
    priceLevel: 1,
    lat: 39.9862,
    lon: -83.0164,
    rating: 4.4,
    source: "sample",
    affinityKeys: ["wings", "basketball", "food", "sports"],
  },
  {
    id: "sample-gospel-hall",
    name: "Greater Light Community Choir Hall",
    address: "1225 Mt Vernon Ave, Columbus, OH",
    category: "Concert hall",
    tags: [t(GENRE, "concert_hall", "Concert hall"), t(AMENITY, "open_rehearsal", "Open rehearsals"), t(AMBIENCE, "uplifting", "Uplifting"), wheelchair],
    priceLevel: 1,
    lat: 39.9737,
    lon: -82.9681,
    rating: 4.9,
    source: "sample",
    affinityKeys: ["gospel", "music", "dolly", "choir"],
  },
];

export const SAMPLE_PLACE_BY_ID = Object.fromEntries(SAMPLE_PLACES.map((p) => [p.id, p]));

/** Strip sample-only fields so a place can be stored on an outing. */
export function snapshot(p: SamplePlace): PlaceSnapshot {
  return {
    id: p.id,
    name: p.name,
    address: p.address,
    category: p.category,
    tags: p.tags,
    priceLevel: p.priceLevel,
    lat: p.lat,
    lon: p.lon,
    source: p.source,
  };
}

export interface SampleMedia {
  id: string;
  name: string;
  type: string;
  year?: number;
  keys: string[];
}

export const SAMPLE_MEDIA: SampleMedia[] = [
  { id: "sample-m-selena", name: "Selena", type: "urn:entity:movie", year: 1997, keys: ["selena", "latin", "music"] },
  { id: "sample-m-coco", name: "Coco", type: "urn:entity:movie", year: 2017, keys: ["selena", "latin", "music", "mexican"] },
  { id: "sample-m-spirit", name: "Spirit: Stallion of the Cimarron", type: "urn:entity:movie", year: 2002, keys: ["horse", "animal"] },
  { id: "sample-m-black-beauty", name: "Black Beauty", type: "urn:entity:movie", year: 1994, keys: ["horse", "animal"] },
  { id: "sample-m-9to5", name: "9 to 5", type: "urn:entity:movie", year: 1980, keys: ["dolly"] },
  { id: "sample-m-steel", name: "Steel Magnolias", type: "urn:entity:movie", year: 1989, keys: ["dolly", "golden girls"] },
  { id: "sample-m-rogue-one", name: "Rogue One", type: "urn:entity:movie", year: 2016, keys: ["star wars"] },
  { id: "sample-m-mandalorian", name: "The Mandalorian", type: "urn:entity:tv_show", year: 2019, keys: ["star wars"] },
  { id: "sample-m-black-panther", name: "Black Panther", type: "urn:entity:movie", year: 2018, keys: ["marvel", "hip hop"] },
  { id: "sample-m-hoop-dreams", name: "Hoop Dreams", type: "urn:entity:movie", year: 1994, keys: ["basketball"] },
  { id: "sample-m-polar", name: "The Polar Express", type: "urn:entity:movie", year: 2004, keys: ["train"] },
  { id: "sample-m-gospel", name: "Sister Act 2", type: "urn:entity:movie", year: 1993, keys: ["gospel", "music"] },
];
