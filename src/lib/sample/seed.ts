// Fictional people and a labeled sample history, so a new viewer sees what
// the record looks like after six weeks of use. Every seeded outing carries
// `sample: true` and the UI marks it.

import type { Outing, Person, Reaction, ReactionTag } from "../types";
import { SAMPLE_PLACE_BY_ID, snapshot } from "./places";

export const AGENCY = "Brightway Community Living";
export const CURRENT_STAFF = { name: "Kwame Mensah", short: "Kwame M.", role: "Direct support professional", startedDaysAgo: 21 };

const CLINTONVILLE = { label: "Clintonville, Columbus OH", lat: 40.0420, lon: -83.0186 };

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function seedPeople(): Person[] {
  const now = new Date().toISOString();
  return [
    {
      id: "maria",
      firstName: "Maria",
      lastName: "Delgado",
      pronouns: "she/her",
      age: 34,
      hue: 18,
      summary:
        "Maria lights up around horses and Selena's music, and loves a good taco. Busy, noisy rooms wear her out fast.",
      home: CLINTONVILLE,
      loves: [
        { id: "seed:selena", name: "Selena", kind: "entity", type: "urn:entity:artist", note: "Sings along to Bidi Bidi Bom Bom" },
        { id: "seed:horses", name: "Horses", kind: "tag", type: "urn:tag:keyword", note: "Grew up near a ranch in Texas" },
        { id: "seed:tacos", name: "Tacos", kind: "tag", type: "urn:tag:cuisine:qloo" },
        { id: "seed:selena-film", name: "Selena (1997)", kind: "entity", type: "urn:entity:movie" },
      ],
      avoid: [],
      support: {
        mobility: "wheelchair",
        communication:
          "Minimally verbal. Uses gestures, a few words in Spanish and English, and thumbs up or down. Give two choices, not open questions.",
        signsHappy: "Rocks gently, hums, reaches for your hand.",
        signsDistress: "Covers her ears, says \"casa\", pushes her chair back.",
        staffRatio: "1:1",
        dietary: "No pork.",
      },
      defaults: { budget: 15, radiusKm: 20, transport: "van" },
      createdAt: now,
    },
    {
      id: "devon",
      firstName: "Devon",
      lastName: "Harris",
      pronouns: "he/him",
      age: 27,
      hue: 220,
      summary:
        "Devon knows every Star Wars film by heart and could watch trains all day. He likes to know the plan ahead of time.",
      home: CLINTONVILLE,
      loves: [
        { id: "seed:star-wars", name: "Star Wars", kind: "entity", type: "urn:entity:movie" },
        { id: "seed:trains", name: "Trains", kind: "tag", type: "urn:tag:keyword" },
        { id: "seed:bowling", name: "Bowling", kind: "tag", type: "urn:tag:keyword" },
      ],
      avoid: ["crowded"],
      support: {
        mobility: "none",
        communication: "Speaks in full sentences. Show him the plan in pictures the day before.",
        signsHappy: "Talks fast about details, smiles, asks to come back.",
        signsDistress: "Repeats \"when are we leaving\", puts his headphones on.",
        staffRatio: "1:2",
        other: "Brings noise-cancelling headphones.",
      },
      defaults: { budget: 20, radiusKm: 16, transport: "bus" },
      createdAt: now,
    },
    {
      id: "ruth",
      firstName: "Ruth",
      lastName: "Okafor",
      pronouns: "she/her",
      age: 58,
      hue: 150,
      summary:
        "Ruth loves Dolly Parton, gospel choirs and anything growing in a garden. Mornings are her best time.",
      home: CLINTONVILLE,
      loves: [
        { id: "seed:dolly", name: "Dolly Parton", kind: "entity", type: "urn:entity:artist" },
        { id: "seed:gospel", name: "Gospel music", kind: "tag", type: "urn:tag:genre:music" },
        { id: "seed:gardening", name: "Gardening", kind: "tag", type: "urn:tag:keyword" },
        { id: "seed:golden-girls", name: "The Golden Girls", kind: "entity", type: "urn:entity:tv_show" },
      ],
      avoid: ["late"],
      support: {
        mobility: "walker",
        communication: "Chatty and clear. Hard of hearing on her left side; sit on her right.",
        signsHappy: "Sings, tells stories about her sister.",
        signsDistress: "Goes quiet and asks what time it is.",
        staffRatio: "1:3",
        dietary: "Diabetic. Bring a snack.",
      },
      defaults: { budget: 25, radiusKm: 16, transport: "van" },
      createdAt: now,
    },
    {
      id: "sam",
      firstName: "Sam",
      lastName: "Whitaker",
      pronouns: "they/them",
      age: 41,
      hue: 280,
      summary:
        "Sam is a die-hard Cavaliers fan who loves Black Panther, hip-hop and hot wings. Happiest when there's a game on.",
      home: CLINTONVILLE,
      loves: [
        { id: "seed:cavs", name: "Cleveland Cavaliers", kind: "entity", type: "urn:entity:brand" },
        { id: "seed:black-panther", name: "Black Panther", kind: "entity", type: "urn:entity:movie" },
        { id: "seed:hip-hop", name: "Hip-hop", kind: "tag", type: "urn:tag:genre:music" },
        { id: "seed:wings", name: "Wings", kind: "tag", type: "urn:tag:cuisine:qloo" },
      ],
      avoid: ["bars"],
      support: {
        mobility: "none",
        communication: "Speaks clearly; uses short phrases when tired.",
        signsHappy: "Fist bumps, explains game stats.",
        signsDistress: "Paces, asks to leave.",
        staffRatio: "1:2",
        other: "Sober for 6 years — no bars.",
      },
      defaults: { budget: 20, radiusKm: 20, transport: "van" },
      createdAt: now,
    },
  ];
}

interface Visit {
  days: number;
  place: string;
  reaction: Reaction;
  tags?: ReactionTag[];
  note?: string;
  staff: string;
  window?: string;
}

function outings(personId: string, visits: Visit[]): Outing[] {
  return visits.map((v, i) => {
    const date = isoDaysAgo(v.days);
    return {
      id: `${personId}-sample-${i}`,
      personId,
      status: "logged",
      date,
      window: v.window ?? "1:00–4:00 pm",
      place: snapshot(SAMPLE_PLACE_BY_ID[v.place]),
      planTitle: SAMPLE_PLACE_BY_ID[v.place].name,
      staff: v.staff,
      reaction: v.reaction,
      reactionTags: v.tags ?? [],
      note: v.note,
      loggedAt: `${date}T21:00:00.000Z`,
      sample: true,
    };
  });
}

export function seedOutings(): Outing[] {
  return [
    ...outings("maria", [
      { days: 45, place: "sample-silver-mane", reaction: "lit_up", tags: ["wanted_to_stay"], staff: "Dana R.", note: "Brushed Clover for 20 minutes. Didn't want to leave." },
      { days: 41, place: "sample-casa-fiesta", reaction: "not_for_them", tags: ["too_loud", "left_early"], staff: "Dana R.", note: "Live band started at 2. Covered ears, left after 15 min." },
      { days: 37, place: "sample-riverbend", reaction: "fine", tags: ["calm"], staff: "Luis P." },
      { days: 31, place: "sample-silver-mane", reaction: "lit_up", tags: ["social_moment"], staff: "Luis P.", note: "Said \"caballo\" and laughed with the stable hand." },
      { days: 27, place: "sample-westside-mall", reaction: "fine", tags: ["too_crowded", "tired"], staff: "Agency float" },
      { days: 20, place: "sample-la-palmita", reaction: "lit_up", tags: ["ate_well", "calm"], staff: "Kwame M.", note: "Two tacos al pastor. Owner put Selena on for her." },
      { days: 13, place: "sample-glasshouse", reaction: "fine", tags: ["calm"], staff: "Kwame M." },
      { days: 9, place: "sample-silver-mane", reaction: "lit_up", tags: ["wanted_to_stay"], staff: "Kwame M." },
      { days: 4, place: "sample-big-sky-farm", reaction: "lit_up", tags: ["tried_something_new"], staff: "Kwame M.", note: "First time at the farm. Fed the goats herself." },
    ]),
    ...outings("devon", [
      { days: 18, place: "sample-heritage", reaction: "lit_up", tags: ["wanted_to_stay", "calm"], staff: "Kwame M.", note: "Timed every loop of the model train." },
      { days: 6, place: "sample-starline", reaction: "fine", staff: "Priya S." },
    ]),
    ...outings("ruth", [
      { days: 22, place: "sample-glasshouse", reaction: "lit_up", tags: ["calm"], staff: "Luis P.", window: "10:00 am–12:00 pm" },
      { days: 15, place: "sample-gospel-hall", reaction: "lit_up", tags: ["social_moment"], staff: "Luis P.", window: "10:00 am–12:00 pm" },
      { days: 8, place: "sample-westside-mall", reaction: "not_for_them", tags: ["too_crowded", "tired"], staff: "Agency float" },
    ]),
  ];
}
