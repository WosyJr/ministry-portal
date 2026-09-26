const S = require('./store');
const W = require('./waroffice');

const F = 'Fort Sungard';
const P = (rank, name, activity, pay, bonus, discord, timezone, trade, quals, opts = {}) =>
  ({ rank, name, activity, pay, bonus, discord, timezone, trade, quals, garrison: F, ...opts });

const LEGION = [
  P('Consul’s Representative', 'Procurator Aurelian Thorne', 'Active', 0, 0, '', '', 'Alchemist', []),
  P('Legate', 'Jarik Ironjaw', 'Active', 2100, 0, 'Frostyicedrake', 'OCE', 'Cook', ['INFAN III', 'ARC III', 'CMD', 'QM III', 'PRO III', 'REC II', 'INST', 'JLD']),
  P('Tribune', 'Lucerian Marcellian', 'Active', 1900, 0, 'thelostshad', 'AKST', 'Blacksmith', ['INFAN III', 'ARC III', 'CMD', 'QM III', 'PRO III', 'REC II', 'INST', 'JLD'], { quota: true }),
  P('Tribune', 'Rorikvar Ironhand', 'Active', 1900, 0, 'Truckles', '', 'Warrior', ['INFAN III', 'ARC III', 'CMD', 'QM III', 'PRO III', 'REC II', 'INST', 'JLD']),
  P('Centurion', 'Bothrok gro-Grognar', 'Active', 1500, 0, 'tonkatonka97', 'ALL', 'Warrior', ['INFAN III', 'ARC III', 'CMD', 'QM III', 'PRO III', 'REC II', 'INST', 'JLD']),
  P('Centurion', 'Wulf', 'Active', 1500, 0, 'firehyphenman', 'GMT', 'Warrior', ['INFAN III', 'ARC III', 'CMD', 'QM III', 'PRO III', 'REC II', 'JLD', 'INST']),
  P('Centurion', 'Adobo Sandwalker', 'Active', 1500, 0, 'kiccbacc', 'PST', 'Warrior', ['INFAN III', 'ARC III', 'CMD', 'QM III', 'PRO III', 'REC II', 'JLD', 'INST']),
  P('Optio', 'Cassian Varro', 'Active', 1000, 0, 'cksdeltashotgun', 'TBD', 'Warrior', ['INFAN III', 'JLD', 'INST', 'PRO II', 'REC I']),
  P('Legionnaire', 'Gunnar', 'Inactive', 575, 0, '.gordy', 'TBD', 'Warrior', ['INFAN II', 'JLD'], { senior: true }),
  P('Legionnaire', 'Davion Crassus', 'Inactive', 525, 0, 'noxvenato', 'TBD', 'Warrior', ['INFAN I']),
  P('Legionnaire', 'Glarbio Buzene', 'LOA', 525, 0, 'g16z', 'TBD', 'Hunter', ['ARC I']),
  P('Legionnaire', 'Oden Iron-Blood', 'Semi-Active', 525, 0, 'crusadereh', 'TBD', 'Blacksmith', ['INFAN I']),
  P('Legionnaire', 'Speaks-No-Winds', 'LOA', 525, 0, 'spacemkp', 'GMT', 'Alchemist', ['INFAN I']),
  P('Legionnaire', 'William Roland', 'Active', 575, 0, 'mackerel2x1', 'TBD', 'Hunter', ['ARC II', 'JLD'], { senior: true }),
  P('Legionnaire', 'Caranor Stormcrag', 'Active', 575, 0, 'basileus', 'TBD', 'Enchanter', ['INFAN II', 'JLD', 'PRO I']),
  P('Legionnaire', 'Gutlaus Farwalk', 'Active', 500, 0, 'dairyqueen', 'TBD', 'Warrior', []),
  P('Legionnaire', 'Grognak gro-Uzgar', 'Active', 500, 0, 'cmdrherothegamer', 'TBD', 'Cook', []),
  P('Legionnaire', 'Avaniya Valek', 'Inactive', 500, 0, 'taryn_', 'NA EST', 'Hunter', [], { senior: true }),
  P('Legionnaire', 'Avienius Carcel', 'Active', 625, 0, 'misfittarg', 'NA EST', 'Warrior', ['INFAN II', 'JLD', 'INST', 'PRO I']),
  P('Legionnaire', 'Ilyria', 'Active', 600, 0, 'Pixelpossom', 'TBD', '', ['INFAN II', 'JLD', 'PRO I'], { senior: true }),
  P('Legionnaire', 'Octavia Varrio', 'Active', 600, 500, 'r3driot10', 'NA CST', 'Warrior', ['INFAN II', 'JLD', 'PRO I'], { senior: true }),
  P('Legionnaire', 'Curtis', 'Active', 575, 0, 'luckygear', 'PST', 'Warrior', ['INFAN II', 'PRO I']),
  P('Legionnaire', 'Reeves Soriksen', 'Active', 450, 1000, 'jesussandman', 'EST', 'Hunter', ['ARC I', 'PRO I']),
  P('Legionnaire', 'Mallious Goldwine', 'Active', 500, 0, 'sovereignrebels', 'EST', 'Warrior', []),
  P('Auxiliary', 'Brutus Bane', 'Inactive', 400, 0, '.vjor', 'TBD', '', []),
  P('Auxiliary', 'Bughar Azoul', 'Inactive', 400, 0, 'catspud123', 'TBD', 'Hunter', []),
  P('Auxiliary', 'Marek Valek', 'Semi-Active', 400, 0, 'eagles', 'NA EST', 'Warrior', []),
  P('Auxiliary', 'Mara Coloni', 'Active', 400, 0, 'dovahkiinelder', 'GMT', 'Miner', []),
  P('Auxiliary', 'Shaza Gra-Mauloch', 'Active', 400, 0, 'celadonmisfit', 'EST', 'Blacksmith', []),
  P('Auxiliary', 'Unnels Mellno', 'Active', 400, 0, 'nj2702', 'CST', 'Blacksmith', ['INFAN I'])
];

const BATTLEMAGES = [
  P('Palatine', 'Calivo Lovanian', 'Semi-Active', 1500, 0, 'vekel8525', 'TBD', 'Cook', []),
  P('Palatine', 'Gavellion Tellvanus', 'Active', 1500, 0, 'vikinginthemist', 'TBD', 'Warrior', []),
  P('Palatine', 'Lucas Decentius', 'Active', 1500, 0, 'hyreonfire', 'TBD', 'Warrior', ['INFAN II']),
  P('Aspirant', 'Mithone Tellvanus', 'Active', 725, 0, 'mekibb', 'TBD', 'Enchanter', ['INFAN II', 'QM I', 'JLD', 'PRO I']),
  P('Aspirant', 'Heinrich Circle-Breaker', 'LOA', 675, 0, 'eldenpaul', 'TBD', 'Warrior', ['INFAN II', 'JLD'], { senior: true }),
  P('Aspirant', 'Eats-The-Bugs', 'Active', 725, 0, 'captainayrab', 'TBD', 'Warrior', ['INFAN III', 'PRO I', 'JLD'], { notes: 'Also of the Scout Corps.' }),
  P('Aspirant', 'Fenrik Icevein', 'Active', 650, 0, 'cajungamer', 'NA CST', 'Warrior', ['INFAN II'])
];

const SCOUTS = [
  P('Scout Marshal', 'Livia Lovanian', 'Active', 1500, 0, 'lightningpony', 'TBD', 'Warrior', []),
  P('Chief Speculator', 'Vacant', 'Vacant', 0, 0, '', '', 'Hunter', [], { notes: 'This seat stands empty.' }),
  P('Scout', 'Helnir Ironhand', 'Active', 675, 0, 'flexerx99', 'TBD', 'Warrior', ['INFAN II', 'PRO I'])
];

function seedIfEmpty() {
  try {
    if (S.read('war-personnel.json', []).length) return 0;
    let n = 0;
    const put = (unit, rows) => rows.forEach(r => { try { W.add({ ...r, unit, by: 'the founding roll' }); n++; } catch (_) {} });
    put('legion', LEGION);
    put('battlemages', BATTLEMAGES);
    put('scouts', SCOUTS);
    if (n) console.log(`Entered ${n} upon the rolls of the Imperial War Office.`);
    return n;
  } catch (e) {
    console.error('The founding roll could not be entered: ' + e.message);
    return 0;
  }
}

module.exports = { seedIfEmpty, LEGION, BATTLEMAGES, SCOUTS };
