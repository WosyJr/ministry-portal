const THEMES = [
 {
  "id": "dusk",
  "name": "Dusk",
  "group": "Easy on the eyes",
  "desc": "Muted blue-grey with soft slate-blue headings. Calm and low glare. The Ministry’s night.",
  "sw": {
   "ground": "#1D2026",
   "page": "#20232B",
   "paper": "#252831",
   "line": "#414756",
   "quiet": "#979FAD",
   "ink": "#C0C5CD",
   "trim": "#B19B75",
   "head": "#89A4C2"
  }
 },
 {
  "id": "soft-graphite",
  "name": "Soft Graphite",
  "group": "Easy on the eyes",
  "desc": "Mid-grey with off-white text, dusty rose headings and muted brass.",
  "sw": {
   "ground": "#202124",
   "page": "#232528",
   "paper": "#282A2D",
   "line": "#474A50",
   "quiet": "#9CA0A8",
   "ink": "#CBC8C2",
   "trim": "#B49C73",
   "head": "#C88B84"
  }
 },
 {
  "id": "sage",
  "name": "Sage",
  "group": "Easy on the eyes",
  "desc": "Grey-green with soft sage headings and muted brass.",
  "sw": {
   "ground": "#1F2422",
   "page": "#232826",
   "paper": "#282E2B",
   "line": "#46514B",
   "quiet": "#9BA9A0",
   "ink": "#C8CCC1",
   "trim": "#B4A373",
   "head": "#8FBD9E"
  }
 },
 {
  "id": "mocha",
  "name": "Mocha",
  "group": "Easy on the eyes",
  "desc": "Soft warm coffee brown with dusty red headings.",
  "sw": {
   "ground": "#231F1C",
   "page": "#272320",
   "paper": "#2D2925",
   "line": "#524A43",
   "quiet": "#ABA299",
   "ink": "#D1C9BC",
   "trim": "#BA9B6D",
   "head": "#CA9382"
  }
 },
 {
  "id": "fjord",
  "name": "Fjord",
  "group": "Easy on the eyes",
  "desc": "Soft slate blue with muted rose headings.",
  "sw": {
   "ground": "#1C2327",
   "page": "#20262C",
   "paper": "#242C32",
   "line": "#3F4D57",
   "quiet": "#95A4AF",
   "ink": "#BFC9CE",
   "trim": "#73A9B4",
   "head": "#C6868B"
  }
 },
 {
  "id": "heather",
  "name": "Heather",
  "group": "Easy on the eyes",
  "desc": "Grey-violet with soft mauve headings.",
  "sw": {
   "ground": "#211E25",
   "page": "#252229",
   "paper": "#2A262F",
   "line": "#4A4453",
   "quiet": "#A099AB",
   "ink": "#C7C1CC",
   "trim": "#B49E73",
   "head": "#BF8DBF"
  }
 },
 {
  "id": "graphite",
  "name": "Graphite",
  "group": "Graphite",
  "desc": "Pencil-lead greys; red headings and pewter trim.",
  "sw": {
   "ground": "#1A1A1C",
   "page": "#1D1F21",
   "paper": "#232427",
   "line": "#45484C",
   "quiet": "#9BA0A9",
   "ink": "#D5D6D9",
   "trim": "#949AA7",
   "head": "#E07E7B"
  }
 },
 {
  "id": "graphite-gold",
  "name": "Graphite & Brass",
  "group": "Graphite",
  "desc": "The same greys with warm brass trim.",
  "sw": {
   "ground": "#1A1A1C",
   "page": "#1D1F21",
   "paper": "#232427",
   "line": "#45484C",
   "quiet": "#9BA0A9",
   "ink": "#DBD8D3",
   "trim": "#D6B065",
   "head": "#E07E7B"
  }
 },
 {
  "id": "graphite-steel",
  "name": "Graphite & Steel",
  "group": "Graphite",
  "desc": "Cool blue-grey with steel-blue headings.",
  "sw": {
   "ground": "#191B1D",
   "page": "#1D1F22",
   "paper": "#222428",
   "line": "#43484F",
   "quiet": "#97A1AD",
   "ink": "#D3D7DB",
   "trim": "#75A0C6",
   "head": "#81ADDA"
  }
 },
 {
  "id": "graphite-ember",
  "name": "Graphite & Ember",
  "group": "Graphite",
  "desc": "Warm charcoal with forge-orange headings.",
  "sw": {
   "ground": "#1C1B1A",
   "page": "#201F1E",
   "paper": "#262523",
   "line": "#4C4846",
   "quiet": "#A8A19C",
   "ink": "#DBD7D3",
   "trim": "#EA9E51",
   "head": "#EF936C"
  }
 },
 {
  "id": "frost",
  "name": "Frost",
  "group": "Bolder",
  "desc": "Night blue with ice-blue headings.",
  "sw": {
   "ground": "#090B0D",
   "page": "#0C1014",
   "paper": "#12171C",
   "line": "#344251",
   "quiet": "#8EA5B6",
   "ink": "#D0D8DE",
   "trim": "#72B3C9",
   "head": "#7BBEE0"
  }
 },
 {
  "id": "dwemer",
  "name": "Dwemer Bronze",
  "group": "Bolder",
  "desc": "Teal-black with copper and bronze.",
  "sw": {
   "ground": "#080E0E",
   "page": "#0C1414",
   "paper": "#111C1D",
   "line": "#305255",
   "quiet": "#93B1B1",
   "ink": "#DFDACF",
   "trim": "#DA9961",
   "head": "#E79E74"
  }
 },
 {
  "id": "aurora",
  "name": "Aurora",
  "group": "Bolder",
  "desc": "Navy with green-teal accents.",
  "sw": {
   "ground": "#07090F",
   "page": "#0B0D15",
   "paper": "#0F121F",
   "line": "#2C3559",
   "quiet": "#8F9FB5",
   "ink": "#D2D9DC",
   "trim": "#6BD0AE",
   "head": "#81DAC8"
  }
 },
 {
  "id": "imperial",
  "name": "Imperial Purple",
  "group": "Bolder",
  "desc": "Dark purple with rose headings and gold trim.",
  "sw": {
   "ground": "#0B080E",
   "page": "#110C14",
   "paper": "#18111D",
   "line": "#453154",
   "quiet": "#A695AF",
   "ink": "#E0DBCE",
   "trim": "#E2BD59",
   "head": "#DA81AE"
  }
 },
 {
  "id": "elven",
  "name": "Elven Gold",
  "group": "Bolder",
  "desc": "Dark pine green with bright gold.",
  "sw": {
   "ground": "#080E0B",
   "page": "#0C1410",
   "paper": "#111D17",
   "line": "#325343",
   "quiet": "#95AF9E",
   "ink": "#DEDED0",
   "trim": "#E7D354",
   "head": "#EBD270"
  }
 },
 {
  "id": "ember",
  "name": "Ember Brown",
  "group": "Bolder",
  "desc": "The first night: warm brown parchment by lamplight.",
  "sw": {
   "ground": "#100B06",
   "page": "#16100A",
   "paper": "#1E1710",
   "line": "#5C4729",
   "quiet": "#C4AC80",
   "ink": "#ECDFC2",
   "trim": "#D4B067",
   "head": "#E38B78"
  }
 }
];
const DEFAULT = 'dusk';
const byId = id => THEMES.find(t => t.id === id) || null;
module.exports = { THEMES, DEFAULT, byId };
