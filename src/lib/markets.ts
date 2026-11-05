// Human labels for market selections. Mirrors src/services/markets/footballMarkets.ts on the API.

const MARKET_NAMES: Record<string, string> = {
  "1X2": "Match Result",
  DOUBLE_CHANCE: "Double Chance",
  DRAW_NO_BET: "Draw No Bet",
  OVER_UNDER: "Total Goals",
  BTTS: "Both Teams To Score",
  ODD_EVEN: "Total Goals Odd/Even",
  HT_1X2: "Half-Time Result",
  HT_FT: "Half-Time / Full-Time",
  CORRECT_SCORE: "Correct Score",
  ASIAN_HANDICAP: "Asian Handicap",
  HOME_OVER_UNDER: "Home Team Goals",
  AWAY_OVER_UNDER: "Away Team Goals",
};

/** Display order of market types on the event page. */
export const MARKET_ORDER = Object.keys(MARKET_NAMES);

function fmtLine(line: string | number | null | undefined): string {
  if (line === null || line === undefined || line === "") return "";
  const n = Number(line);
  return Number.isInteger(n) ? n.toFixed(1) : String(n);
}

function signed(n: number): string {
  if (n === 0) return "0";
  return n > 0 ? `+${fmtLine(n)}` : `-${fmtLine(Math.abs(n))}`;
}

export function marketName(type: string, line?: string | number | null, fallback?: string): string {
  const base = MARKET_NAMES[type] ?? fallback ?? type;
  if (line === null || line === undefined || line === "") return base;
  if (type === "ASIAN_HANDICAP") return `${base} ${signed(Number(line))}`;
  return `${base} ${fmtLine(line)}`;
}

interface Teams {
  home: string;
  away: string;
}

function side(sel: string, t: Teams): string {
  if (sel === "HOME") return t.home;
  if (sel === "AWAY") return t.away;
  if (sel === "DRAW") return "Draw";
  return sel;
}

/** Full label, e.g. "Arsenal", "Over 2.5", "Chelsea +0.5", "Arsenal or Draw". */
export function selectionLabel(type: string, selection: string, line: string | number | null | undefined, t: Teams): string {
  switch (type) {
    case "1X2":
    case "HT_1X2":
    case "DRAW_NO_BET":
      return side(selection, t);
    case "DOUBLE_CHANCE":
      return selection
        .split("_OR_")
        .map((s) => side(s, t))
        .join(" or ");
    case "OVER_UNDER":
      return `${selection === "OVER" ? "Over" : "Under"} ${fmtLine(line)}`;
    case "HOME_OVER_UNDER":
      return `${t.home} ${selection === "OVER" ? "Over" : "Under"} ${fmtLine(line)}`;
    case "AWAY_OVER_UNDER":
      return `${t.away} ${selection === "OVER" ? "Over" : "Under"} ${fmtLine(line)}`;
    case "ASIAN_HANDICAP": {
      const l = Number(line ?? 0);
      return selection === "HOME" ? `${t.home} ${signed(l)}` : `${t.away} ${signed(-l)}`;
    }
    case "BTTS":
      return selection === "YES" ? "Yes" : "No";
    case "ODD_EVEN":
      return selection === "ODD" ? "Odd" : "Even";
    case "HT_FT":
      return selection
        .split("/")
        .map((s) => side(s, t))
        .join(" / ");
    case "CORRECT_SCORE":
      return selection === "OTHER" ? "Any other score" : selection;
    default:
      return selection;
  }
}

/** Short label for compact odds buttons ("1", "X", "2", "Over", "1X"...). */
export function shortLabel(type: string, selection: string): string {
  if (type === "1X2" || type === "HT_1X2") return selection === "HOME" ? "1" : selection === "DRAW" ? "X" : "2";
  if (type === "DOUBLE_CHANCE")
    return ({ HOME_OR_DRAW: "1X", HOME_OR_AWAY: "12", DRAW_OR_AWAY: "X2" } as Record<string, string>)[selection] ?? selection;
  if (type === "DRAW_NO_BET" || type === "ASIAN_HANDICAP") return selection === "HOME" ? "1" : "2";
  if (type === "BTTS") return selection === "YES" ? "Yes" : "No";
  if (type === "OVER_UNDER" || type.endsWith("_OVER_UNDER")) return selection === "OVER" ? "Over" : "Under";
  if (type === "ODD_EVEN") return selection === "ODD" ? "Odd" : "Even";
  if (type === "CORRECT_SCORE" && selection === "OTHER") return "Other";
  return selection;
}

/** Splits "Arsenal vs Chelsea" into teams. */
export function teamsFromMatch(match: string): Teams {
  const [home, away] = match.split(/\s+vs\.?\s+/i);
  return { home: home ?? match, away: away ?? "" };
}
