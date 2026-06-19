/**
 * Parseur best-effort de la syntaxe OSM `opening_hours` pour déterminer l'état
 * "ouvert maintenant" en temps réel (horloge locale de l'utilisateur).
 *
 * Couvre les cas courants : "24/7", "Mo-Fr 09:00-18:00", "Mo-Fr 09:00-12:00,14:00-18:00",
 * "Sa,Su 10:00-14:00", "Mo-Su 10:00-22:00", "Tu off", règles multiples séparées par ";",
 * et horaires sans jour (= tous les jours). Les règles complexes (PH/SH, semaines,
 * mois) sont ignorées → état "unknown" si rien d'exploitable.
 */
export type OpenState = {
  state: "open" | "closed" | "unknown";
  untilMin?: number;   // minute de fermeture (si ouvert)
  openAtMin?: number;  // prochaine minute d'ouverture aujourd'hui (si fermé)
};

const OSM_ORDER = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const TOKEN_TO_JS: Record<string, number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };

function expandDays(dayPart: string): Set<number> {
  const set = new Set<number>();
  dayPart.split(",").forEach((seg) => {
    seg = seg.trim();
    if (!seg) return;
    if (seg.includes("-")) {
      const [a, b] = seg.split("-").map((s) => s.trim());
      const ia = OSM_ORDER.indexOf(a);
      const ib = OSM_ORDER.indexOf(b);
      if (ia >= 0 && ib >= 0) {
        let i = ia;
        for (let guard = 0; guard < 7; guard++) {
          set.add(TOKEN_TO_JS[OSM_ORDER[i]]);
          if (i === ib) break;
          i = (i + 1) % 7;
        }
      }
    } else if (TOKEN_TO_JS[seg] != null) {
      set.add(TOKEN_TO_JS[seg]);
    }
  });
  return set;
}

export function getOpenState(spec: unknown, now: Date = new Date()): OpenState {
  if (!spec || typeof spec !== "string") return { state: "unknown" };
  const s = spec.trim();
  if (!s) return { state: "unknown" };
  if (/24\s*\/\s*7/.test(s)) return { state: "open" };

  const today = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const rules = s.split(";").map((r) => r.trim()).filter(Boolean);

  let matchedToday = false;
  let openAt: number | null = null;

  for (const rule of rules) {
    // Ignorer les règles non gérées (jours fériés, scolaires, semaines, mois).
    if (/^(PH|SH|week|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(rule)) continue;

    const dayMatch = rule.match(/^((?:Mo|Tu|We|Th|Fr|Sa|Su|[,\-\s])+?)(?=\d|off|closed|$)/);
    let dayPart = "";
    let timePart = rule;
    if (dayMatch && /[A-Za-z]/.test(dayMatch[1])) {
      dayPart = dayMatch[1].trim();
      timePart = rule.slice(dayMatch[1].length).trim();
    }
    const days = dayPart ? expandDays(dayPart) : null; // null = tous les jours
    const appliesToday = days ? days.has(today) : true;
    if (!appliesToday) continue;

    matchedToday = true;
    if (/^(off|closed)$/i.test(timePart)) return { state: "closed" };

    for (const rg of timePart.split(",").map((t) => t.trim()).filter(Boolean)) {
      const tm = rg.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
      if (!tm) continue;
      const start = +tm[1] * 60 + +tm[2];
      let end = +tm[3] * 60 + +tm[4];
      if (end <= start) end += 24 * 60; // horaire de nuit
      if (nowMin >= start && nowMin < end) return { state: "open", untilMin: end % (24 * 60) };
      if (nowMin < start) openAt = openAt == null ? start : Math.min(openAt, start);
    }
  }

  if (!matchedToday) return { state: "unknown" };
  return { state: "closed", openAtMin: openAt ?? undefined };
}

export function formatMinutes(min?: number): string {
  if (min == null) return "";
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
