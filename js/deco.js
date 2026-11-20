/* Cassie: decorating a book's cover. Right-click a book (or click the cover in an open book) and Decorate the cover opens
   a panel: the cover itself, big, on the left; on the right its colour and its title's colour (the 32 colours, and Auto
   for the title), the title's look (bold, round, typewriter, script or stamped), corner pieces, an elastic band, its
   picture, and a tray of stickers in packs (cute, weather, food, school, nature). Click a sticker to stick it on, then drag it where you like; click a stuck one to
   turn it, size it or peel it off. The stickers show on the book on the desk, on the open book, and in Tied to.
   A book keeps them as it.stickers: [{ k, x, y, r, s }] (where on the cover, in %; turned, in degrees; how big). */
'use strict';

// the stickers: drawn here, chunky and cute, each with a white die-cut edge. (O: the edge, around the shape; then details)
const O = (inner) => '<g fill="none" stroke="#fffaf0" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">' + inner + '</g>';
const STICKERS = {
  cat: ['Cat', O('<path d="M10 18L12 6l8 7q4-1 8 0l8-7 2 12q4 8 0 15-6 8-14 8T10 33q-4-7 0-15z"/>') + '<path d="M10 18L12 6l8 7q4-1 8 0l8-7 2 12q4 8 0 15-6 8-14 8T10 33q-4-7 0-15z" fill="#ffb762"/><path d="M13 9l3 6M35 9l-3 6" stroke="#c76e46" stroke-width="1.6" stroke-linecap="round"/><circle cx="18" cy="24" r="2.5" fill="#34111f"/><circle cx="30" cy="24" r="2.5" fill="#34111f"/><circle cx="18.8" cy="23.2" r=".8" fill="#fffaf0"/><circle cx="30.8" cy="23.2" r=".8" fill="#fffaf0"/><path d="M22.4 28.5h3.2L24 30.6z" fill="#d9243c"/><path d="M20.5 31.5q1.8 2 3.5 0 1.7 2 3.5 0" stroke="#34111f" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M3 26.5l11 1.3M3 32.5l11-1.6M45 26.5l-11 1.3M45 32.5l-11-1.6" stroke="#34111f" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="14.5" cy="29" rx="2.2" ry="1.3" fill="#ff88a9" opacity=".7"/><ellipse cx="33.5" cy="29" rx="2.2" ry="1.3" fill="#ff88a9" opacity=".7"/>'],
  bang: ['Exclamation', O('<path d="M24 3l5 9 10-3-3 10 9 5-9 5 3 10-10-3-5 9-5-9-10 3 3-10-9-5 9-5-3-10 10 3z"/>') + '<path d="M24 3l5 9 10-3-3 10 9 5-9 5 3 10-10-3-5 9-5-9-10 3 3-10-9-5 9-5-3-10 10 3z" fill="#ff6157"/><rect x="21.3" y="12" width="5.4" height="15" rx="2.7" fill="#fffaf0"/><circle cx="24" cy="33" r="3.1" fill="#fffaf0"/>'],
  what: ['Question', O('<path d="M9 8h30a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H23l-9 8v-8H9a5 5 0 0 1-5-5V13a5 5 0 0 1 5-5z"/>') + '<path d="M9 8h30a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H23l-9 8v-8H9a5 5 0 0 1-5-5V13a5 5 0 0 1 5-5z" fill="#1c92a7"/><path d="M18.5 18.5q0-6 5.5-6t5.5 5.4q0 4.4-5.5 5.4v3.2" stroke="#fffaf0" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="31" r="2.4" fill="#fffaf0"/>'],
  rainbow: ['Rainbow', '<path d="M5 37a19 19 0 0 1 38 0" stroke="#fffaf0" stroke-width="20" fill="none" stroke-linecap="round"/><path d="M7 37a17 17 0 0 1 34 0" stroke="#ff6157" stroke-width="4.6" fill="none"/><path d="M11.5 37a12.5 12.5 0 0 1 25 0" stroke="#ffd832" stroke-width="4.6" fill="none"/><path d="M16 37a8 8 0 0 1 16 0" stroke="#77d6c1" stroke-width="4.6" fill="none"/><g fill="#ffffe4" stroke="#bfc3c6" stroke-width="1.2"><path d="M2 41a4 4 0 0 1 3-6 5 5 0 0 1 9 1 3.5 3.5 0 0 1 0 5z"/><path d="M34 41a4 4 0 0 1 3-6 5 5 0 0 1 9 1 3.5 3.5 0 0 1 0 5z"/></g>'],
  star: ['Star', O('<path d="M24 4l5.9 12 13.1 1.9-9.5 9.3 2.3 13L24 34l-11.8 6.2 2.3-13L5 17.9 18.1 16z"/>') + '<path d="M24 4l5.9 12 13.1 1.9-9.5 9.3 2.3 13L24 34l-11.8 6.2 2.3-13L5 17.9 18.1 16z" fill="#ffd832"/><circle cx="20.5" cy="23" r="1.7" fill="#34111f"/><circle cx="27.5" cy="23" r="1.7" fill="#34111f"/><path d="M22 26.5q2 1.8 4 0" stroke="#34111f" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse cx="17.5" cy="26" rx="1.8" ry="1.1" fill="#ff823b" opacity=".6"/><ellipse cx="30.5" cy="26" rx="1.8" ry="1.1" fill="#ff823b" opacity=".6"/>'],
  heart: ['Heart', O('<path d="M24 41S6 30 6 18a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 12-18 23-18 23z"/>') + '<path d="M24 41S6 30 6 18a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 12-18 23-18 23z" fill="#ff88a9"/><path d="M12 16q1-4 5-4" stroke="#fffaf0" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>'],
  sparkle: ['Sparkle', O('<path d="M24 3c2 12 5 15 17 21-12 6-15 9-17 21-2-12-5-15-17-21 12-6 15-9 17-21z"/><path d="M39 5c.8 4.5 1.8 5.5 6 7-4.2 1.5-5.2 2.5-6 7-.8-4.5-1.8-5.5-6-7 4.2-1.5 5.2-2.5 6-7z"/>') + '<path d="M24 3c2 12 5 15 17 21-12 6-15 9-17 21-2-12-5-15-17-21 12-6 15-9 17-21z" fill="#ffd832"/><path d="M39 5c.8 4.5 1.8 5.5 6 7-4.2 1.5-5.2 2.5-6 7-.8-4.5-1.8-5.5-6-7 4.2-1.5 5.2-2.5 6-7z" fill="#ff88a9"/>'],
  flower: ['Flower', O('<circle cx="24" cy="12" r="8"/><circle cx="35.4" cy="20.3" r="8"/><circle cx="31" cy="33.7" r="8"/><circle cx="17" cy="33.7" r="8"/><circle cx="12.6" cy="20.3" r="8"/>') + '<g fill="#ff88a9"><circle cx="24" cy="12" r="8"/><circle cx="35.4" cy="20.3" r="8"/><circle cx="31" cy="33.7" r="8"/><circle cx="17" cy="33.7" r="8"/><circle cx="12.6" cy="20.3" r="8"/></g><circle cx="24" cy="24" r="6.5" fill="#ffd832"/><circle cx="22" cy="23" r="1.1" fill="#73392e"/><circle cx="26" cy="23" r="1.1" fill="#73392e"/><path d="M22.4 26q1.6 1.3 3.2 0" stroke="#73392e" stroke-width="1.1" fill="none" stroke-linecap="round"/>'],
  moon: ['Moon', O('<path d="M30 5a19 19 0 1 0 13 31A16 16 0 0 1 30 5z"/>') + '<path d="M30 5a19 19 0 1 0 13 31A16 16 0 0 1 30 5z" fill="#ffd832"/><path d="M15 25q2.5 2 5 0M22 31q2 1.5 4 0" stroke="#34111f" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="41" cy="9" r="1.6" fill="#ffd832"/><circle cx="45" cy="17" r="1.1" fill="#ffd832"/>'],
  cloud: ['Cloud', O('<path d="M13 37a8 8 0 0 1-1-16 11 11 0 0 1 21-4 9 9 0 0 1 3 20z"/>') + '<path d="M13 37a8 8 0 0 1-1-16 11 11 0 0 1 21-4 9 9 0 0 1 3 20z" fill="#ffffe4" stroke="#bfc3c6" stroke-width="1.4"/><circle cx="19" cy="27" r="1.5" fill="#34111f"/><circle cx="28" cy="27" r="1.5" fill="#34111f"/><path d="M21.5 30q2 1.6 4 0" stroke="#34111f" stroke-width="1.2" fill="none" stroke-linecap="round"/><ellipse cx="16" cy="30" rx="1.8" ry="1" fill="#ff88a9" opacity=".7"/><ellipse cx="31" cy="30" rx="1.8" ry="1" fill="#ff88a9" opacity=".7"/>'],
  note: ['Music', O('<path d="M18 34V11l20-5v23"/><circle cx="13" cy="35" r="6"/><circle cx="33" cy="30" r="6"/>') + '<path d="M18 34V11l20-5v23" stroke="#c03b94" stroke-width="4" fill="none" stroke-linejoin="round"/><path d="M18 16l20-5" stroke="#c03b94" stroke-width="4"/><circle cx="13" cy="35" r="6" fill="#c03b94"/><circle cx="33" cy="30" r="6" fill="#c03b94"/>'],
  paw: ['Paw', O('<ellipse cx="24" cy="31" rx="10" ry="8.5"/><ellipse cx="11" cy="20" rx="4.2" ry="5.2"/><ellipse cx="19" cy="12" rx="4.2" ry="5.4"/><ellipse cx="29" cy="12" rx="4.2" ry="5.4"/><ellipse cx="37" cy="20" rx="4.2" ry="5.2"/>') + '<g fill="#833f34"><ellipse cx="24" cy="31" rx="10" ry="8.5"/><ellipse cx="11" cy="20" rx="4.2" ry="5.2"/><ellipse cx="19" cy="12" rx="4.2" ry="5.4"/><ellipse cx="29" cy="12" rx="4.2" ry="5.4"/><ellipse cx="37" cy="20" rx="4.2" ry="5.2"/></g><ellipse cx="24" cy="31" rx="5.5" ry="4" fill="#ff88a9" opacity=".75"/>'],
  bolt: ['Lightning', O('<path d="M27 3L9 27h12l-4 18 20-26H25z"/>') + '<path d="M27 3L9 27h12l-4 18 20-26H25z" fill="#ffd832"/><path d="M23 10l-6 9" stroke="#fffaf0" stroke-width="2" stroke-linecap="round" opacity=".8"/>'],
  smile: ['Smile', O('<circle cx="24" cy="24" r="19"/>') + '<circle cx="24" cy="24" r="19" fill="#ffd832"/><path d="M16 21q2-3 4 0M28 21q2-3 4 0" stroke="#34111f" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M15 28q9 9 18 0" stroke="#34111f" stroke-width="2.2" fill="#d9243c" stroke-linejoin="round"/><ellipse cx="13" cy="27" rx="2.6" ry="1.5" fill="#ff823b" opacity=".6"/><ellipse cx="35" cy="27" rx="2.6" ry="1.5" fill="#ff823b" opacity=".6"/>'],
  coffee: ['Coffee', O('<path d="M10 19h24v12a9 9 0 0 1-9 9h-6a9 9 0 0 1-9-9z"/><path d="M34 22h3a5 5 0 0 1 0 10h-3"/>') + '<path d="M34 22h3a5 5 0 0 1 0 10h-3" stroke="#c76e46" stroke-width="3.4" fill="none"/><path d="M10 19h24v12a9 9 0 0 1-9 9h-6a9 9 0 0 1-9-9z" fill="#c76e46"/><path d="M10 19h24v3H10z" fill="#73392e"/><path d="M17 15q-2-3 0-6M23 15q-2-3 0-6M29 15q-2-3 0-6" stroke="#bfc3c6" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M19 29q3 2 6 0" stroke="#fffaf0" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="18" cy="26.5" r="1.1" fill="#fffaf0"/><circle cx="26" cy="26.5" r="1.1" fill="#fffaf0"/>'],
  mushroom: ['Mushroom', O('<path d="M5 24a19 16 0 0 1 38 0z"/><path d="M17 24h14l-2 15a5 5 0 0 1-10 0z"/>') + '<path d="M17 24h14l-2 15a5 5 0 0 1-10 0z" fill="#ffffe4" stroke="#e6d6b8" stroke-width="1"/><path d="M5 24a19 16 0 0 1 38 0z" fill="#d9243c"/><g fill="#fffaf0"><circle cx="16" cy="15" r="3"/><circle cx="28" cy="11" r="2.4"/><circle cx="34" cy="19" r="2.6"/><circle cx="22" cy="20" r="1.8"/></g><circle cx="21.5" cy="31" r="1.1" fill="#34111f"/><circle cx="26.5" cy="31" r="1.1" fill="#34111f"/>'],
  // weather
  sun: ['Sun', '<circle cx="24" cy="24" r="21" fill="#fffaf0"/><path d="M38 24h5.5M33.9 33.9l3.9 3.9M24 38v5.5M14.1 33.9l-3.9 3.9M10 24H4.5M14.1 14.1l-3.9-3.9M24 10V4.5M33.9 14.1l3.9-3.9" stroke="#ffb762" stroke-width="3.4" stroke-linecap="round"/><circle cx="24" cy="24" r="11" fill="#ffd832"/><circle cx="20.5" cy="23" r="1.5" fill="#34111f"/><circle cx="27.5" cy="23" r="1.5" fill="#34111f"/><path d="M21.8 26.5q2.2 1.8 4.4 0" stroke="#34111f" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse cx="17.5" cy="26.5" rx="1.8" ry="1" fill="#ff823b" opacity=".6"/><ellipse cx="30.5" cy="26.5" rx="1.8" ry="1" fill="#ff823b" opacity=".6"/>'],
  umbrella: ['Umbrella', O('<path d="M6 24a18 17 0 0 1 36 0z"/>') + '<path d="M24 24v13a4 4 0 0 1-8 0" stroke="#fffaf0" stroke-width="7.5" fill="none" stroke-linecap="round"/><path d="M24 24v13a4 4 0 0 1-8 0" stroke="#73392e" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M6 24a18 17 0 0 1 36 0q-3-3-6 0-3-3-6 0-3-3-6 0-3-3-6 0-3-3-6 0-3-3-6 0z" fill="#ff6157"/><path d="M24 7.5q-6 6-6 16M24 7.5q6 6 6 16" stroke="#d9243c" stroke-width="1.4" fill="none"/><path d="M24 7V4" stroke="#73392e" stroke-width="2.4" stroke-linecap="round"/>'],
  snow: ['Snowflake', '<g stroke="#fffaf0" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" fill="none">' + [0, 60, 120, 180, 240, 300].map(a => '<path d="M24 24V5M19 9l5 5 5-5" transform="rotate(' + a + ' 24 24)"/>').join('') + '</g><g stroke="#1c92a7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none">' + [0, 60, 120, 180, 240, 300].map(a => '<path d="M24 24V5M19 9l5 5 5-5" transform="rotate(' + a + ' 24 24)"/>').join('') + '</g><circle cx="24" cy="24" r="3.5" fill="#77d6c1"/>'],
  drop: ['Raindrop', O('<path d="M24 4S10 20 10 29a14 14 0 0 0 28 0C38 20 24 4 24 4z"/>') + '<path d="M24 4S10 20 10 29a14 14 0 0 0 28 0C38 20 24 4 24 4z" fill="#1c92a7"/><path d="M15 27q0-5 4-10" stroke="#77d6c1" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="20.5" cy="30" r="1.5" fill="#041528"/><circle cx="27.5" cy="30" r="1.5" fill="#041528"/><path d="M22 33.5q2 1.6 4 0" stroke="#041528" stroke-width="1.3" fill="none" stroke-linecap="round"/>'],
  snowman: ['Snowman', O('<circle cx="24" cy="33" r="11"/><circle cx="24" cy="15" r="8.5"/>') + '<g fill="#ffffe4" stroke="#bfc3c6" stroke-width="1.2"><circle cx="24" cy="33" r="11"/><circle cx="24" cy="15" r="8.5"/></g><path d="M15.5 21.5h17v4h-17z" fill="#d9243c"/><path d="M27 24l2 8h3.5l-2-8z" fill="#d9243c"/><circle cx="21" cy="13.5" r="1.3" fill="#34111f"/><circle cx="27" cy="13.5" r="1.3" fill="#34111f"/><path d="M24 15.5l6 1.6-6 1.2z" fill="#ff823b"/><circle cx="24" cy="31" r="1.3" fill="#34111f"/><circle cx="24" cy="36" r="1.3" fill="#34111f"/>'],
  storm: ['Storm', O('<path d="M13 30a8 8 0 0 1-1-16 11 11 0 0 1 21-4 9 9 0 0 1 3 20z"/><path d="M24 28l-5 9h5l-3 8 9-11h-5l3-6z"/>') + '<path d="M24 28l-5 9h5l-3 8 9-11h-5l3-6z" fill="#ffd832"/><path d="M13 30a8 8 0 0 1-1-16 11 11 0 0 1 21-4 9 9 0 0 1 3 20z" fill="#bfc3c6" stroke="#6d8a8d" stroke-width="1.4"/><path d="M18 21l3 1.5M30 21l-3 1.5" stroke="#34111f" stroke-width="1.5" stroke-linecap="round"/><path d="M21.5 26q2.5-1.6 5 0" stroke="#34111f" stroke-width="1.3" fill="none" stroke-linecap="round"/>'],
  // food
  berry: ['Strawberry', O('<path d="M24 43C14 37 8 28 9 21c1-5 6-7 15-7s14 2 15 7c1 7-5 16-15 22z"/><path d="M15 15q4-7 9-1 5-6 9 1-4 3-9 1-5 2-9-1z"/>') + '<path d="M24 43C14 37 8 28 9 21c1-5 6-7 15-7s14 2 15 7c1 7-5 16-15 22z" fill="#d9243c"/><path d="M15 15q4-7 9-1 5-6 9 1-4 3-9 1-5 2-9-1z" fill="#9cb93b"/><g fill="#ffd832"><ellipse cx="14" cy="24" rx=".8" ry="1.2"/><ellipse cx="34" cy="24" rx=".8" ry="1.2"/><ellipse cx="18" cy="34" rx=".8" ry="1.2"/><ellipse cx="30" cy="34" rx=".8" ry="1.2"/><ellipse cx="24" cy="38" rx=".8" ry="1.2"/></g><circle cx="20.5" cy="25" r="1.5" fill="#34111f"/><circle cx="27.5" cy="25" r="1.5" fill="#34111f"/><path d="M22 28.5q2 1.6 4 0" stroke="#34111f" stroke-width="1.3" fill="none" stroke-linecap="round"/>'],
  onigiri: ['Onigiri', O('<path d="M24 6c3 0 5 2 7 5l11 20c3 6-1 11-7 11H13c-6 0-10-5-7-11l11-20c2-3 4-5 7-5z"/>') + '<path d="M24 6c3 0 5 2 7 5l11 20c3 6-1 11-7 11H13c-6 0-10-5-7-11l11-20c2-3 4-5 7-5z" fill="#ffffe4" stroke="#bfc3c6" stroke-width="1.2"/><path d="M16 32h16v10H16z" fill="#273b2d"/><circle cx="20" cy="25" r="1.5" fill="#34111f"/><circle cx="28" cy="25" r="1.5" fill="#34111f"/><path d="M22 28q2 1.6 4 0" stroke="#34111f" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse cx="16.5" cy="28" rx="1.8" ry="1" fill="#ff88a9" opacity=".75"/><ellipse cx="31.5" cy="28" rx="1.8" ry="1" fill="#ff88a9" opacity=".75"/>'],
  toast: ['Toast', O('<path d="M10 20a8 8 0 0 1 5-13h18a8 8 0 0 1 5 13v18a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z"/>') + '<path d="M10 20a8 8 0 0 1 5-13h18a8 8 0 0 1 5 13v18a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z" fill="#c76e46"/><path d="M14 21a5 5 0 0 1 3-10h14a5 5 0 0 1 3 10v15a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2z" fill="#ffdaac"/><rect x="19" y="14" width="10" height="7" rx="1.5" fill="#ffd832" transform="rotate(-8 24 17)"/><circle cx="20.5" cy="27" r="1.5" fill="#34111f"/><circle cx="27.5" cy="27" r="1.5" fill="#34111f"/><path d="M22 30.5q2 1.6 4 0" stroke="#34111f" stroke-width="1.3" fill="none" stroke-linecap="round"/>'],
  cherry: ['Cherries', O('<circle cx="15" cy="35" r="8"/><circle cx="33" cy="36" r="8"/><path d="M31 6q8-3 11 3-7 3-11-3z"/>') + '<path d="M15 27q4-14 16-21M33 28q-3-12-2-22" stroke="#fffaf0" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M15 27q4-14 16-21M33 28q-3-12-2-22" stroke="#458239" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M31 6q8-3 11 3-7 3-11-3z" fill="#9cb93b"/><g fill="#d9243c"><circle cx="15" cy="35" r="8"/><circle cx="33" cy="36" r="8"/></g><path d="M10.5 33q1-3 4-3.5M28.5 34q1-3 4-3.5" stroke="#ffe0dc" stroke-width="1.8" fill="none" stroke-linecap="round"/>'],
  donut: ['Donut', O('<circle cx="24" cy="24" r="18"/>') + '<circle cx="24" cy="24" r="18" fill="#eb9c6e"/><path d="M24 9c6 0 13 4 14 10 1 4-2 5-2 9s-3 7-7 7c-3 0-3 3-6 3s-5-3-8-4-6-5-5-9-2-5-1-9c2-5 8-7 15-7z" fill="#ff88a9"/><circle cx="24" cy="24" r="5" fill="#fffaf0"/><g stroke-width="2" stroke-linecap="round"><path d="M17 15l2 1" stroke="#ffd832"/><path d="M30 14l-1 2" stroke="#77d6c1"/><path d="M33 23l2 1" stroke="#fffaf0"/><path d="M15 26l1 2" stroke="#77d6c1"/><path d="M27 32l2-1" stroke="#ffd832"/><path d="M19 31l1 2" stroke="#c03b94"/><path d="M23 13l2 0" stroke="#c03b94"/></g>'],
  icecream: ['Ice cream', O('<path d="M16 24l8 20 8-20z"/><circle cx="24" cy="17" r="10"/><circle cx="24" cy="6" r="2.6"/>') + '<path d="M16 24l8 20 8-20z" fill="#eb9c6e"/><path d="M19 27l9 7M18 31l6-5M22 38l6-6M29 27l-9 9" stroke="#c76e46" stroke-width="1.2"/><circle cx="24" cy="17" r="10" fill="#ff88a9"/><path d="M14 19q1 5 4 3 2 4 4 0 2 4 4 0 2 4 4 0 3 2 4-3z" fill="#ff88a9"/><circle cx="24" cy="6" r="2.6" fill="#d9243c"/><circle cx="20.5" cy="17" r="1.4" fill="#34111f"/><circle cx="27.5" cy="17" r="1.4" fill="#34111f"/><path d="M22.2 20q1.8 1.5 3.6 0" stroke="#34111f" stroke-width="1.2" fill="none" stroke-linecap="round"/>'],
  // school
  pencil: ['Pencil', '<g transform="rotate(-40 24 24)">' + O('<path d="M2 21a2 2 0 0 1 2-2h30l9 5-9 5H4a2 2 0 0 1-2-2z"/>') + '<path d="M8 19h26v10H8z" fill="#ffd832"/><path d="M11 24h23" stroke="#ffb762" stroke-width="1.4"/><path d="M34 19l9 5-9 5z" fill="#ffdaac"/><path d="M40.3 22.5L43 24l-2.7 1.5z" fill="#34111f"/><path d="M4 19h4v10H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" fill="#ff88a9"/><path d="M8 19h3v10H8z" fill="#bfc3c6"/></g>'],
  aplus: ['A+', O('<path d="M11 5h19l8 8v30H11z"/>') + '<path d="M11 5h19l8 8v30H11z" fill="#ffffe4" stroke="#bfc3c6" stroke-width="1.2"/><path d="M30 5v8h8" fill="#e6d6b8" stroke="#bfc3c6" stroke-width="1.2" stroke-linejoin="round"/><path d="M15 36h19M15 39.5h13" stroke="#bfc3c6" stroke-width="1.2"/><path d="M15 30l5.5-15 5.5 15M17.2 24.5h6.6" stroke="#d9243c" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M31 18v8M27 22h8" stroke="#d9243c" stroke-width="2.6" stroke-linecap="round"/>'],
  ruler: ['Ruler', '<g transform="rotate(-25 24 24)">' + O('<rect x="3" y="17" width="42" height="13" rx="2"/>') + '<rect x="3" y="17" width="42" height="13" rx="2" fill="#ffd832"/><path d="M7 17v4M11 17v6M15 17v4M19 17v6M23 17v4M27 17v6M31 17v4M35 17v6M39 17v4" stroke="#73392e" stroke-width="1.2"/></g>'],
  clip: ['Paperclip', '<g transform="rotate(25 24 24)"><path d="M30 13v19a6 6 0 0 1-12 0V11a4.5 4.5 0 0 1 9 0v19a2.5 2.5 0 0 1-5 0V15" stroke="#fffaf0" stroke-width="8.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 13v19a6 6 0 0 1-12 0V11a4.5 4.5 0 0 1 9 0v19a2.5 2.5 0 0 1-5 0V15" stroke="#6d8a8d" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>'],
  apple: ['Apple', O('<path d="M24 15c-4-3-14-3-15 8-1 9 6 19 11 19 2 0 3-1 4-1s2 1 4 1c5 0 12-10 11-19-1-11-11-11-15-8z"/><path d="M25 11q5-6 11-3-5 6-11 3z"/>') + '<path d="M24 15c-4-3-14-3-15 8-1 9 6 19 11 19 2 0 3-1 4-1s2 1 4 1c5 0 12-10 11-19-1-11-11-11-15-8z" fill="#d9243c"/><path d="M24 15q0-5 3-8" stroke="#73392e" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M25 11q5-6 11-3-5 6-11 3z" fill="#9cb93b"/><path d="M13 21q1-3 4-4" stroke="#ffe0dc" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="20.5" cy="26" r="1.5" fill="#34111f"/><circle cx="27.5" cy="26" r="1.5" fill="#34111f"/><path d="M22 29.5q2 1.6 4 0" stroke="#34111f" stroke-width="1.3" fill="none" stroke-linecap="round"/>'],
  tick: ['Done', O('<circle cx="24" cy="24" r="18"/>') + '<circle cx="24" cy="24" r="18" fill="#458239"/><circle cx="24" cy="24" r="14.5" fill="none" stroke="#9cb93b" stroke-width="1.2" stroke-dasharray="2 2.4"/><path d="M15.5 24.5l6 6 11-12" stroke="#ffffe4" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'],
  // nature
  leaf: ['Leaf', O('<path d="M8 40C8 20 20 8 40 8c0 20-12 32-32 32z"/>') + '<path d="M8 40C8 20 20 8 40 8c0 20-12 32-32 32z" fill="#9cb93b"/><path d="M8 40L33 15M17 31l-1-8M23 25l-1-9M17 31l8 1M23 25l9 1" stroke="#458239" stroke-width="1.6" fill="none" stroke-linecap="round"/>'],
  cactus: ['Cactus', O('<path d="M19 40V14a5 5 0 0 1 10 0v26z"/><path d="M19 32h-5a5 5 0 0 1-5-5v-7a3 3 0 0 1 6 0v6h4z"/><path d="M29 28h5v-7a3 3 0 0 1 6 0v8a5 5 0 0 1-5 5h-6z"/><path d="M13 37h22l-3 8H16z"/>') + '<g fill="#458239"><path d="M19 40V14a5 5 0 0 1 10 0v26z"/><path d="M19 32h-5a5 5 0 0 1-5-5v-7a3 3 0 0 1 6 0v6h4z"/><path d="M29 28h5v-7a3 3 0 0 1 6 0v8a5 5 0 0 1-5 5h-6z"/></g><path d="M13 37h22l-3 8H16z" fill="#c76e46"/><path d="M12 36h24v3H12z" fill="#eb9c6e"/><circle cx="24" cy="8.5" r="3" fill="#ff88a9"/><circle cx="21.5" cy="21" r="1.3" fill="#273b2d"/><circle cx="26.5" cy="21" r="1.3" fill="#273b2d"/><path d="M22.5 24q1.5 1.3 3 0" stroke="#273b2d" stroke-width="1.2" fill="none" stroke-linecap="round"/>'],
  bee: ['Bee', O('<ellipse cx="24" cy="28" rx="12" ry="9"/><ellipse cx="19" cy="15" rx="5" ry="7" transform="rotate(-20 19 15)"/><ellipse cx="29" cy="15" rx="5" ry="7" transform="rotate(20 29 15)"/>') + '<g fill="#ffffe4" stroke="#bfc3c6" stroke-width="1.2"><ellipse cx="19" cy="15" rx="5" ry="7" transform="rotate(-20 19 15)"/><ellipse cx="29" cy="15" rx="5" ry="7" transform="rotate(20 29 15)"/></g><path d="M35 27l6 1-6 2z" fill="#34111f"/><ellipse cx="24" cy="28" rx="12" ry="9" fill="#ffd832"/><path d="M22 19.5v17M29 20.5v15" stroke="#34111f" stroke-width="3"/><circle cx="16" cy="26" r="1.5" fill="#34111f"/><path d="M14.5 30q1.8 1.3 3.4-.2" stroke="#34111f" stroke-width="1.2" fill="none" stroke-linecap="round"/>'],
  clover: ['Clover', '<path d="M28 31q5 6 2 13" stroke="#fffaf0" stroke-width="7" fill="none" stroke-linecap="round"/>' + O('<circle cx="18" cy="17" r="7.5"/><circle cx="30" cy="17" r="7.5"/><circle cx="18" cy="29" r="7.5"/><circle cx="30" cy="29" r="7.5"/>') + '<path d="M28 31q5 6 2 13" stroke="#458239" stroke-width="2.4" fill="none" stroke-linecap="round"/><g fill="#458239"><circle cx="18" cy="17" r="7.5"/><circle cx="30" cy="17" r="7.5"/><circle cx="18" cy="29" r="7.5"/><circle cx="30" cy="29" r="7.5"/></g><g fill="#9cb93b"><circle cx="17" cy="16" r="3"/><circle cx="31" cy="16" r="3"/><circle cx="17" cy="30" r="3"/><circle cx="31" cy="30" r="3"/></g>'],
  tulip: ['Tulip', '<path d="M24 32v13" stroke="#fffaf0" stroke-width="7" stroke-linecap="round"/>' + O('<path d="M14 11l5 5 5-8 5 8 5-5v10a10 10 0 0 1-20 0z"/><path d="M24 42q-9-1-11-10 8 0 11 8z"/>') + '<path d="M24 32v13" stroke="#458239" stroke-width="2.6" stroke-linecap="round"/><path d="M24 42q-9-1-11-10 8 0 11 8z" fill="#9cb93b"/><path d="M14 11l5 5 5-8 5 8 5-5v10a10 10 0 0 1-20 0z" fill="#ff6157"/><path d="M24 8v14" stroke="#d9243c" stroke-width="1.4"/>'],
  butterfly: ['Butterfly', O('<path d="M24 22C18 8 6 6 5 14s8 12 19 10z"/><path d="M24 22C30 8 42 6 43 14s-8 12-19 10z"/><path d="M24 25c-10 0-16 4-14 10s10 3 14-8z"/><path d="M24 25c10 0 16 4 14 10s-10 3-14-8z"/>') + '<g fill="#c03b94"><path d="M24 22C18 8 6 6 5 14s8 12 19 10z"/><path d="M24 22C30 8 42 6 43 14s-8 12-19 10z"/></g><g fill="#ff88a9"><path d="M24 25c-10 0-16 4-14 10s10 3 14-8z"/><path d="M24 25c10 0 16 4 14 10s-10 3-14-8z"/></g><g fill="#ffdaac"><circle cx="12" cy="15" r="2.4"/><circle cx="36" cy="15" r="2.4"/><circle cx="15" cy="32" r="1.6"/><circle cx="33" cy="32" r="1.6"/></g><path d="M24 15v19" stroke="#34111f" stroke-width="3" stroke-linecap="round"/><path d="M24 16q-2-6-5-8M24 16q2-6 5-8" stroke="#34111f" stroke-width="1.4" fill="none" stroke-linecap="round"/>'],
};
// the tray, in packs (a tab each)
const STICKER_PACKS = [['Cute', ['cat', 'bang', 'what', 'rainbow', 'star', 'heart', 'sparkle', 'flower', 'moon', 'cloud', 'note', 'paw', 'bolt', 'smile', 'coffee', 'mushroom']],
  ['Weather', ['sun', 'umbrella', 'snow', 'drop', 'snowman', 'storm']], ['Food', ['berry', 'onigiri', 'toast', 'cherry', 'donut', 'icecream']],
  ['School', ['pencil', 'aplus', 'ruler', 'clip', 'apple', 'tick']], ['Nature', ['leaf', 'cactus', 'bee', 'clover', 'tulip', 'butterfly']]];
const stickerSvg = k => '<svg viewBox="0 0 48 48" aria-hidden="true">' + (STICKERS[k] || STICKERS.star)[1] + '</svg>';
// and a pack of words and faces: kaomoji and ASCII emoji, or anything you type (a sticker { k: 'txt', t: 'what it says' })
const KAOMOJI = ['(=^･ω･^=)', '(◕‿◕)', 'ʕ•ᴥ•ʔ', '(｡♥‿♥｡)', '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧', '(•̀ᴗ•́)و', '¯\\_(ツ)_/¯', '(╯°□°)╯︵ ┻━┻', '(T_T)', '(>_<)', '(・_・;)', '( ˘ω˘ )ｽﾔｧ',
  ':)', ':D', ';)', ':3', '<3', '^_^', 'xD', 'o_O', 'owo', '~♪', '★', 'OK!', 'TODO', 'wow!'];
STICKER_PACKS.push(['Kaomoji', null]);
const stkText = v => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, 30) : '';
const stkName = s => s.k === 'txt' ? '"' + s.t + '"' : (STICKERS[s.k] || STICKERS.star)[0];
function stkPaint(e, s) { if (s.k === 'txt') { e.classList.add('txt'); e.textContent = s.t; } else e.innerHTML = stickerSvg(s.k); return e; }
// the Kaomoji tab: write your own (it shows as a sticker you can use), or pick one. use(t) sticks it, or starts carrying it
function kaoPanel(use, carry) {
  const own = el('button', { type: 'button', class: 'sx-deco-st txt own', 'data-k': 'txt', 'data-t': '', disabled: true, title: carry ? 'Drag it onto a card' : 'Stick it on' }, 'Type above');
  const inp = el('input', { type: 'text', class: 'sx-kao-in', maxlength: '30', placeholder: 'Write your own: (=^･ω･^=)', 'aria-label': 'A sticker of your own words' });
  inp.addEventListener('input', () => { const t = stkText(inp.value); own.dataset.t = t; own.textContent = t || 'Type above'; own.disabled = !t; });
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && own.dataset.t && !carry) { e.preventDefault(); use(own.dataset.t); } if (e.key === 'Escape') inp.blur(); });
  if (!carry) own.addEventListener('click', () => { if (own.dataset.t) use(own.dataset.t); });
  const picks = KAOMOJI.map(t => { const b = el('button', { type: 'button', class: 'sx-deco-st txt', 'data-k': 'txt', 'data-t': t, title: t }, t); if (!carry) b.addEventListener('click', () => use(t)); return b; });
  return el('div', { class: 'sx-kao' }, el('div', { class: 'sx-kao-row' }, inp, own), el('div', { class: 'sx-kao-picks' }, ...picks));
}
// the title's look, the corner pieces, and the elastic band (any of the 32 colours, or none)
const TITLE_STYLES = [['', 'Bold'], ['round', 'Round'], ['type', 'Typewriter'], ['script', 'Script'], ['stamp', 'Stamp'], ['emboss', 'Embossed']];
const SPINES = [['', 'Plain'], ['stripes', 'Stripes'], ['bands', 'Bands'], ['dots', 'Dots'], ['stitch', 'Stitched']]; // (the spine: its colour, b.spine, a pattern on it, b.spineP, and the pattern's colour, b.spineInk)
const CORNERS = [['', 'None'], ['brass', 'Brass'], ['leather', 'Leather'], ['cream', 'Cream'], ['ink', 'Like the title']];
// more of the cover: its material (b.mat), a
// subtitle (b.sub), foil on the title (b.foil), the pages' edges (b.edge, b.edgeCol), how it's held shut (b.strap, in the
// band's colour b.band), and little extras on it (b.extras)
// the kind of book: a hardcover; a spiral-bound notebook (wire rings down the side, the holes punched through the cover);
// a composition book (a marbled cover, a black cloth spine); a diary (a strap across, with a little padlock) (b.kind)
const KINDS = [['', 'Hardcover'], ['spiral', 'Spiral'], ['comp', 'Composition'], ['diary', 'Diary with a lock']];
const DIARY_LOCK = '<svg viewBox="0 0 40 30" aria-hidden="true"><path d="M17 9V6.5a5 5 0 0 1 10 0V9" fill="none" stroke="#bfc3c6" stroke-width="2.6"/><path d="M17 9V6.5a5 5 0 0 1 10 0V9" fill="none" stroke="#6d8a8d" stroke-width="1" stroke-opacity=".6"/><rect x="13" y="9" width="18" height="15" rx="2.5" fill="#ffd832" stroke="#ffb762" stroke-width="1.4"/><path d="M15 11.5h14" stroke="#ffffe4" stroke-width="1.2" stroke-opacity=".7"/><circle cx="22" cy="15.6" r="2" fill="#73392e"/><path d="M22 16.5v4" stroke="#73392e" stroke-width="1.6" stroke-linecap="round"/></svg>';
const MATERIALS = [['', 'Plain'], ['cloth', 'Cloth'], ['linen', 'Linen'], ['leather', 'Leather'], ['kraft', 'Kraft'], ['velvet', 'Velvet'], ['gloss', 'Glossy']];
const FOILS = [['', 'None'], ['gold', 'Gold'], ['holo', 'Holographic']];
const EDGES = [['', 'Plain'], ['gold', 'Gilded'], ['rainbow', 'Rainbow'], ['speckle', 'Speckled'], ['tint', 'Coloured']];
const STRAPS = [['', 'Elastic'], ['ribbon', 'Ribbon bow'], ['buckle', 'Buckle strap'], ['clasp', 'Clasp']];
const STRAP_BITS = {
  ribbon: ['0 0 60 40', '<path d="M30 20C22 6 6 4 6 14s16 10 24 6z" fill="currentColor"/><path d="M30 20C38 6 54 4 54 14s-16 10-24 6z" fill="currentColor"/><path d="M28 21l-8 17 6-2 4 4 2-18zM32 21l8 17-6-2-4 4-2-18z" fill="currentColor"/><path d="M30 20C22 6 6 4 6 14M30 20C38 6 54 4 54 14" stroke="#030710" stroke-opacity=".22" stroke-width="1.4" fill="none"/><circle cx="30" cy="20" r="5" fill="currentColor"/><circle cx="30" cy="20" r="5" fill="#030710" fill-opacity=".14"/>'],
  buckle: ['0 0 40 40', '<rect x="4" y="4" width="32" height="32" rx="5" fill="none" stroke="#ffb762" stroke-width="5"/><rect x="4" y="4" width="32" height="32" rx="5" fill="none" stroke="#73392e" stroke-opacity=".45" stroke-width="1"/><path d="M20 4v32" stroke="#ffd832" stroke-width="3"/>'],
  clasp: ['0 0 40 40', '<rect x="6" y="10" width="28" height="20" rx="6" fill="#ffd832" stroke="#c76e46" stroke-width="2"/><rect x="10" y="13" width="20" height="4" rx="2" fill="#ffffe4" fill-opacity=".6"/><circle cx="20" cy="21" r="4" fill="#c76e46"/>'],
};
const EXTRAS = [['pen', 'Pen', '0 0 20 100', '<rect x="6" y="14" width="8" height="74" rx="3" fill="#293b49"/><path d="M6 86h8l-4 12z" fill="#ffdaac"/><path d="M8.8 94.5h2.4L10 98z" fill="#34111f"/><path d="M13 10h4v42a2 2 0 0 1-4 0z" fill="#bfc3c6"/><rect x="5" y="8" width="10" height="10" rx="2" fill="#bfc3c6"/><rect x="6" y="2" width="8" height="8" rx="3" fill="#d9243c"/>'],
  ['note', 'Sticky note', '0 0 40 40', '<path d="M2 2h36v28l-8 8H2z" fill="#ffd832"/><path d="M30 38v-8h8z" fill="#ffb762"/><path d="M8 12h22M8 19h22M8 26h14" stroke="#c76e46" stroke-width="1.6" stroke-opacity=".55"/>'],
  ['flower', 'Pressed flower', '0 0 40 60', '<path d="M20 58C19 46 21 36 20 24" stroke="#458239" stroke-width="1.6" fill="none"/><path d="M20 44q-9-2-11-9 8 1 11 7z" fill="#9cb93b"/><path d="M20 38q8-3 11-10-8 1-11 8z" fill="#9cb93b"/>' + [0, 45, 90, 135, 180, 225, 270, 315].map(a => '<ellipse cx="20" cy="10" rx="3.2" ry="7" fill="#ffffe4" fill-opacity=".92" transform="rotate(' + a + ' 20 18)"/>').join('') + '<circle cx="20" cy="18" r="4" fill="#ffb762"/>'],
  ['clip', 'Paperclip', '0 0 20 60', '<path d="M13 8v34a4 4 0 0 1-8 0V12a2.6 2.6 0 0 1 5.2 0v28" stroke="#bfc3c6" stroke-width="2.4" fill="none" stroke-linecap="round"/>']];
S.board.items.forEach(it => { if (it.type === 'book') ['pat', 'patInk', 'label', 'dc'].forEach(k => delete it[k]); }); // (and drop caps, versions 219 to 223) // (labels and patterns were here briefly, in version 216)
// the wax seal (b.seal, its colour): a blob of wax pressed with an initial (b.sealT, the title's first letter if not said)
// or a little picture (b.sealI)
const SEAL_ICONS = [['heart', 'Heart', '<path d="M30 41s-10-6.3-10-12.2a5 5 0 0 1 10-1.4 5 5 0 0 1 10 1.4C40 34.7 30 41 30 41z"/>'],
  ['star', 'Star', '<path d="M30 18l3.4 7 7.6 1.1-5.5 5.4 1.3 7.6L30 35.5l-6.8 3.6 1.3-7.6-5.5-5.4 7.6-1.1z"/>'],
  ['moon', 'Moon', '<path d="M34 18a12 12 0 1 0 8 19 10 10 0 0 1-8-19z"/>'],
  ['leaf', 'Leaf', '<path d="M20 40c0-12 8-20 20-20 0 12-8 20-20 20z"/>']];
const SEAL_BLOB = (() => { let d = ''; for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI * 2, rr = 26 + (i % 2 ? 2.4 : -.6) + Math.sin(i * 1.7) * 1.1; d += (i ? 'L' : 'M') + (30 + Math.cos(a) * rr).toFixed(1) + ' ' + (30 + Math.sin(a) * rr).toFixed(1); } return d + 'Z'; })();
const sealText = b => { const t = typeof b.sealT === 'string' && b.sealT.trim() ? b.sealT.trim() : String(b.title || 'A').trim().charAt(0); return (t || 'A').slice(0, 2).toUpperCase(); };
function sealSvg(b) {
  const ic = SEAL_ICONS.find(x => x[0] === b.sealI), esc = v => v.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]), t = esc(sealText(b));
  const mark = ic ? '<g fill="#030710" fill-opacity=".45" transform="translate(0 1)">' + ic[2] + '</g><g fill="#ffffff" fill-opacity=".3">' + ic[2] + '</g>'
    : '<text x="30" y="37.5" text-anchor="middle" font-size="' + (t.length > 1 ? 16 : 21) + '" font-weight="700" font-family="Barlow C, sans-serif" fill="#030710" fill-opacity=".45">' + t + '</text><text x="30" y="36.5" text-anchor="middle" font-size="' + (t.length > 1 ? 16 : 21) + '" font-weight="700" font-family="Barlow C, sans-serif" fill="#ffffff" fill-opacity=".32">' + t + '</text>';
  return '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="' + SEAL_BLOB + '" fill="currentColor"/><path d="' + SEAL_BLOB + '" fill="#030710" fill-opacity=".12" transform="translate(1 2) scale(.97)"/><circle cx="30" cy="30" r="17.5" fill="currentColor"/><circle cx="30" cy="30" r="17.5" fill="none" stroke="#030710" stroke-opacity=".28" stroke-width="2"/><circle cx="30" cy="30" r="15.5" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="1"/>' + mark + '<ellipse cx="21" cy="17" rx="7" ry="3.5" fill="#ffffff" fill-opacity=".22" transform="rotate(-30 21 17)"/></svg>';
}
// a charm hanging from the cover's top corner on a little chain (b.charm), swaying as the book moves on the desk
const CHARMS = [['heart', 'Heart', '<path d="M20 34S7 26 7 17a6.5 6.5 0 0 1 13-2.5A6.5 6.5 0 0 1 33 17c0 9-13 17-13 17z" fill="#ff88a9" stroke="#c03b94" stroke-width="1.6"/><path d="M12 15q1-3 4-3" stroke="#ffffe4" stroke-width="2" fill="none" stroke-linecap="round"/>'],
  ['star', 'Star', '<path d="M20 5l4.4 9 9.8 1.4-7.1 6.9 1.7 9.8L20 27.5l-8.8 4.6 1.7-9.8-7.1-6.9 9.8-1.4z" fill="#ffd832" stroke="#ffb762" stroke-width="1.6" stroke-linejoin="round"/>'],
  ['key', 'Key', '<circle cx="20" cy="11" r="7" fill="none" stroke="#ffb762" stroke-width="3.4"/><path d="M20 18v18M20 28h6M20 34h4" stroke="#ffb762" stroke-width="3.4" stroke-linecap="round"/><circle cx="20" cy="11" r="7" fill="none" stroke="#c76e46" stroke-width="1" stroke-opacity=".5"/>'],
  ['cat', 'Cat', '<path d="M8 14L10 4l7 6q3-1 6 0l7-6 2 10q3 7 0 13-5 7-12 7T8 27q-3-6 0-13z" fill="#ffb762" stroke="#c76e46" stroke-width="1.4"/><circle cx="15" cy="19" r="2" fill="#34111f"/><circle cx="25" cy="19" r="2" fill="#34111f"/><path d="M18.5 23h3l-1.5 2z" fill="#d9243c"/>'],
  ['moon', 'Moon', '<path d="M24 5a15 15 0 1 0 10 25A12.5 12.5 0 0 1 24 5z" fill="#ffffe4" stroke="#ffd832" stroke-width="1.8"/><circle cx="16" cy="22" r="1.6" fill="#ffd832"/>']];
function charmEl(k) {
  const x = CHARMS.find(c => c[0] === k); if (!x) return null;
  const e = el('i', { class: 'sx-charm', 'data-charm': k, 'aria-hidden': 'true' });
  e.innerHTML = '<svg viewBox="0 0 40 92" aria-hidden="true"><path d="M20 0v50" stroke="#6d8a8d" stroke-width="2.6" stroke-dasharray="3.2 1.6" stroke-linecap="round"/><circle cx="20" cy="1.5" r="2.6" fill="#bfc3c6" stroke="#6d8a8d" stroke-width="1.2"/><circle cx="20" cy="52" r="3" fill="none" stroke="#6d8a8d" stroke-width="2"/><g transform="translate(0 52)">' + x[2] + '</g></svg>';
  return e;
}
// a book's look: everything about how it looks, but not what it says (its title, the line under it, the seal's letters),
// its picture or its stickers. Copied from one book, pasted onto another (kept until Cassie closes)
const BOOK_LOOK = ['kind', 'bg', 'color', 'ink', 'tf', 'mat', 'foil', 'spine', 'spineP', 'spineInk', 'edge', 'edgeCol', 'corners', 'band', 'strap', 'extras', 'seal', 'sealI', 'charm', 'ribbon'];
let bookLookCopied = null;
function bookLookCopy(id) { const b = bookOf(id); if (!b) return; bookLookCopied = {}; BOOK_LOOK.forEach(k => { if (b[k] !== undefined) bookLookCopied[k] = JSON.parse(JSON.stringify(b[k])); }); deskToast('Copied the look of ' + (b.title || 'the book') + ': paste it onto another book'); deskSfx('pick'); }
function bookLookPaste(id, marked) {
  const b = bookOf(id); if (!b || !bookLookCopied) return; if (!marked) deskMark();
  BOOK_LOOK.forEach(k => { if (bookLookCopied[k] !== undefined) b[k] = JSON.parse(JSON.stringify(bookLookCopied[k])); else delete b[k]; });
  save(); drawBoard(); deskSfx('pin'); deskToast('Pasted the look onto ' + (b.title || 'the book'));
}
// Surprise me: a good-looking combination, rolled at random: a cover colour, a spine and title that go with it, and now
// and then a material, foil, edges, corners, a strap, a seal or a charm. (Press it again for another; Undo goes back)
function bookSurprise(b) {
  const pick = a => a[Math.floor(Math.random() * a.length)], maybe = p => Math.random() < p;
  const shade = hex => { const n = parseInt(hex.slice(1), 16), l = ((n >> 16 & 255) * 299 + (n >> 8 & 255) * 587 + (n & 255) * 114) / 1000; return l; };
  const bg = pick(PALETTE.filter(h => !['#030710', '#ffffe4', '#bfc3c6', '#ffe0dc'].includes(h))), light = shade(bg) > 140;
  const darker = PALETTE.filter(h => shade(h) < shade(bg) - 40), lighter = PALETTE.filter(h => shade(h) > shade(bg) + 60);
  BOOK_LOOK.forEach(k => delete b[k]);
  b.bg = bg;
  if (maybe(.35) && (light ? darker : lighter).length) b.ink = pick(light ? darker : lighter);
  if (maybe(.6)) b.mat = pick(MATERIALS.slice(1))[0];
  if (maybe(.3)) b.kind = pick(KINDS.slice(1))[0];
  if (maybe(.3)) b.tf = pick(TITLE_STYLES.slice(1))[0];
  if (maybe(.25)) b.foil = pick(FOILS.slice(1))[0];
  if (darker.length && maybe(.7)) b.spine = pick(darker);
  if (maybe(.4)) b.spineP = pick(SPINES.slice(1))[0];
  if (maybe(.35)) b.edge = pick(EDGES.slice(1, 4))[0];
  if (maybe(.3)) b.corners = pick(CORNERS.slice(1, 4))[0];
  if (maybe(.35)) { b.band = pick(PALETTE.filter(h => Math.abs(shade(h) - shade(bg)) > 50)); const st = pick(STRAPS)[0]; if (st) b.strap = st; }
  if (maybe(.3)) { b.seal = pick(['#d9243c', '#7c191a', '#601761', '#033e5e', '#458239', '#c76e46']); if (maybe(.4)) b.sealI = pick(SEAL_ICONS)[0]; }
  if (maybe(.25)) b.charm = pick(CHARMS)[0];
  if (maybe(.2)) b.extras = [pick(EXTRAS)[0]];
}
const decoSvg = (box, inner) => '<svg viewBox="' + box + '" aria-hidden="true">' + inner + '</svg>';
// what may be kept (from a backup, or a friend): known stickers, on the cover, a dozen at most; known styles; palette colours
function bookStkClean(v) {
  const n = (x, lo, hi, d) => isFinite(+x) ? Math.max(lo, Math.min(hi, +x)) : d;
  return (Array.isArray(v) ? v : []).filter(s => s && (STICKERS[s.k] || (s.k === 'txt' && stkText(s.t)))).slice(0, 12).map(s => Object.assign(s.k === 'txt' ? { t: stkText(s.t) } : {}, { k: s.k, x: Math.round(n(s.x, 0, 100, 50)), y: Math.round(n(s.y, 0, 100, 50)), r: Math.round(n(s.r, -180, 180, 0)), s: Math.round(n(s.s, .4, 2.5, 1) * 100) / 100 }, s.f ? { f: 1 } : {}));
}
function bookDecoClean(it, o) {
  if (Array.isArray(it.stickers) && it.stickers.length) o.stickers = bookStkClean(it.stickers);
  if (TITLE_STYLES.some(t => t[0] && t[0] === it.tf)) o.tf = it.tf;
  if (CORNERS.some(c => c[0] && c[0] === it.corners)) o.corners = it.corners;
  if (PALETTE.includes(it.band)) o.band = it.band;
  if (PALETTE.includes(it.spine)) o.spine = it.spine;
  if (SPINES.some(p => p[0] && p[0] === it.spineP)) o.spineP = it.spineP;
  if (PALETTE.includes(it.spineInk)) o.spineInk = it.spineInk;
  const one = (list, v) => list.some(x => x[0] && x[0] === v);
  if (one(MATERIALS, it.mat)) o.mat = it.mat; if (one(KINDS, it.kind)) o.kind = it.kind;
  if (one(FOILS, it.foil)) o.foil = it.foil; if (typeof it.sub === 'string' && it.sub.trim()) o.sub = it.sub.trim().slice(0, 40);
  if (one(EDGES, it.edge)) o.edge = it.edge; if (PALETTE.includes(it.edgeCol)) o.edgeCol = it.edgeCol; if (one(STRAPS, it.strap)) o.strap = it.strap;
  if (PALETTE.includes(it.seal)) o.seal = it.seal; if (typeof it.sealT === 'string' && it.sealT.trim()) o.sealT = it.sealT.trim().slice(0, 2); if (SEAL_ICONS.some(x => x[0] === it.sealI)) o.sealI = it.sealI;
  if (PALETTE.includes(it.ribbon) || it.ribbon === 'none') o.ribbon = it.ribbon;
  if (CHARMS.some(x => x[0] === it.charm)) o.charm = it.charm;
  if (Array.isArray(it.extras)) { const x = EXTRAS.map(e => e[0]).filter(k => it.extras.includes(k)); if (x.length) o.extras = x; }
}
// the stickers on a cover: a layer of them over it, placed in % so they sit the same on a big cover or a little one
function bookStk(b) {
  const layer = el('span', { class: 'sx-stks', 'aria-hidden': 'true' });
  (b.stickers || []).forEach((s, i) => { const e = el('i', { class: 'sx-stk' + (s.f ? ' foil' : ''), 'data-i': i, style: 'left:' + s.x + '%;top:' + s.y + '%;--r:' + s.r + 'deg;--s:' + s.s }); stkPaint(e, s); layer.append(e); });
  return layer;
}
// a cover dressed: its material under everything, the title's look (foil, a subtitle under it),
// the spine, the pages' edges, the corner pieces, the strap, the little extras, and the stickers on top. c: the cover's element
function bookDress(c, b) {
  if (!c.querySelector(':scope > .sx-book-edge')) c.prepend(el('i', { class: 'sx-book-edge', 'aria-hidden': 'true' })); // (the small covers and the swinging one: thick like the book on the desk)
  if (!c.querySelector(':scope > .sx-book-base')) c.prepend(el('i', { class: 'sx-book-base', 'aria-hidden': 'true' }));
  const attr = (k, v) => { if (v) c.dataset[k] = v; else delete c.dataset[k]; };
  if (PALETTE.includes(b.spine)) c.style.setProperty('--spine', b.spine); else c.style.removeProperty('--spine');
  attr('sp', b.spineP);
  if (PALETTE.includes(b.spineInk)) c.style.setProperty('--spink', b.spineInk); else c.style.removeProperty('--spink');
  attr('tf', b.tf); attr('foil', b.foil); attr('edge', b.edge); attr('kind', KINDS.some(k => k[0] && k[0] === b.kind) ? b.kind : '');
  if (b.kind === 'spiral') c.append(el('i', { class: 'sx-coil', 'aria-hidden': 'true' }));
  if (b.kind === 'comp') c.prepend(el('i', { class: 'sx-marble', 'aria-hidden': 'true' }));
  if (b.kind === 'diary') { const k = el('i', { class: 'sx-lock', 'aria-hidden': 'true' }); k.innerHTML = DIARY_LOCK; c.append(k); }
  if (PALETTE.includes(b.edgeCol)) c.style.setProperty('--edgec', b.edgeCol); else c.style.removeProperty('--edgec');
  if (b.mat) c.prepend(el('i', { class: 'sx-cov-mat', 'data-mat': b.mat, 'aria-hidden': 'true' }));
  const t = c.querySelector(':scope > .sx-book-title') || (c.classList.contains('sx-tied-c') ? c.querySelector(':scope > b') : null);
  if (t && b.foil && !t.querySelector('.sx-foil')) { const f = el('span', { class: 'sx-foil' }); f.append(...t.childNodes); t.append(f); }
  if (t && b.sub && t.classList.contains('sx-book-title')) t.after(el('span', { class: 'sx-book-sub' }, b.sub));
  if (b.corners) c.append(el('i', { class: 'sx-corner-pc tr c-' + b.corners, 'aria-hidden': 'true' }), el('i', { class: 'sx-corner-pc br c-' + b.corners, 'aria-hidden': 'true' }));
  if (PALETTE.includes(b.band)) { const band = el('i', { class: 'sx-band', 'data-strap': b.strap || null, style: '--band:' + b.band, 'aria-hidden': 'true' });
    if (STRAP_BITS[b.strap]) { const bit = el('i', { class: 'sx-strap-bit' }); bit.innerHTML = decoSvg(...STRAP_BITS[b.strap]); band.append(bit); }
    c.append(band); }
  (b.extras || []).forEach(k => { const x = EXTRAS.find(e => e[0] === k); if (!x) return; const e = el('i', { class: 'sx-xtra', 'data-x': k, 'aria-hidden': 'true' }); e.innerHTML = decoSvg(x[2], x[3]); c.append(e); });
  if (b.charm) { const ch = charmEl(b.charm); if (ch) c.append(ch); }
  if (PALETTE.includes(b.seal)) { const e = el('i', { class: 'sx-seal', style: 'color:' + b.seal, 'aria-hidden': 'true' }); e.innerHTML = sealSvg(b); c.append(e); }
  if ((b.stickers || []).length) c.append(bookStk(b));
  return c;
}
// foil catches the light: as the pointer crosses a cover, the shine follows it (on the title, and on foil stickers)
addEventListener('pointermove', e => {
  const c = e.target.closest && e.target.closest('.sx-bbook, .sx-deco-cover, .sx-book-thumb, .sx-tied-c.t-book, .sx-bcard'); if (!c) return;
  if (!c.dataset.foil && !c.querySelector('.foil')) return;
  const r = c.getBoundingClientRect(), x = Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100));
  c.style.setProperty('--fx', x.toFixed(0) + '%'); c.style.setProperty('--fxn', x.toFixed(0));
}, { passive: true });

/* ---------- the panel ---------- */
const decoView = el('div', { class: 'sx-deco-view', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Decorate the cover' });
const decoCover = el('div', { class: 'sx-deco-cover' }), decoSide = el('div', { class: 'sx-deco-side' }), decoTools = el('div', { class: 'sx-deco-tools' });
decoView.append(el('div', { class: 'sx-deco' }, el('div', { class: 'sx-deco-left' }, decoCover, decoTools), decoSide));
document.body.append(decoView);
let decoId = null, decoSel = -1, decoMarked = false;
decoView.addEventListener('pointerdown', e => { if (e.target === decoView) decoClose(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && decoId) { e.preventDefault(); e.stopImmediatePropagation(); decoClose(); } }, true);
function decoOpen(id) { const b = bookOf(id); if (!b) return; decoTab = 'cover'; decoId = id; decoSel = -1; decoMarked = false; decoView.hidden = false; if (!stillUI()) animAgain(decoView, 'in'); decoDraw(); deskSfx('pick'); }
function decoClose() { if (!decoId) return; decoId = null; decoView.hidden = true; drawBoard(); if (typeof bookSideDraw === 'function' && bookId) bookSideDraw(); }
const decoMark = () => { if (!decoMarked) { deskMark(); decoMarked = true; } }; // (one Undo step for a whole decorating)
function decoChanged(all) { save(); if (all) decoDraw(); else { decoCoverDraw(); decoToolsDraw(); } }

function decoDraw() { decoCoverDraw(); decoToolsDraw(); decoSideDraw(); }
// the cover, big: as it is on the desk, with its stickers to drag
function decoCoverDraw() {
  const b = bookOf(decoId); if (!b) return; const [, bg, ink] = bookColor(b);
  decoCover.style.setProperty('--cover', bg); decoCover.style.setProperty('--cink', ink);
  const pic = el('div', { class: 'sx-book-pic' + (b.cover ? '' : ' none') }); if (b.cover) photoUrls(b.id).then(u => { if (u) pic.append(el('img', { src: u.full, alt: '' })); });
  decoCover.style.setProperty('--edge', Math.min(10, 3 + (b.pages || []).length * .6).toFixed(1) + 'px');
  decoCover.replaceChildren(el('i', { class: 'sx-book-edge' }), el('i', { class: 'sx-book-base' }), el('i', { class: 'sx-book-spine' }), el('b', { class: 'sx-book-title' }, b.title || 'A book'), pic, el('span', { class: 'sx-book-n' }, (b.pages || []).length + ((b.pages || []).length === 1 ? ' page' : ' pages')));
  bookDress(decoCover, b); const stks = decoCover.querySelector('.sx-stks');
  if (stks) { stks.classList.add('live'); if (decoSel >= 0 && stks.children[decoSel]) stks.children[decoSel].classList.add('sel'); }
}
decoCover.addEventListener('pointerdown', e => {
  const b = bookOf(decoId); if (!b) return;
  const st = e.target.closest('.sx-stk'); if (!st) { if (decoSel >= 0) { decoSel = -1; decoCoverDraw(); decoToolsDraw(); } return; }
  e.preventDefault(); const i = +st.dataset.i, s = b.stickers[i]; decoSel = i; decoCoverDraw(); decoToolsDraw();
  const el2 = decoCover.querySelector('.sx-stk[data-i="' + i + '"]'), r = decoCover.getBoundingClientRect(); let moved = false;
  decoCover.setPointerCapture(e.pointerId);
  const move = ev => { const x = Math.max(0, Math.min(100, (ev.clientX - r.left) / r.width * 100)), y = Math.max(0, Math.min(100, (ev.clientY - r.top) / r.height * 100));
    if (!moved) { moved = true; decoMark(); } s.x = Math.round(x); s.y = Math.round(y); el2.style.left = s.x + '%'; el2.style.top = s.y + '%'; };
  const up = () => { decoCover.removeEventListener('pointermove', move); decoCover.removeEventListener('pointerup', up); decoCover.removeEventListener('pointercancel', up); if (moved) { save(); deskSfx('drop'); } };
  decoCover.addEventListener('pointermove', move); decoCover.addEventListener('pointerup', up); decoCover.addEventListener('pointercancel', up);
});
// under the cover: the picked sticker's keys (turn, size, peel off), or a hint
function decoToolsDraw() {
  const b = bookOf(decoId); if (!b) return; const s = decoSel >= 0 && b.stickers && b.stickers[decoSel];
  if (!s) { decoTools.replaceChildren(el('span', { class: 'sx-deco-hint' }, (b.stickers || []).length ? 'Drag a sticker to move it; click one for more' : 'Add stickers from the tray, then drag them where you like')); return; }
  const k = (label, title, fn, cls) => el('button', { type: 'button', class: 'sx-deco-k' + (cls ? ' ' + cls : ''), title, 'aria-label': title, onclick: () => { decoMark(); fn(); decoChanged(); } }, label);
  decoTools.replaceChildren(el('span', { class: 'sx-deco-hint' }, stkName(s)),
    k('⟲', 'Turn left', () => { s.r = Math.max(-180, s.r - 15); }), k('⟳', 'Turn right', () => { s.r = Math.min(180, s.r + 15); }),
    k('−', 'Smaller', () => { s.s = Math.max(.4, Math.round((s.s - .15) * 100) / 100); }), k('+', 'Bigger', () => { s.s = Math.min(2.5, Math.round((s.s + .15) * 100) / 100); }),
    k(s.f ? 'Foil ✓' : 'Foil', 'Holographic foil: it shimmers as the pointer moves over the cover', () => { if (s.f) delete s.f; else s.f = 1; }),
    k('To front', 'Bring it to the front', () => { b.stickers.push(b.stickers.splice(decoSel, 1)[0]); decoSel = b.stickers.length - 1; }),
    k('Peel off', 'Take it off the cover', () => { b.stickers.splice(decoSel, 1); decoSel = -1; deskSfx('pick'); }, 'del'));
}
// the side: the sticker tray (in packs), the cover (colour, material), the title (look, colour, foil, a line
// under it), the spine, the pages' edges, the corners, the strap, little extras, and the picture
function decoSealIn(b) { // the seal's initial: one or two letters (the title's first, if left empty)
  const inp = el('input', { type: 'text', class: 'sx-kao-in sx-seal-in', maxlength: '2', value: b.sealT || '', placeholder: sealText(Object.assign({}, b, { sealT: '' })), 'aria-label': 'The letters on the seal', spellcheck: 'false' });
  inp.addEventListener('input', () => { decoMark(); const v = inp.value.trim().slice(0, 2); if (v) b.sealT = v; else delete b.sealT; save(); decoCoverDraw(); });
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') inp.blur(); });
  return inp;
}
function decoSubIn(b) { // the line under the title: written straight onto the cover
  const inp = el('input', { type: 'text', class: 'sx-kao-in', maxlength: '40', value: b.sub || '', placeholder: 'by Lico · Vol. 2 · 2026', 'aria-label': 'A line under the title', spellcheck: 'false' });
  inp.addEventListener('input', () => { decoMark(); const v = inp.value.trim().slice(0, 40); if (v) b.sub = v; else delete b.sub; save(); decoCoverDraw(); });
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') inp.blur(); });
  return inp;
}
let decoPack = 0;
let decoTab = 'stickers';
const DECO_TABS = [['stickers', 'Stickers'], ['cover', 'Cover'], ['title', 'Title'], ['edges', 'Spine & edges'], ['extras', 'Extras'], ['inside', 'Inside']];
const DECO_TAB_OF = { 'Stickers': 'stickers', 'Kind': 'cover', 'Cover colour': 'cover', 'Material': 'cover', 'Picture': 'cover', 'Title': 'title', 'Spine': 'edges', 'Page edges': 'edges', 'Corners': 'edges', 'Strap': 'edges', 'Little extras': 'extras', 'Wax seal': 'extras', 'Charm': 'extras', 'Inside': 'inside' };
function decoTabsApply() { // the sections of the tab you're on; the tabs above them
  decoSide.querySelectorAll(':scope > .sx-deco-sec').forEach(sc => { const l = sc.querySelector('.sx-deco-lbl'); sc.hidden = (DECO_TAB_OF[l && l.textContent] || 'extras') !== decoTab; });
  const bar = el('div', { class: 'sx-deco-tabbar', role: 'tablist' }, ...DECO_TABS.map(([k, name]) => el('button', { type: 'button', role: 'tab', class: 'sx-deco-tabb' + (k === decoTab ? ' on' : ''), 'aria-selected': String(k === decoTab), onclick: () => { decoTab = k; decoSide.querySelector('.sx-deco-tabbar').replaceWith(decoTabsApply()); decoSide.scrollTop = 0; } }, name)));
  return bar;
}
function decoSideDraw() {
  const b = bookOf(decoId); if (!b) return; const [, bg] = bookColor(b), ink = PALETTE.includes(b.ink) ? b.ink : '';
  const set = fn => () => { decoMark(); fn(); decoChanged(true); deskSfx('pick'); };
  const sq = (hex, on, fn) => el('button', { type: 'button', class: 'sx-book-sq' + (on ? ' on' : ''), style: 'background:' + hex, title: hex, 'aria-label': hex, onclick: fn });
  const sec = (label, ...kids) => el('div', { class: 'sx-deco-sec' }, el('div', { class: 'sx-deco-lbl' }, label), ...kids.filter(Boolean));
  const chips = (...cs) => el('div', { class: 'sx-deco-chips' }, ...cs);
  const chip = (label, on, fn, extra) => el('button', Object.assign({ type: 'button', class: 'sx-deco-chip' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', onclick: fn }, extra || {}), ...[].concat(label));
  const tabs = el('div', { class: 'sx-deco-tabs', role: 'tablist' }, ...STICKER_PACKS.map(([name], i) => el('button', { type: 'button', role: 'tab', class: 'sx-deco-tab' + (i === decoPack ? ' on' : ''), 'aria-selected': i === decoPack ? 'true' : 'false', onclick: () => { decoPack = i; decoSideDraw(); } }, name)));
  const add = (key, txt) => { if ((b.stickers || []).length >= 12) { deskToast('A dozen stickers at most'); return; }
    decoMark(); b.stickers = b.stickers || []; b.stickers.push(Object.assign(txt ? { t: txt } : {}, { k: key, x: 30 + Math.round(Math.random() * 40), y: 45 + Math.round(Math.random() * 30), r: Math.round(Math.random() * 30 - 15), s: 1 })); decoSel = b.stickers.length - 1; deskSfx('pin'); decoChanged(); };
  const tray = !STICKER_PACKS[decoPack][1] ? kaoPanel(t => add('txt', t)) : el('div', { class: 'sx-deco-tray' }, ...STICKER_PACKS[decoPack][1].map(key => { const name = STICKERS[key][0], t = el('button', { type: 'button', class: 'sx-deco-st', title: name, 'aria-label': 'Add a ' + name.toLowerCase() + ' sticker', onclick: () => add(key) });
    t.innerHTML = stickerSvg(key); return t; }));
  decoSide.replaceChildren(
    el('div', { class: 'sx-deco-head' }, el('b', {}, 'Decorate the cover'),
      el('button', { type: 'button', class: 'sx-deco-surp', title: 'A combination rolled at random: press again for another (Undo goes back)', onclick: () => { decoMark(); bookSurprise(b); decoChanged(true); deskSfx('pin'); } }, '✨ Surprise me'),
      el('button', { type: 'button', class: 'sx-deco-done', onclick: () => decoClose() }, 'Done')),
    el('div', { class: 'sx-deco-looks' },
      el('button', { type: 'button', class: 'sx-book-tb', title: 'Copy how this book looks, to paste onto another (not its title, picture or stickers)', onclick: () => bookLookCopy(b.id) }, 'Copy the look'),
      bookLookCopied ? el('button', { type: 'button', class: 'sx-book-tb', title: 'Make this book look like the one you copied', onclick: () => { decoMark(); bookLookPaste(b.id, true); decoDraw(); } }, 'Paste the look') : null),
    sec('Stickers', tabs, tray),
    sec('Kind', el('p', { class: 'sx-deco-note' }, 'What sort of book it is: its spine, and how it closes.'),
      chips(...KINDS.map(([k, name]) => chip(name, (b.kind || '') === k, set(() => { if (k) b.kind = k; else delete b.kind; }))))),
    sec('Cover colour', el('div', { class: 'sx-book-grid' }, ...PALETTE.map(hex => sq(hex, hex === bg, set(() => { b.bg = hex; delete b.color; }))))),
    sec('Material', chips(...MATERIALS.map(([k, name]) => chip([el('i', { class: 'sx-deco-mat', style: '--cover:' + bg }, k ? el('i', { class: 'sx-cov-mat', 'data-mat': k }) : null), el('span', {}, name)], (b.mat || '') === k, set(() => { if (k) b.mat = k; else delete b.mat; }))))),
    sec('Title', chips(...TITLE_STYLES.map(([k, name]) => chip([el('b', { 'data-tf': k }, 'Aa'), el('span', {}, name)], (b.tf || '') === k, set(() => { if (k) b.tf = k; else delete b.tf; }), { class: 'sx-deco-chip tf' + ((b.tf || '') === k ? ' on' : '') }))),
      el('button', { type: 'button', class: 'sx-book-auto' + (!ink ? ' on' : ''), onclick: set(() => { delete b.ink; }) }, el('i', { style: 'background:' + bookAuto(bg) }), 'Auto colour: readable on the cover'),
      el('div', { class: 'sx-book-grid' }, ...PALETTE.map(hex => sq(hex, hex === ink, set(() => { b.ink = hex; })))),
      el('div', { class: 'sx-deco-sub' }, 'Foil'), chips(...FOILS.map(([k, name]) => chip([el('b', { class: 'sx-deco-fo', 'data-fo': k }, 'Aa'), el('span', {}, name)], (b.foil || '') === k, set(() => { if (k) b.foil = k; else delete b.foil; })))),
      el('div', { class: 'sx-deco-sub' }, 'A line under the title'), decoSubIn(b)),
    sec('Spine', chips(...SPINES.map(([k, name]) => chip([el('i', { class: 'sx-deco-sp', 'data-sp': k, style: '--spine:' + (PALETTE.includes(b.spine) ? b.spine : bg) + (PALETTE.includes(b.spineInk) ? ';--spink:' + b.spineInk : '') }), el('span', {}, name)], (b.spineP || '') === k, set(() => { if (k) b.spineP = k; else delete b.spineP; })))),
      el('div', { class: 'sx-deco-sub' }, 'Spine colour'), chips(chip('Like the cover', !PALETTE.includes(b.spine), set(() => { delete b.spine; }))),
      el('div', { class: 'sx-book-grid' }, ...PALETTE.map(hex => sq(hex, hex === b.spine, set(() => { b.spine = hex; })))),
      b.spineP ? el('div', { class: 'sx-deco-sub' }, 'Pattern colour') : null,
      b.spineP ? chips(chip('Like the title', !PALETTE.includes(b.spineInk), set(() => { delete b.spineInk; }))) : null,
      b.spineP ? el('div', { class: 'sx-book-grid' }, ...PALETTE.map(hex => sq(hex, hex === b.spineInk, set(() => { b.spineInk = hex; })))) : null),
    sec('Page edges', chips(...EDGES.map(([k, name]) => chip([el('i', { class: 'sx-deco-ed', 'data-edge': k, style: PALETTE.includes(b.edgeCol) ? '--edgec:' + b.edgeCol : null }), el('span', {}, name)], (b.edge || '') === k, set(() => { if (k) b.edge = k; else delete b.edge; if (k === 'tint' && !PALETTE.includes(b.edgeCol)) b.edgeCol = '#ff88a9'; })))),
      b.edge === 'tint' ? el('div', { class: 'sx-book-grid' }, ...PALETTE.map(hex => sq(hex, hex === b.edgeCol, set(() => { b.edgeCol = hex; })))) : null),
    sec('Corners', chips(...CORNERS.map(([k, name]) => chip([k ? el('i', { class: 'sx-deco-cn c-' + k }) : null, el('span', {}, name)].filter(Boolean), (b.corners || '') === k, set(() => { if (k) b.corners = k; else delete b.corners; }))))),
    sec('Strap', chips(...STRAPS.map(([k, name]) => chip(name, PALETTE.includes(b.band) && (b.strap || '') === k, set(() => { if (k) b.strap = k; else delete b.strap; if (!PALETTE.includes(b.band)) b.band = k === 'buckle' ? '#73392e' : '#ff88a9'; }))), chip('None', !PALETTE.includes(b.band), set(() => { delete b.band; }))),
      PALETTE.includes(b.band) ? el('div', { class: 'sx-deco-sub' }, 'Its colour') : null,
      PALETTE.includes(b.band) ? el('div', { class: 'sx-book-grid' }, ...PALETTE.map(hex => sq(hex, hex === b.band, set(() => { b.band = hex; })))) : null),
    sec('Little extras', chips(...EXTRAS.map(([k, name, box, inner]) => { const on = (b.extras || []).includes(k), ic = el('i', { class: 'sx-deco-xi' }); ic.innerHTML = decoSvg(box, inner);
      return chip([ic, el('span', {}, name)], on, set(() => { const x = (b.extras || []).filter(v => v !== k); if (!on) x.push(k); if (x.length) b.extras = x; else delete b.extras; })); }))),
    sec('Wax seal', chips(chip('None', !PALETTE.includes(b.seal), set(() => { delete b.seal; }))),
      el('div', { class: 'sx-book-grid' }, ...PALETTE.map(hex => sq(hex, hex === b.seal, set(() => { b.seal = hex; })))),
      PALETTE.includes(b.seal) ? el('div', { class: 'sx-deco-sub' }, 'Pressed with') : null,
      PALETTE.includes(b.seal) ? chips(chip([el('b', { class: 'sx-deco-seal' }, sealText(b))], !b.sealI, set(() => { delete b.sealI; }), { title: 'Its initial' }),
        ...SEAL_ICONS.map(([k, name, path]) => { const ic = el('i', { class: 'sx-deco-xi' }); ic.innerHTML = '<svg viewBox="16 14 28 30"><g fill="currentColor">' + path + '</g></svg>'; return chip([ic, el('span', {}, name)], b.sealI === k, set(() => { b.sealI = k; })); })) : null,
      PALETTE.includes(b.seal) && !b.sealI ? decoSealIn(b) : null),
    sec('Charm', el('p', { class: 'sx-deco-note' }, 'Hangs from the top corner, and swings when you drag the book around the desk.'),
      chips(chip('None', !b.charm, set(() => { delete b.charm; })), ...CHARMS.map(([k, name, inner]) => { const ic = el('i', { class: 'sx-deco-xi' }); ic.innerHTML = '<svg viewBox="0 0 40 40">' + inner + '</svg>'; return chip([ic, el('span', {}, name)], b.charm === k, set(() => { b.charm = k; })); }))),
    sec('Inside',
      el('div', { class: 'sx-deco-sub' }, 'The ribbon'), el('p', { class: 'sx-deco-note' }, 'The bookmark ribbon that lies down the page you are on, when the book is open.'),
      chips(chip('Like the cover', !PALETTE.includes(b.ribbon) && b.ribbon !== 'none', set(() => { delete b.ribbon; })), chip('No ribbon', b.ribbon === 'none', set(() => { b.ribbon = 'none'; }))),
      el('div', { class: 'sx-book-grid' }, ...PALETTE.map(hex => sq(hex, hex === b.ribbon, set(() => { b.ribbon = hex; }))))),
    sec('Picture', el('div', { class: 'sx-deco-row' }, el('button', { type: 'button', class: 'sx-book-tb', onclick: () => decoPic() }, b.cover ? 'Change the picture' : 'Add a picture'),
      b.cover ? el('button', { type: 'button', class: 'sx-book-tb', onclick: () => { decoMark(); delete b.cover; b.coverV = Date.now(); PHOTOS.del(b.id).catch(() => {}); photoCache.delete(b.id); decoChanged(true); } }, 'Remove') : null)));
  const head = decoSide.querySelector('.sx-deco-looks'); head.after(decoTabsApply());
}
function decoPic() {
  const b = bookOf(decoId); if (!b) return;
  const f = el('input', { type: 'file', accept: 'image/*', hidden: true }); document.body.append(f);
  f.addEventListener('change', async () => { const file = f.files && f.files[0]; f.remove(); if (!file) return;
    try { const src = await shrinkPhoto(file); await PHOTOS.put(b.id, src); decoMark(); b.cover = true; b.coverV = Date.now(); photoCache.delete(b.id); decoChanged(true); deskSfx('shutter'); }
    catch (e) { deskToast('That picture didn\'t work: try another'); } });
  f.click();
}

/* ---------- stickers anywhere: on notes, photos, tables, folders, books and the cassette ----------
   The Stickers key on the left opens the tray. Drag a sticker out onto a card (or the cassette) and it sticks where you let
   go; or click one, then click where it goes. An open book has a Stickers key of its own, for its pages. A stuck sticker rides along with its card: drag it to move it (it may hang
   over the edge), right-click it to turn it, size it or peel it off. A card keeps them as it.stickers, like a book's cover
   (in % of the card, so they keep their spot as it grows); the cassette's are S.deckStk. */
const STK_D = '<path d="M5 4.5h14v8.5l-6.5 6.5H5z"/><path d="M19 13h-4.5a2 2 0 0 0-2 2v4.5"/><path d="M9 9.5h.01M14 9.5h.01M9.5 13q1.5 1.3 3 0"/>';
const stkTray = el('div', { class: 'sx-stk-tray', hidden: true, role: 'dialog', 'aria-label': 'Stickers' });
document.body.append(stkTray);
let stkPack = 0, stkCarry = null; // (stkCarry: the sticker on its way to a card, following the pointer)
const stkKey = deskBtn(bookIcon(STK_D), () => { if (stkTray.hidden) stkTrayOpen(); else stkTrayClose(); }, 'sx-ws-ic', 'Stickers: drag one onto a note, photo, table, folder, book or the cassette');
bookKey.parentNode.append(stkKey);
function stkTrayOpen(at) { // at: the key it opens from (the Stickers key on the left, or the one in an open book)
  if (!stkTray.hidden && at && stkTray._at === at) { stkTrayClose(); return; }
  stkTrayDraw(); stkTray.hidden = false; stkTray._at = at || stkKey; if (!at) stkKey.classList.add('on');
  const r = (at || stkKey).getBoundingClientRect(), w = stkTray.offsetWidth, h = stkTray.offsetHeight;
  if (at) { stkTray.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px'; stkTray.style.top = Math.min(innerHeight - h - 8, r.bottom + 8) + 'px'; }
  else { stkTray.style.left = (r.right + 10) + 'px'; stkTray.style.top = Math.max(8, Math.min(innerHeight - h - 8, r.top - 40)) + 'px'; }
  if (!stillUI()) animAgain(stkTray, 'in');
}
function stkTrayClose() { stkTray.hidden = true; stkKey.classList.remove('on'); stkCarryEnd(); }
function stkTrayDraw() {
  stkTray.replaceChildren(
    el('div', { class: 'sx-stk-trayh' }, el('b', {}, 'Stickers'), el('span', {}, 'Drag one onto a card'), el('button', { type: 'button', class: 'sx-stk-trayx', 'aria-label': 'Close the stickers', onclick: () => stkTrayClose() }, '×')),
    el('div', { class: 'sx-deco-tabs' }, ...STICKER_PACKS.map(([name], i) => el('button', { type: 'button', class: 'sx-deco-tab' + (i === stkPack ? ' on' : ''), onclick: () => { stkPack = i; stkTrayDraw(); } }, name))),
    !STICKER_PACKS[stkPack][1] ? kaoPanel(null, true) : el('div', { class: 'sx-deco-tray' }, ...STICKER_PACKS[stkPack][1].map(key => { const t = el('button', { type: 'button', class: 'sx-deco-st', 'data-k': key, title: STICKERS[key][0], 'aria-label': STICKERS[key][0] }); t.innerHTML = stickerSvg(key); return t; })));
}
stkTray.addEventListener('pointerdown', e => {
  e.stopPropagation(); const t = e.target.closest('.sx-deco-st'); if (!t || e.button !== 0 || (t.dataset.k === 'txt' && !t.dataset.t)) return;
  e.preventDefault(); stkCarryStart(t.dataset.k === 'txt' ? { k: 'txt', t: t.dataset.t } : { k: t.dataset.k }, e);
});
addEventListener('keydown', e => { if (e.key === 'Escape' && (stkCarry || !stkTray.hidden || !stkMenu.hidden)) { e.preventDefault(); e.stopImmediatePropagation(); if (!stkMenu.hidden) stkMenu.hidden = true; else if (stkCarry) stkCarryEnd(); else stkTrayClose(); } }, true);

// carrying a sticker: it follows the pointer; let go over a card to stick it there (a click without moving keeps it in hand
// until the next click)
function stkCarryStart(spec, e) { // spec: { k } or { k: 'txt', t }
  stkCarryEnd(); const g = stkPaint(el('i', { class: 'sx-stk-ghost' }), spec); document.body.append(g);
  stkCarry = { k: spec.k, t: spec.t, g, x0: e.clientX, y0: e.clientY, moved: false, armed: false };
  stkGhostAt(e.clientX, e.clientY); deskSfx('pick');
}
function stkGhostAt(x, y) { if (stkCarry) { stkCarry.g.style.left = x + 'px'; stkCarry.g.style.top = y + 'px'; stkCarry.g.classList.toggle('over', !!stkTarget(x, y)); } }
function stkCarryEnd() { if (stkCarry) { stkCarry.g.remove(); stkCarry = null; } }
addEventListener('pointermove', e => { if (!stkCarry) return; if (Math.hypot(e.clientX - stkCarry.x0, e.clientY - stkCarry.y0) > 6) stkCarry.moved = true; stkGhostAt(e.clientX, e.clientY); }, { passive: true });
addEventListener('pointerup', e => { if (!stkCarry) return; if (!stkCarry.moved && !stkCarry.armed) { stkCarry.armed = true; return; } stkDrop(e.clientX, e.clientY); });
addEventListener('pointerdown', e => { if (!stkCarry || !stkCarry.armed || e.target.closest('.sx-stk-tray')) return; e.preventDefault(); e.stopPropagation(); stkDrop(e.clientX, e.clientY); }, true);
// what's under the pointer that can take a sticker: a card on the desk (not a page in an open book), or the cassette
function stkTarget(x, y) {
  for (const n of document.elementsFromPoint(x, y)) {
    if (n.closest('.sx-stk-tray, .sx-stk-ghost')) continue;
    const c = n.closest('.sx-bcard[data-id]'); if (c && c.closest('.sx-world') && itemOf(c.dataset.id)) return { c, it: itemOf(c.dataset.id) }; // (a page in an open book too)
    const d = n.closest('.sx-corner'); if (d) return { c: d, deck: true };
    if (n.closest('.sx-world, .sx-book-view, .sx-deco-view') || n === document.body) break; // (an open book covers the desk)
  }
  return null;
}
function stkDrop(x, y) {
  const k = stkCarry && stkCarry.k, txt = stkCarry && stkCarry.t, t = stkTarget(x, y); stkCarryEnd(); if (!k) return;
  if (!t) { deskToast('Stick it on a card or the cassette'); return; }
  const list = t.deck ? (S.deckStk = S.deckStk || []) : (t.it.stickers || []);
  if (list.length >= 12) { deskToast('A dozen stickers at most'); return; }
  const r = t.c.getBoundingClientRect(), s = Object.assign(k === 'txt' ? { t: txt } : {}, { k, x: Math.round((x - r.left) / r.width * 100), y: Math.round((y - r.top) / r.height * 100), r: Math.round(Math.random() * 24 - 12), s: 1 });
  if (t.deck) { list.push(s); save(); deckStkDraw(); }
  else { deskMark(); t.it.stickers = list; list.push(s); save(); drawBoard(); }
  deskSfx('pin');
}

// the stickers on a card: drawn into it as it's made, so they go wherever it goes (a book's own are on its cover)
function cardStk(list, deck) {
  const layer = el('span', { class: 'sx-cstks' + (deck ? ' deck' : '') });
  list.forEach((s, i) => { const e = el('i', { class: 'sx-cstk' + (s.f ? ' foil' : ''), 'data-i': i, title: stkName(s) + ': drag to move it, right-click for more', style: 'left:' + s.x + '%;top:' + s.y + '%;--r:' + s.r + 'deg;--s:' + s.s }); stkPaint(e, s); layer.append(e); });
  return layer;
}
const stkWrap = f => function (it, ...a) { const c = f.call(this, it, ...a); if (c && it && it.type !== 'book' && (it.stickers || []).length) c.append(cardStk(it.stickers)); return c; };
paperCard = stkWrap(paperCard); tblCard = stkWrap(tblCard); hopCard = stkWrap(hopCard);
function deckStkDraw() { corner.querySelectorAll(':scope > .sx-cstks').forEach(n => n.remove()); if ((S.deckStk || []).length) corner.append(cardStk(S.deckStk, true)); }
S.deckStk = bookStkClean(S.deckStk); deckStkDraw();

// a stuck sticker: drag it about its card; right-click for the rest
const stkOwner = st => { const lay = st.closest('.sx-cstks'); if (!lay) return null; if (lay.classList.contains('deck')) return { list: S.deckStk, deck: true, box: corner };
  const c = lay.closest('.sx-bcard'), it = c && itemOf(c.dataset.id); return it && it.stickers ? { list: it.stickers, it, box: c } : null; };
const stkDone = o => { save(); if (o.deck) deckStkDraw(); else drawBoard(); };
document.addEventListener('pointerdown', e => {
  const st = e.target.closest && e.target.closest('.sx-cstk'); if (!st || e.button !== 0) return;
  const o = stkOwner(st); if (!o) return; e.stopPropagation(); e.preventDefault();
  const s = o.list[+st.dataset.i]; if (!s) return; const r = o.box.getBoundingClientRect(); let moved = false;
  const move = ev => { if (!moved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 4) return;
    if (!moved) { moved = true; if (!o.deck) deskMark(); st.classList.add('held'); }
    s.x = Math.round(Math.max(-10, Math.min(110, (ev.clientX - r.left) / r.width * 100))); s.y = Math.round(Math.max(-10, Math.min(110, (ev.clientY - r.top) / r.height * 100)));
    st.style.left = s.x + '%'; st.style.top = s.y + '%'; };
  const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); st.classList.remove('held'); if (moved) { stkDone(o); deskSfx('drop'); } };
  addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}, true);
const stkMenu = el('div', { class: 'sx-stk-menu', hidden: true, role: 'menu' }); document.body.append(stkMenu);
stkMenu.addEventListener('pointerdown', e => e.stopPropagation());
addEventListener('pointerdown', e => { if (!stkMenu.hidden && !e.target.closest('.sx-stk-menu')) stkMenu.hidden = true; }, true);
document.addEventListener('contextmenu', e => {
  const st = e.target.closest && e.target.closest('.sx-cstk'); if (!st) return;
  const o = stkOwner(st); if (!o) return; e.preventDefault(); e.stopPropagation();
  const s = o.list[+st.dataset.i]; if (!s) return;
  // (the card is drawn again after each change, but the sticker is the same one: the menu stays open for another turn)
  const k = (label, title, fn, cls) => el('button', { type: 'button', class: 'sx-deco-k' + (cls ? ' ' + cls : ''), title, 'aria-label': title, onclick: () => { if (!o.deck) deskMark(); fn(); stkDone(o); if (cls === 'del') stkMenu.hidden = true; } }, label);
  stkMenu.replaceChildren(el('span', { class: 'sx-deco-hint' }, stkName(s)),
    k('⟲', 'Turn left', () => { s.r = Math.max(-180, s.r - 15); }), k('⟳', 'Turn right', () => { s.r = Math.min(180, s.r + 15); }),
    k('−', 'Smaller', () => { s.s = Math.max(.4, Math.round((s.s - .15) * 100) / 100); }), k('+', 'Bigger', () => { s.s = Math.min(2.5, Math.round((s.s + .15) * 100) / 100); }),
    k(s.f ? 'Foil ✓' : 'Foil', 'Holographic foil: it shimmers as the pointer moves over it', () => { if (s.f) delete s.f; else s.f = 1; }, 'foilk'),
    k('Peel off', 'Take it off', () => { const i = o.list.indexOf(s); if (i >= 0) o.list.splice(i, 1); deskSfx('pick'); }, 'del'));
  stkMenu.hidden = false; const w = stkMenu.offsetWidth, h = stkMenu.offsetHeight;
  stkMenu.style.left = Math.max(8, Math.min(innerWidth - w - 8, e.clientX)) + 'px'; stkMenu.style.top = Math.max(8, Math.min(innerHeight - h - 8, e.clientY + 8)) + 'px';
}, true);
// (the desk was drawn before this file came in: its cards with stickers are made again, now with them)
els.forEach((c, id) => { const it = itemOf(id); if (it && it.type !== 'book' && (it.stickers || []).length) c._snap = ''; }); drawBoard();
