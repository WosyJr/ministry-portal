const BANDS = {
  none: { label: 'No action', order: 0, tone: 'ok' },
  verbal: { label: 'Verbal warning', order: 1, tone: 'ok' },
  warn: { label: 'Formal warning', order: 2, tone: '' },
  d5: { label: '5-day ban', order: 3, tone: 'warn' },
  d15: { label: '15-day ban', order: 4, tone: 'warn' },
  d30: { label: '30-day ban', order: 5, tone: 'warn' },
  perma: { label: 'Permanent ban', order: 6, tone: 'bad' }
};

const RULES = [
  {
    id: 'hate', name: 'Hate speech', cat: 'Zero tolerance', on: 'both',
    band: 'perma', escalate: 'perma',
    what: 'Racial slurs and racism, gendered slurs and misogyny, transphobia, homophobia.',
    detail: 'Zero tolerance. Immediate and permanent ban. In borderline cases use your discretion and consult a Senior Gamemaster first if one is online. IC racism that fits a character’s disposition is allowed only where all parties are content with it — "knife-ears" for an elf is fine; anything mirroring real-world racism about a human race’s skin tone is not. Misogyny is never allowed in any form.',
    signals: ['slur', 'racist', 'racism', 'racial', 'misogyn', 'sexist', 'transphob', 'homophob', 'n-word', 'faggot', 'tranny', 'retard'],
    weight: 12,
    needs: ['A screenshot or clip of the message', 'Whether it was IC or OOC', 'Whether a Senior Gamemaster has been told'],
    say: 'Your account has been permanently removed from Keizaal Online. We have zero tolerance for hate speech of any kind. This decision is final.'
  },
  {
    id: 'erp', name: 'Erotic roleplay', cat: 'Zero tolerance', on: 'both',
    band: 'perma', escalate: 'perma',
    what: 'ERP is not allowed on this server. No exceptions.',
    detail: 'Any violation leads to an immediate permanent ban. The server is 18+ but ERP is still entirely prohibited.',
    signals: ['erp', 'erotic', 'sexual roleplay', 'sex rp', 'nsfw rp'],
    weight: 12,
    needs: ['A log or screenshot of the scene', 'Who else was present'],
    say: 'Your account has been permanently removed. Erotic roleplay is prohibited on Keizaal Online without exception.'
  },
  {
    id: 'nsfwmod', name: 'NSFW mods', cat: 'Zero tolerance', on: 'both',
    band: 'perma', escalate: 'perma',
    what: 'Sharing or using NSFW mods while connected to Keizaal.',
    detail: 'Immediate permanent ban. Client-side mods are otherwise not policed.',
    signals: ['nsfw mod', 'nude mod', 'sexlab', 'adult mod'],
    weight: 11,
    needs: ['Proof the mod was in use while connected'],
    say: 'Your account has been permanently removed. Using or sharing NSFW mods while connected to Keizaal is prohibited.'
  },
  {
    id: 'cheat', name: 'Cheating and third-party software', cat: 'Exploits', on: 'both',
    band: 'perma', escalate: 'perma',
    what: 'Mods or software giving an unfair advantage, item duplication, deliberate bug exploitation, clipping through geometry for advantage.',
    detail: 'Exploiting server or Skyrim mechanics is a permanent ban. Duplication is prohibited unless an administrator approved it. Resetting or skipping animations during potion use, gathering or crafting is prohibited.',
    signals: ['cheat', 'hack', 'exploit', 'dupe', 'duping', 'duplicat', 'third party', 'third-party', 'glitch through', 'clipping', 'noclip', 'skip animation'],
    weight: 10,
    needs: ['A clip or logs showing the exploit', 'Whether anything was gained and whether it can be reversed'],
    say: 'Your account has been permanently removed for exploiting server mechanics. If you believe this is in error you may appeal through a staff report.'
  },
  {
    id: 'rdm', name: 'Random death match', cat: 'Combat', on: 'both',
    band: 'd30', escalate: 'perma',
    what: 'Attacking another player without adequate roleplay to justify it.',
    detail: 'Thirty days is typical. Walking into a city and attacking someone with no build-up is the plain case.',
    signals: ['rdm', 'random death match', 'random death', 'attacked me for no reason', 'killed me for no reason', 'with no rp', 'no rp at all', 'without any rp', 'no roleplay at all', 'without roleplay', 'no rp before', 'jumped me', 'randomly attack', 'attacked without', 'killed without', 'unprovoked'],
    weight: 9,
    needs: ['A clip of the attack and whatever preceded it', 'Whether any roleplay led into it', 'Whether the victim was PKd or took NLR'],
    say: 'Thank you for the report. Attacking without roleplay to justify it is RDM and has been actioned. The scene is void; your character takes New Life Rule rather than a permanent death.'
  },
  {
    id: 'meta', name: 'Metagaming', cat: 'FailRP', on: 'both',
    band: 'd30', escalate: 'perma',
    what: 'Using knowledge the character could not have obtained in character.',
    detail: 'Minor: speaking of Elder Scrolls knowledge the character would not hold — an illiterate farmer discussing the Arcane Arts. Major: acting on knowledge about another character learned out of character, such as a hidden lycanthropy heard about in Discord. Screenshots, Discord logs and voice chat are never IC knowledge. Judge it objectively and consult another Gamemaster before acting.',
    signals: ['metagam', 'meta gaming', 'meta-gaming', 'ooc knowledge', 'from discord', 'discord chat', 'they knew', 'how did they know', 'saw it in logs', 'screenshot'],
    weight: 8,
    needs: ['How the player could have learned it in character', 'Any IC record the player kept, especially for spy roleplay', 'Another Gamemaster’s view'],
    say: 'Thank you for the report. Acting on knowledge your character could not have obtained in character is metagaming. Your character does not hold that information and may not act on it.'
  },
  {
    id: 'ravens', name: 'Discord used as an IC messenger', cat: 'Metagaming', on: 'both',
    band: 'd30', escalate: 'perma',
    what: 'Using Discord DMs as ravens or pigeons during active roleplay.',
    detail: 'Time-sensitive roleplay needs a real in-game messenger. It does not apply to purely OOC matters, discussion of concluded events, checking whether a shop is open, or planning a future meeting.',
    signals: ['raven', 'pigeon', 'dm', 'dmed', 'messaged me on discord', 'discord message', 'instant message'],
    weight: 6,
    needs: ['Whether the roleplay was active and time-sensitive', 'Whether an in-game messenger was possible'],
    say: 'Discord may not be used as an in-character messenger during active roleplay. Send a messenger in game, or establish an in-character way of finding the person.'
  },
  {
    id: 'oocbleed', name: 'OOC bleed', cat: 'FailRP', on: 'both',
    band: 'd30', escalate: 'perma',
    what: 'Bringing OOC conflict into character, or IC conflict out of it.',
    detail: 'Prominent OOC bleed sits at thirty days. Arguing about private IC events in public OOC channels is prohibited.',
    signals: ['ooc bleed', 'ooc conflict', 'brought it ooc', 'personal grudge', 'harassing me in dms about'],
    weight: 7,
    needs: ['Messages showing the crossover', 'Whether it has happened before'],
    say: 'Carrying conflict between in-character and out-of-character is not permitted. Keep the two separate.'
  },
  {
    id: 'fearrp', name: 'FearRP violation', cat: 'FailRP', on: 'both',
    band: 'd15', escalate: 'd30',
    what: 'Failing to react proportionately to a genuine threat to life, safety, reputation or goals.',
    detail: 'Fight, flight or freeze are all valid if they make sense for that character in that moment. An unarmed player told to hand over septims by a bandit who simply says no and runs is the plain case. Characters with no training against supernatural threats must observe FearRP when facing them.',
    signals: ['fearrp', 'fear rp', 'no fear', 'did not fear', 'didnt fear', 'ran away', 'ran off', 'just ran', 'ignored the threat', 'ignored the demand', 'outnumbered', 'refused to comply', 'refused to hand', 'held at knifepoint', 'held at swordpoint', 'at knifepoint', 'at swordpoint', 'demanded septims', 'i had no weapon', 'was unarmed'],
    weight: 7,
    needs: ['A clip of the confrontation', 'What the character was armed with', 'Whether the response fits that character'],
    say: 'Thank you for the report. Your character must react proportionately to a genuine threat. Fight, flight or freeze are all valid, but the response has to make sense for the character in that moment.'
  },
  {
    id: 'nlr', name: 'New Life Rule violation', cat: 'Death', on: 'both',
    band: 'd15', escalate: 'd30',
    what: 'Re-engaging with a scene after being knocked out, or remembering what the rule removes.',
    detail: 'The character is removed from the scene and may not return to it. On waking they may remember the events leading up to the knockout, the general location and what task brought them there. They may not remember who was present, the direct cause, or anything said or identifying gained during the event.',
    signals: ['nlr', 'new life', 'came back', 'returned to the scene', 'remembered who', 'after being killed', 'after dying', 'revenge'],
    weight: 7,
    needs: ['Whether the death was NLR or an approved PK', 'A clip of the return'],
    say: 'Once your character is knocked out they leave that scene and cannot return to it. They do not remember who was present or what was said during the event that knocked them out.'
  },
  {
    id: 'powergame', name: 'Powergaming', cat: 'FailRP', on: 'both',
    band: 'd15', escalate: 'd30',
    what: 'Forcing outcomes, exceeding the character’s limits, or removing another player’s agency.',
    detail: 'Auto-success emotes without a roll or consent, acting without the required item, or exceeding established limits. Items may not be moved between your own characters, characters may not benefit from one another’s roleplay, and a new character inherits nothing from an old one. A backstory earns nothing that was not earned in roleplay.',
    signals: ['powergam', 'power gaming', 'auto hit', 'auto-hit', 'no roll', 'without rolling', 'unrealistic', 'transferred items', 'gave it to my other character', 'alt character'],
    weight: 7,
    needs: ['The emote or clip', 'Whether a roll was called for', 'Whether the character had the item on them'],
    say: 'Your character cannot force an outcome or exceed their established limits. Where chance is involved, /roll 20 settles it, and you must have the item in game to roleplay using it.'
  },
  {
    id: 'godmod', name: 'Godmodding', cat: 'FailRP', on: 'both',
    band: 'd15', escalate: 'd30',
    what: 'Dictating another character’s actions, injuries, reactions or fate without consent.',
    detail: 'Always leave room for the other player to respond.',
    signals: ['godmod', 'god mod', 'emoted my character', 'wrote my character', 'decided for me', 'without my consent'],
    weight: 7,
    needs: ['The emote in question'],
    say: 'You may not describe another player’s character taking damage or acting. Leave room for them to respond.'
  },
  {
    id: 'retcon', name: 'Retconning', cat: 'FailRP', on: 'both',
    band: 'd15', escalate: 'd30',
    what: 'Rewriting past events or character history to escape consequences.',
    detail: 'Only staff apply retcons, and only over egregious rule breaks that significantly affected others.',
    signals: ['retcon', 'never happened', 'taking it back', 'pretend it didn’t', 'pretend it didnt'],
    weight: 6,
    needs: ['What is being rewritten and why'],
    say: 'Past events cannot be rewritten to avoid consequences. Only staff apply a retcon, and only in narrow circumstances.'
  },
  {
    id: 'combatlog', name: 'Combat logging', cat: 'Combat', on: 'both',
    band: 'd15', escalate: 'd30',
    what: 'Leaving the server within ten minutes of combat, or before escaping sight of combatants.',
    detail: 'You cannot log out until you have been out of sight of the combatants for ten minutes.',
    signals: ['combat log', 'combatlog', 'logged off', 'logged out', 'disconnected', 'alt f4', 'left the server', 'quit mid'],
    weight: 7,
    needs: ['Connection logs around the time', 'Whether the disconnect looks deliberate or a crash'],
    say: 'Leaving during or shortly after combat is combat logging. You must be clear of the combatants and out of sight for ten minutes before logging out.'
  },
  {
    id: 'potions', name: 'Potions in combat', cat: 'Combat', on: 'both',
    band: 'd5', escalate: 'd15',
    what: 'Drinking potions while fighting.',
    detail: 'Potions are only for when the pursuer has been escaped or combat has ended.',
    signals: ['potion', 'healing mid fight', 'drank a potion', 'chugging'],
    weight: 5,
    needs: ['A clip showing the drink during the fight'],
    say: 'Potions may only be used once you are out of combat. Drinking mid-fight is not permitted.'
  },
  {
    id: 'weaponswap', name: 'Weapon and armour swapping in combat', cat: 'Combat', on: 'both',
    band: 'd5', escalate: 'd15',
    what: 'Equipping or unequipping in combat, or swapping weapons more than once without an emote.',
    detail: 'You may not immediately equip or unequip weapons and armour in combat, and may not swap weapons more than once in an active scene without a /me describing it.',
    signals: ['swapped weapon', 'switched weapon', 'equipped mid', 'unequipped', 'changed armor', 'changed armour'],
    weight: 5,
    needs: ['A clip of the swap'],
    say: 'Weapons and armour cannot be swapped freely in combat. A second swap needs a /me describing it.'
  },
  {
    id: 'antagsize', name: 'Antagonist group size', cat: 'Antagonist', on: 'both',
    band: 'd15', escalate: 'd30',
    what: 'Antagonist roleplay in groups of ten or more, or more than three within bowshot of city walls.',
    detail: 'Antagonists may not camp player housing, businesses, dungeons, carriages or resource nodes. Robbing a player is limited to two items, with gold counting as one. Robbing a chest is two items per group, with ten per cent of the gold counting as one. On Sovngarde, antagonists may work at their regular size limits in and around baronies or smaller; ten or more still needs coordinating.',
    signals: ['antag', 'antagonist', 'robbed me of', 'robbery', 'took more than', 'group of ten', 'group of 10', 'too many of them', 'whole gang', 'camping the', 'camped my'],
    weight: 6,
    needs: ['How many were present', 'How close to a city', 'What was taken'],
    say: 'Antagonist groups are limited to nine, and to three within bowshot of city walls. Robbery is limited to two items, gold counting as one.'
  },
  {
    id: 'war', name: 'Army and war rules', cat: 'War', on: 'sovngarde',
    band: 'd15', escalate: 'd30',
    what: 'Unplanned battles involving an army, or armies over twenty.',
    detail: 'Ten or more on a side is an army, capped at twenty players. A group attacking a city, fort or large settlement counts as an army whatever its size. Any battle involving an army is a war and must be planned in advance by faction leaders in a ticket, with a valid win condition. Faction leaders answer for their own people. Looting happens after the battle — rifling pockets mid-fight is FailRP.',
    signals: ['army', 'war', 'battle', 'siege', 'attacked the fort', 'attacked the city', 'large scale', 'looted mid'],
    weight: 6,
    needs: ['Numbers on each side', 'Whether a ticket was raised in advance', 'Whether a win condition was set'],
    say: 'Any battle involving ten or more on a side is a war and must be planned in advance through a ticket, with a win condition agreed. Please raise one before the next engagement.'
  },
  {
    id: 'prisoner', name: 'Prisoner roleplay', cat: 'Sovngarde', on: 'sovngarde',
    band: 'warn', escalate: 'd15',
    what: 'Holding a character longer than an hour, or without guards present.',
    detail: 'Detention may not exceed one hour and guards must be present throughout. The twenty-four hour death row timer is separate and applies only to an approved PK execution. Longer imprisonment such as forced labour in the Markarth mines needs the affected player’s consent.',
    signals: ['prisoner', 'imprison', 'jail cell', 'held me for', 'held for hours', 'locked up', 'detained', 'captive', 'kept me in a cell', 'in the cells'],
    weight: 6,
    needs: ['How long they were held', 'Whether guards were present', 'Whether it was an approved execution'],
    say: 'A character may not be detained for more than an hour, and guards must be present for the whole of it. Longer confinement needs the player’s consent.'
  },
  {
    id: 'execution', name: 'Executions and the three-strike rule', cat: 'Sovngarde', on: 'sovngarde',
    band: 'warn', escalate: 'd15',
    what: 'One-sided PK requests and criminal punishment.',
    detail: 'Execution should be the third strike. First: labour, flogging or similar. Second: escalation such as loss of fingers or a hand. Third: execution or banishment. The requester must hold decision-making power — a Jarl, First Emissary, Legion Legate or an approved FOIC position. Barons and lower send their cases to their Jarl. The charges must not be published before the execution is carried out, and all evidence goes to the GMs in a ticket before sentencing. After sentencing the prisoner gets twenty-four real-world hours of imprisonment before execution and the graveyard post.',
    signals: ['execution', 'execute', 'pk request', 'death sentence', 'sentenced', 'three strike', '3 strike', 'beheading'],
    weight: 7,
    needs: ['Who is requesting it and whether they hold the power to', 'All the evidence against the character', 'Whether the 24-hour period has been served'],
    say: 'An execution is the third strike, not the first. Send the full evidence in a ticket before sentencing, keep the charges unpublished until it is carried out, and observe the twenty-four hour imprisonment first.'
  },
  {
    id: 'warrant', name: 'Search warrants', cat: 'Sovngarde', on: 'sovngarde',
    band: 'none', escalate: 'warn',
    what: 'Entering an owned property that needs a lock removed.',
    detail: 'The request goes in by ticket with all the evidence that proves the need. If approved, staff notify the owner. It is monitored through logs, to stop offline raiding and to give the affected player the agency to roleplay being searched.',
    signals: ['search warrant', 'warrant', 'search the house', 'break into', 'raid the house', 'locked door'],
    weight: 6,
    needs: ['All evidence gathered to justify it', 'Who is requesting and in what capacity'],
    say: 'Search warrants go through a ticket with all the evidence attached. If it is approved we notify the owner so they can roleplay the search.'
  },
  {
    id: 'prisonbreak', name: 'Prison breaks', cat: 'Sovngarde', on: 'sovngarde',
    band: 'warn', escalate: 'd15',
    what: 'Breaking someone out without agreement from the prison owners.',
    detail: 'Both sides must agree a date, start time, duration and rules of engagement, with advance notice. Without a valid win or lose condition the scenario is retconned and staff act.',
    signals: ['prison break', 'broke out', 'jailbreak', 'freed the prisoner', 'rescue'],
    weight: 5,
    needs: ['Whether advance notice was given', 'Whether both sides agreed the terms'],
    say: 'Prison breaks need both sides to agree a time, duration and rules of engagement in advance. Please raise a ticket before the next attempt.'
  },
  {
    id: 'graveyard', name: 'Graveyard misuse', cat: 'Death', on: 'both',
    band: 'd15', escalate: 'd30',
    what: 'Using the graveyard channel for anything but a dead or departed character.',
    detail: 'Posting there makes the character permanently unplayable. Deleting or editing a post to get around that is prohibited. It may not be used for storage, to dodge consequences, to hide, or to reset roleplay.',
    signals: ['graveyard', 'deleted my post', 'edited the graveyard', 'came back from the dead'],
    weight: 6,
    needs: ['The original post and any edit history'],
    say: 'The graveyard is a one-way trip. A character posted there is permanently unplayable and the post cannot be edited or removed to undo that.'
  },
  {
    id: 'consent', name: 'Consent and shock content', cat: 'Consent', on: 'both',
    band: 'd30', escalate: 'perma',
    what: 'Sensitive or graphic roleplay without the explicit agreement of everyone involved and watching.',
    detail: 'Extreme graphic violence, amputation and detailed execution scenes need explicit mutual consent from the victim and every witness, given before the scene and withdrawable at any time. If someone new joins, the scene pauses until they consent or the content stops.',
    signals: ['consent', 'didn’t agree', 'didnt agree', 'uncomfortable', 'torture', 'amputat', 'graphic', 'shock content', 'without asking'],
    weight: 8,
    needs: ['Who was present', 'Whether consent was given beforehand', 'Whether it was withdrawn and ignored'],
    say: 'Sensitive content needs the explicit agreement of everyone involved and watching, given before the scene. Consent can be withdrawn at any time and must be respected immediately.'
  },
  {
    id: 'nodecamp', name: 'Node camping', cat: 'Exploits', on: 'both',
    band: 'd5', escalate: 'd15',
    what: 'Tracking resource nodes, waiting for refreshes, or logging in and out nearby on timers.',
    detail: 'Camping nodes for any purpose is prohibited.',
    signals: ['node camp', 'camping nodes', 'ore node', 'resource node', 'farming spot', 'respawn timer'],
    weight: 5,
    needs: ['Logs or a clip showing the pattern'],
    say: 'Camping resource nodes is not permitted, including logging in and out nearby to catch a refresh.'
  },
  {
    id: 'staffshop', name: 'Staff shopping', cat: 'Conduct', on: 'both',
    band: 'warn', escalate: 'd5',
    what: 'Seeking a better answer from a second staff member after a ruling.',
    detail: 'If you think a ruling was wrong, submit a staff report rather than asking someone else.',
    signals: ['staff shopping', 'asked another gm', 'another gm said', 'different answer', 'second opinion'],
    weight: 6,
    needs: ['Who gave the first ruling and what it was'],
    say: 'A ruling has already been given on this. If you believe it was wrong, please submit a staff report rather than asking another member of staff.'
  },
  {
    id: 'dmstaff', name: 'DMing staff', cat: 'Conduct', on: 'both',
    band: 'verbal', escalate: 'warn',
    what: 'Direct messaging staff about server matters without permission.',
    detail: 'All in-game support goes through ticket creation. An unanswered DM is not bias or favouritism. Friend requests about Keizaal are not wanted either.',
    signals: ['dmed a gm', 'dm’d staff', 'messaged a gm', 'friend request', 'private message'],
    weight: 5,
    needs: [],
    say: 'Please raise a ticket rather than messaging staff directly. All in-game support goes through ticket creation.'
  },
  {
    id: 'advert', name: 'Advertising', cat: 'Conduct', on: 'both',
    band: 'd5', escalate: 'd30',
    what: 'Advertising another server.',
    detail: 'Only advertisements for Keizaal Online guilds or servers are allowed.',
    signals: ['advertis', 'other server', 'join my server', 'discord.gg'],
    weight: 6,
    needs: ['A screenshot of the advertisement'],
    say: 'Advertising other servers is not permitted here.'
  },
  {
    id: 'aicontent', name: 'AI content', cat: 'Conduct', on: 'both',
    band: 'verbal', escalate: 'd5',
    what: 'Posting AI-generated content anywhere.',
    detail: 'No AI content anywhere on the server.',
    signals: ['ai content', 'ai art', 'ai generated', 'chatgpt', 'midjourney'],
    weight: 6,
    needs: [],
    say: 'AI-generated content is not allowed anywhere on Keizaal. Please take it down.'
  },
  {
    id: 'politics', name: 'Real-world politics', cat: 'Conduct', on: 'both',
    band: 'verbal', escalate: 'd5',
    what: 'Political topics, symbols or slogans unrelated to the Elder Scrolls.',
    detail: '',
    signals: ['politic', 'election', 'real world politics', 'political symbol'],
    weight: 5,
    needs: [],
    say: 'Please keep real-world political topics out of the server.'
  },
  {
    id: 'harass', name: 'Bullying and harassment', cat: 'Conduct', on: 'both',
    band: 'warn', escalate: 'perma',
    what: 'Targeted bullying or harassment of players.',
    detail: 'Weigh whether a verbal or a formal warning fits. Two or more occasions counts as persistent and runs from a formal warning through a temporary ban to a permanent one. Judge it objectively and consult other Gamemasters.',
    signals: ['harass', 'bully', 'targeting me', 'following me around', 'threat', 'personal attack', 'insult'],
    weight: 8,
    needs: ['Screenshots of each occasion', 'Whether it has happened before', 'Another Gamemaster’s view'],
    say: 'Thank you for the report. Targeted harassment is not tolerated. We have looked at what you sent and have actioned it.'
  },
  {
    id: 'immersion', name: 'Breaking character or immersion', cat: 'FailRP', on: 'both',
    band: 'd5', escalate: 'd15',
    what: 'Breaking character, ignoring server RP rules, or acting far outside the character’s own logic.',
    detail: 'A monk who turns to robbing travellers on the road is the plain case. Lashing out, arguing in bad faith and minor glitch use sit here too.',
    signals: ['broke character', 'breaking character', 'out of character in', 'failrp', 'fail rp', 'character logic', 'wouldn’t do that', 'wouldnt do that'],
    weight: 5,
    needs: ['A clip or screenshot', 'What the character’s established lore says'],
    say: 'Your character needs to act in line with who they are. Please keep to the character you have established.'
  },
  {
    id: 'housing', name: 'One house per player', cat: 'Property', on: 'both',
    band: 'verbal', escalate: 'warn',
    what: 'Owning more than one house.',
    detail: 'One per player — not per character, not per Hold.',
    signals: ['second house', 'two houses', 'another house', 'one house'],
    weight: 5,
    needs: ['What they already own'],
    say: 'You may own one house per player, not per character or per Hold.'
  },
  {
    id: 'disguise', name: 'Disguises and identifying characters', cat: 'Identity', on: 'both',
    band: 'verbal', escalate: 'warn',
    what: 'Using /disguise without a face covering, or identifying someone by voice alone.',
    detail: 'A disguise needs a face covering; uncovered, they must undisguise. Seeing a name above a head does not mean the character recognises them. Recognition needs two or more of: worn equipment, clothing or style, behaviour and haunts, speech patterns. Voice alone is never enough. Face sculpting to escape consequences is prohibited.',
    signals: ['disguise', 'recognised', 'recognized', 'by voice', 'their voice', 'name above', 'face sculpt', 'changed appearance'],
    weight: 6,
    needs: ['Whether a face covering was worn', 'What features were used to identify them'],
    say: 'A disguise needs a face covering. Recognising someone takes two or more features — equipment, clothing, behaviour or speech. Voice alone is never enough.'
  },
  {
    id: 'guardzone', name: 'Guard roleplay', cat: 'Sovngarde', on: 'sovngarde',
    band: 'verbal', escalate: 'warn',
    what: 'Guards operating outside their zone, or chases running too far.',
    detail: 'Guards stay in their area of responsibility. A chase should be broken off within reasonable distance — bowshot of the town or city limits — or after two minutes, and a report filed with their superior.',
    signals: ['guard', 'chased me', 'chase', 'across the map', 'followed me for', 'out of the city'],
    weight: 5,
    needs: ['Where the chase started and ended', 'How long it ran'],
    say: 'Guards should break off a chase within bowshot of the town or city limits, or after two minutes, and file a report with their superior.'
  },
  {
    id: 'scam', name: 'In-character scams', cat: 'Conduct', on: 'both',
    band: 'none', escalate: 'd30',
    what: 'Scamming through in-character means is allowed. Scamming through OOC lies is not.',
    detail: 'You may not use OOC mechanics, OOC lies or meta knowledge to trick another player.',
    signals: ['scam', 'scammed', 'cheated me', 'took my gold', 'tricked me'],
    weight: 5,
    needs: ['Whether the deception was in character or out of it'],
    say: 'In-character scams are allowed — your character has been had, and that is part of the world. If the deception was out of character, send us what was said and we will look again.'
  }
];

const CANNED = [
  {
    id: 'namechange', trigger: ['name change', 'rename', 'change my name'],
    head: 'Name change', close: true,
    say: 'You can request a name change in game with /GM [reason for the change and what you want it changed to]. Name changes are a low priority and GMs are under no obligation to fulfil them.'
  },
  {
    id: 'tech', trigger: ['crash', 'ctd', 'won’t launch', 'wont launch', 'technical', 'mod issue', 'install', 'black screen', 'fps', 'lag'],
    head: 'Technical help', close: true,
    say: 'Please refer to the pinned post in #technical-help. If those solutions do not work, delete your Skyrim folder and any other Skyrim modding folder before reinstalling. If it still persists, create a thread in #technical-help.'
  },
  {
    id: 'locks', trigger: ['lock', 'ownership', 'key to', 'own a building', 'my house key'],
    head: 'Locks and ownership', close: true,
    say: 'Please approach your hold’s steward or jarl and ask them to give you locks to a building. If they are unable to, ask for locks in game with /GM [request].'
  },
  {
    id: 'stuck', trigger: ['stuck', 'fell through', 'in the void', 'can’t move', 'cant move'],
    head: 'Stuck', close: true,
    say: 'Please use /stuck in game, or /stuck in #bot-commands and fill out the prompts. If you are in a void or similar, try relogging. Feel free to make another ticket if it persists.'
  },
  {
    id: 'farming', trigger: ['farming perm', 'farm perms', 'tend the farm', 'farmhand'],
    head: 'Farming permissions', close: true,
    say: 'Please use /GM [request] to ask for farming permissions. In your request, tell us which farm you will be tending, who has given you permission to farm there, and how many farmhands that farm already has, if you know.'
  },
  {
    id: 'mapedit', trigger: ['map edit', 'crafting station', 'add a forge', 'move a building', 'new building'],
    head: 'Map edits and crafting stations', close: true,
    say: 'We are not taking individual map edit requests at this time. Our modders are working to add housing, crafting stations and more to accommodate our large player base, but such changes take time. Thank you for your patience.'
  }
];

const STALE = {
  head: 'Closing a long-standing ticket',
  steps: [
    'Ping every member of the conversation in the ticket to see whether it can be closed, and react to what they say.',
    'If the ticket opener does not respond within 48 hours, close it.',
    'If a ticket is meant to stay open, move it to a long-term category or rename it so that is obvious.'
  ]
};

const TERMS = [
  ['DM', 'Carrier pigeon, letter, scroll'],
  ['Discord', 'Aetherius'],
  ['AFK', 'Deep in thought, day dreaming'],
  ['Admins and GMs', 'Aedra'],
  ['Binds and keys', 'Muscles — "flex your G muscle"'],
  ['Whitelisting', 'Paperwork'],
  ['Logged in, logging off', 'Woke up, going to sleep'],
  ['Adjusting settings, not tabbed in', 'Adjusting my eyes'],
  ['Lag, performance issues', 'Headaches'],
  ['Real life or another game', 'Beyond Aetherius, out of Aetherius'],
  ['Mic issues', 'Scratchy voice — drink some water'],
  ['Crashed to desktop', 'Fainted'],
  ['Screenshot', 'A painting, making a memory'],
  ['Phone or PC', 'Dwemer devices']
];

const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[’]/g, "'");

const KINDS = {
  report: {
    label: 'A report about another player', tone: 'warn',
    lede: 'Someone is telling you what another player did. Rule on it.',
    does: 'band'
  },
  question: {
    label: 'A question about the rules', tone: 'ok',
    lede: 'Nobody is being reported. Answer what the rules say and take no action.',
    does: 'quote'
  },
  appeal: {
    label: 'An appeal against a punishment', tone: '',
    lede: 'A ruling has already been made. Do not re-rule it from scratch.',
    does: 'appeal'
  },
  staffreport: {
    label: 'A complaint about a Gamemaster', tone: 'bad',
    lede: 'This is about staff conduct, not a player. It goes upward.',
    does: 'escalate'
  },
  request: {
    label: 'A request for something to be done', tone: 'ok',
    lede: 'Nothing to rule on. Do it, route it, or say no.',
    does: 'route'
  },
  bug: {
    label: 'A technical fault', tone: 'ok',
    lede: 'Not a rule matter. Send it where faults are handled.',
    does: 'route'
  },
  unclear: {
    label: 'Not enough to tell', tone: '',
    lede: 'There is not enough here to say what it even is. Ask before anything else.',
    does: 'ask'
  }
};

const CUES = {
  report: [
    [/\b(i(?: would like to| want to| wish to|'?d like to)? ?report|reporting|i am reporting)\b/, 5, 'says they are reporting someone'],
    [/\b(he|she|they|this guy|this player|that player|someone|somebody|a player|this dude|the guy)\b[^.?!]{0,40}\b(killed|attacked|shot|stabbed|robbed|scammed|jumped|hit|murdered|griefed|harass|insult|called|said|threatened|stole|looted|broke|metagam|powergam|rdm|vdm)/, 6, 'a third party is accused of doing something'],
    [/\b(killed|attacked|robbed|scammed|jumped|harassed|threatened|insulted|stole from|griefed)\s+(me|us|my|our)\b/, 6, 'the writer says it was done to them'],
    [/\b(my character|i)\s+(was|got)\s+(killed|attacked|robbed|scammed|banned from|jumped|griefed|harassed)\b/, 4, 'written as something that happened to them'],
    [/\b(he|she|they|him|her|them)\b/g, 1, 'talks about another person'],
    [/\b(i have a|i've got a|heres a|here is a|attached)\s*(clip|screenshot|video|recording|screen shot)\b/, 3, 'offers evidence'],
    [/\b(just now|last night|yesterday|earlier|this morning|a minute ago|today)\b/, 2, 'describes when it happened']
  ],
  question: [
    [/\?/g, 2, 'asks a question'],
    [/\b(can|could|may|am) i\b/, 5, 'asks about what they themselves may do'],
    [/\b(are we|am i) allowed\b/, 5, 'asks what is allowed'],
    [/\b(is it|would it be|is that) (allowed|against the rules|ok|okay|fine|legal|permitted|breaking)\b/, 6, 'asks whether something is allowed'],
    [/\b(does|would) (that|this|it) count as\b/, 6, 'asks how something is classified'],
    [/\b(what|which) (counts as|is considered|happens if|are the rules|is the rule|does the rule)\b/, 6, 'asks what the rule is'],
    [/\b(if i|if someone|if a player|hypothetically|say i)\b/, 4, 'puts a hypothetical'],
    [/\b(do i need|do we need|should i|how do i|how does)\b/, 4, 'asks how to proceed'],
    [/\b(just wondering|just asking|quick question|question about|wanted to ask|curious)\b/, 5, 'says it is a question'],
    [/^\s*(can|could|may|am|are|is|do|does|did|should|would|will|what|which|how|when|where|why|if)\b/, 8, 'opens with a question'],
    [/\b(against the rules to|allowed to|ok to|okay to|fine to|permitted to|alright to|acceptable to)\s+\w+/, 7, 'asks whether an act is permitted, in general']
  ],
  appeal: [
    [/\b(appeal|appealing|unban|un-ban|overturn|lift (the|my) ban|reduce (the|my) ban)\b/, 7, 'asks for a ruling to be undone'],
    [/\b(i (was|got|have been)|my account (was|got|has been)) (banned|kicked|punished|warned|actioned|jailed)\b/, 6, 'says they were punished'],
    [/\b(my ban|the ban i|my punishment|my warning|my strike)\b/, 5, 'refers to their own punishment'],
    [/\b(i (didn'?t|did not|never) (do|say|break|kill|attack|cheat|exploit)|it wasn'?t me|wasn'?t even me|false ban|wrongly|unfairly|unfair ban|mistake)\b/, 5, 'disputes that they did it'],
    [/\b(second chance|let me back|reinstate|give me my account)\b/, 5, 'asks to be let back in']
  ],
  staffreport: [
    [/\b(gamemaster|game master|a gm\b|the gm\b|gm\s+\w+\s+(banned|kicked|took|abused)|staff member|a mod\b|moderator|admin(istrator)?)\b/, 5, 'names a member of staff'],
    [/\b(abus(e|ing|ed) (their|his|her) (power|powers|position)|power ?trip|staff abuse|corrupt|biased|favouritism|favoritism)\b/, 7, 'alleges abuse of staff powers'],
    [/\b(report (a|the|this) (gm|gamemaster|admin|staff|moderator))\b/, 8, 'says they are reporting staff']
  ],
  request: [
    [/\b(can you|could you|please) (restore|refund|give|return|move|transfer|reset|change|add|remove|spawn|teleport)\b/, 6, 'asks staff to do something'],
    [/\b(restore|refund|give me back|get back|lost my|i lost|disappeared from my|vanished from my)\b/, 5, 'asks for something to be restored'],
    [/\b(name change|rename|change my name|whitelist|application|apply for|transfer my|move my character)\b/, 6, 'asks for an account change'],
    [/\b(stuck|unstuck|fell through|in the void|can'?t move|cant move)\b/, 5, 'asks to be freed from somewhere']
  ],
  bug: [
    [/\b(bug|bugged|glitched out|crash(ed|ing)?|ctd|error|exception|wont load|won'?t load|black screen|blue screen|disconnect(ed|ing)?|timed out|server (is )?down|can'?t log ?in|cant log ?in|wont launch|won'?t launch)\b/, 6, 'describes a technical fault'],
    [/\b(lag|lagging|fps|frame ?rate|ping|rubber ?band)\b/, 4, 'describes performance trouble'],
    [/\b(mod (issue|problem|conflict)|reinstall|load order|smim|skse)\b/, 5, 'describes a mod problem']
  ]
};

const TICKET_FIELDS = [
  ['server', /(?:what\s+)?server\s+(?:is\s+this\s+(?:report|ticket)\s+for|:)?/],
  ['reported', /character\s+name\s+of\s+(?:the\s+)?reported\s+(?:player|character)/],
  ['reportedId', /character\s+id\s+of\s+(?:the\s+)?reported\s+(?:player|character)/],
  ['yourName', /(?:your|reporting)\s+character\s+name/],
  ['broken', /what\s+rules?\s+(?:were|was|has been)\s+broken/],
  ['what', /what\s+happened|describe\s+(?:the\s+)?(?:incident|issue|situation)|explain\s+(?:what|the)/],
  ['evidence', /(?:attach|link)\s*\/?\s*(?:link)?\s*evidence|evidence\s*(?:links?)?/],
  ['when', /(?:date|time)\s+(?:and\s+time\s+)?of\s+(?:the\s+)?(?:incident|event)/],
  ['category', /category/],
  ['by', /ticket\s+created\s+by/]
];

function readTicket(text) {
  const raw = String(text == null ? '' : text);
  const lines = raw.split(/\r?\n/);
  const strip = s => s.replace(/^#{1,6}\s*/, '').replace(/\*\*/g, '').replace(/^[-*]\s+/, '').trim();
  const found = {};
  const order = [];
  lines.forEach((line, ix) => {
    const bare = strip(line).replace(/[:?]\s*$/, '').trim();
    if (!bare || bare.length > 80) return;
    for (const [key, re] of TICKET_FIELDS) {
      if (found[key] !== undefined) continue;
      if (new RegExp('^' + re.source + '\\s*$', 'i').test(bare)) {
        found[key] = ix;
        order.push([key, ix]);
        return;
      }
    }
  });
  const hits = order.length;
  if (hits < 2) return { isTicket: false, fields: {}, narrative: raw, headings: [] };

  const marks = order.map(([, ix]) => ix).sort((a, b) => a - b);
  const valueAfter = ix => {
    const stop = marks.find(m => m > ix);
    return lines.slice(ix + 1, stop === undefined ? lines.length : stop).map(strip).filter(Boolean).join('\n').trim();
  };
  const fields = {};
  order.forEach(([key, ix]) => { fields[key] = valueAfter(ix); });

  const narrative = [fields.broken, fields.what].filter(Boolean).join('\n') || raw;
  return { isTicket: true, fields, narrative, headings: order.map(([k]) => k) };
}

function classify(text, ticket) {
  const t = ticket || readTicket(text);
  const q = norm(t.isTicket ? t.narrative : text);
  const words = q.split(/\s+/).filter(Boolean).length;
  const scores = {};
  const why = {};
  for (const kind of Object.keys(CUES)) {
    let total = 0;
    const fired = [];
    for (const [re, weight, describe] of CUES[kind]) {
      if (re.global) {
        const n = (q.match(re) || []).length;
        if (n) { total += Math.min(n, 3) * weight; fired.push(describe); }
      } else if (re.test(q)) {
        total += weight;
        fired.push(describe);
      }
    }
    scores[kind] = total;
    why[kind] = fired;
  }

  if (/\b(can|could|may|am|is|are|does|would|should|what|how|do) (i|we|it|that|this|my)\b/.test(q)) scores.report = Math.max(0, scores.report - 3);
  if (/^\s*(can|could|may|am|are|is|do|does|should|would|what|which|how|if)\b/.test(q)) scores.report = Math.max(0, scores.report - 5);
  if (scores.appeal >= 6) scores.report = Math.max(0, scores.report - 4);
  if (scores.staffreport >= 7) scores.report = Math.max(0, scores.report - 3);
  if (scores.bug >= 6) { scores.report = Math.max(0, scores.report - 3); scores.question = Math.max(0, scores.question - 2); }

  if (t.isTicket) {
    const cat = norm(t.fields.category || '');
    const named = !!String(t.fields.reported || t.fields.reportedId || '').trim();
    if (/staff\s*report|gamemaster|gm\s*report/.test(cat)) {
      scores.staffreport += 14;
      why.staffreport.unshift('it is a ticket filed under a staff-report category');
    } else if (/appeal|unban/.test(cat)) {
      scores.appeal += 14;
      why.appeal.unshift('it is a ticket filed under an appeal category');
    } else if (/support|question|enquir|inquir|help/.test(cat) && !named) {
      scores.question += 10;
      why.question.unshift('it is a support ticket and names no reported player');
    } else if (named || /player\s*report|report/.test(cat) || t.headings.includes('broken')) {
      scores.report += 14;
      why.report.unshift(named
        ? 'it is a report ticket naming a player and their character id'
        : 'it is a report ticket asking what rules were broken');
    }
    scores.question = Math.max(0, scores.question - 6);
  }

  const ranked = Object.keys(scores).map(k => ({ kind: k, score: scores[k], why: why[k] }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length || (words < 4 && !t.isTicket && ranked[0].score < 6)) {
    return { kind: 'unclear', score: 0, margin: 0, sure: 'low', why: [], alt: null, ranked: [], ticket: t };
  }

  const top = ranked[0];
  const second = ranked[1] || null;
  const margin = top.score - (second ? second.score : 0);
  const sure = top.score >= 8 && margin >= 4 ? 'high' : margin >= 2 ? 'fair' : 'low';
  const alt = second && margin < 4 ? second : null;
  return { kind: top.kind, score: top.score, margin, sure, why: top.why, alt, ranked, ticket: t };
}

function assess(text, server) {
  if (!norm(text).trim()) return null;
  const ticket = readTicket(text);
  const q = norm(ticket.isTicket ? ticket.narrative : text);
  const words = q.split(/\s+/).filter(Boolean).length;
  const read = classify(text, ticket);
  const kind = read.kind;
  const asking = kind !== 'report';

  const hits = [];
  for (const r of RULES) {
    if (r.on !== 'both' && r.on !== server) continue;
    let score = 0;
    const matched = [];
    for (const sig of r.signals) {
      const s = norm(sig);
      if (!q.includes(s)) continue;
      const specificity = s.split(/\s+/).length;
      score += r.weight * specificity;
      matched.push(sig);
    }
    if (score > 0) hits.push({ rule: r, score, matched });
  }
  hits.sort((a, b) => b.score - a.score || BANDS[b.rule.band].order - BANDS[a.rule.band].order);

  const canned = CANNED.filter(c => c.trigger.some(t => q.includes(norm(t))));

  const repeat = /\b(again|second time|third time|repeat|repeatedly|previous|already warned|prior offence|prior offense|history of)\b/.test(q);
  const ticketProof = ticket.isTicket && /https?:\/\/\S+/.test(String(ticket.fields.evidence || ''));
  const evidence = ticketProof || /\b(clip|screenshot|screen shot|video|recording|logs|proof|attached|footage|i have a)\b/.test(q) || /https?:\/\/\S+/.test(q);
  const consentMentioned = /\b(consent|agreed|permission|ok with it|fine with it)\b/.test(q);

  let band = 'none';
  if (hits.length && !asking) {
    const top = hits[0].rule;
    band = repeat && top.escalate ? top.escalate : top.band;
  }

  const needs = [];
  if (!asking) {
    const seen = new Set();
    hits.slice(0, 3).forEach(h => h.rule.needs.forEach(n => { if (!seen.has(n)) { seen.add(n); needs.push(n); } }));
    if (!evidence && hits.length) needs.unshift('Evidence \u2014 a clip or screenshot. A report without evidence cannot be enforced and is closed.');
  }

  const notes = [];
  const next = [];

  if (kind === 'report') {
    if (hits.length && BANDS[band].order >= BANDS.perma.order) notes.push('This band is a permanent ban. In a borderline case, consult a Senior Gamemaster before acting.');
    if (hits.some(h => ['meta', 'harass'].includes(h.rule.id))) notes.push('Judge this objectively and consult another Gamemaster before taking action.');
    if (repeat) notes.push('It reads as a repeat offence, so the band has been raised one step. Check their record before you rely on that.');
    if (hits.length && BANDS[band].order >= BANDS.d5.order) notes.push('On a temporary ban, use /note and duplicate the ban message so there is a permanent record.');
    next.push('Get the other side before you rule. One account is not the event.');
    if (!evidence) next.push('No evidence is offered. Ask for the clip or screenshot first \u2014 without it this closes unenforced.');
  }

  if (kind === 'question') {
    notes.push('Nobody is being reported here, so nothing should be actioned on the strength of it.');
    next.push('Answer what the rule says and leave it there.');
    if (!hits.length) next.push('No rule matched the wording, so say plainly that the rules do not cover it rather than inventing a line.');
  }

  if (kind === 'appeal') {
    notes.push('A ruling already stands. Do not re-rule it from scratch on this account alone.');
    next.push('Pull the original ruling and whatever evidence it rested on.');
    next.push('If another Gamemaster made it, speak to them before you touch it. Do not overturn a colleague quietly.');
    next.push('If the original had no evidence behind it, that is a reason to lift it. Dislike of the outcome is not.');
  }

  if (kind === 'staffreport') {
    notes.push('This is about a member of staff, not a player. It is not yours to rule on if you are named in it.');
    next.push('Send it to a Senior Gamemaster. Do not investigate a complaint against yourself.');
    next.push('Keep the ticket. A complaint about staff that quietly disappears is worse than the complaint.');
  }

  if (kind === 'request') {
    notes.push('Nothing here needs a ruling.');
    next.push('Either do it, route it to whoever can, or tell them plainly that it will not be done.');
  }

  if (kind === 'bug') {
    notes.push('This is a fault, not misconduct. No rule applies and nobody should be actioned.');
    next.push('Point them at the technical channel and close it.');
  }

  if (kind === 'unclear') {
    next.push('Ask for the whole account: who, what, when, where, and what evidence they hold.');
  }

  if (ticket.isTicket) {
    const said = norm(String(ticket.fields.category || '') + ' ' + String(ticket.fields.server || ''));
    const names = s => new RegExp(s, 'i').test(said);
    const looksSov = names('sovngarde|soverngarde|\\bwl\\b');
    const looksPaar = names('paarthurnax|paarthanax|\\bp1\\b');
    if (looksSov && server !== 'sovngarde') notes.push('The ticket says Sovngarde but the desk is set to Paarthurnax. The rulesets differ — switch the server above before you rely on any of this.');
    if (looksPaar && server !== 'paarthurnax') notes.push('The ticket says Paarthurnax but the desk is set to Sovngarde. The rulesets differ — switch the server above before you rely on any of this.');
    if (!String(ticket.fields.reported || '').trim() && kind === 'report') notes.push('The ticket names no reported player. Ask who this is about before anything else.');
  }
  if (consentMentioned) notes.push('Consent is mentioned. Check it was given by everyone involved and watching, before the scene, and was not withdrawn.');
  if (!hits.length && !canned.length && kind === 'report') notes.push('Nothing in the written rules matched. Read it yourself and, if it is genuinely new, the catch-all applies: staff may act on behaviour that goes against the good nature of roleplay even where no rule names it.');
  if (words < 6 && !canned.length) notes.push('There is very little to go on here. Ask for the full account before ruling.');
  if (read.alt) notes.push(`It also carries something of ${KINDS[read.alt.kind].label.toLowerCase()} \u2014 ${read.alt.why[0] || 'the wording points both ways'}. If it is both, deal with each part separately.`);
  if (read.sure === 'low' && kind !== 'unclear') notes.push('The reading is not a confident one. Check it against the words yourself before you lean on it.');

  return {
    hits: hits.slice(0, 5), canned, band, needs, notes, next, repeat, evidence, asking,
    kind, kindInfo: KINDS[kind], sure: read.sure, why: read.why, alt: read.alt,
    altInfo: read.alt ? KINDS[read.alt.kind] : null, ticket
  };
}

module.exports = { BANDS, RULES, CANNED, STALE, TERMS, KINDS, classify, readTicket, assess };
