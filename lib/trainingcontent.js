// What an officer is taught before they are given a Hold, and what the Ministry
// asks of someone who wants one. The Dispatch guide is written for the person
// filling it in; the interview script is written for the officer judging them.

const DISPATCH_GUIDE = {
  lede: 'A Dispatch is how a Delegate tells the Ministry what happened in their Holds. It is the whole of the job in one paper: what you did, whom you met, what the people said, and what you think the Ministry should do about it.',
  when: [
    ['Send one at the close of every reporting period', 'A fortnight is usual. A Delegate who sends nothing has, so far as the rolls are concerned, done nothing.'],
    ['Send one at once when something will not keep', 'A death, a riot, a Jarl refusing the Ministry, a false paper bearing the Imperial seal. Do not wait for the period to close.'],
    ['Do not send one for your own errands', 'A Dispatch reports the Holds, not the Delegate. Nobody needs to know you rode to Rorikstead unless something happened there.']
  ],
  sections: [
    { h: 'Delegate, Holds and Period',
      t: 'Your name and the pair of Holds you answer for, and the span this Dispatch covers. Say who it is sent to — ordinarily the Imperial Envoy to the Holds.',
      good: 'Delegate to the Reach & Haafingar · 1st to the 15th of Hearthfire, 4E 226 · to the Imperial Envoy to the Holds' },
    { h: 'Public Notices, Declarations and Information Distributed',
      t: 'What the Ministry put before the people through you: notices posted, declarations read out, questions answered at a market or a gate. If you posted nothing, write that you posted nothing.',
      good: 'The Notice upon the Winter Levy was posted at the gate of Markarth and read aloud at the market on the 4th. Copies were left with the Steward. Some fifty heard it read.' },
    { h: 'Meetings and Communications',
      t: 'One line for each meeting: the date, the place, whom you met, and the substance of it. This is the table the Ministry reads first, so keep it plain. Name the person and their office, not "a guard".',
      good: '6 Hearthfire · Understone Keep · Steward Raerek · Pressed for the Ministry’s answer upon the silver tithe; told him it was with the Treasury and would be answered.' },
    { h: 'Public Concerns, Petitions and Reports Received',
      t: 'What subjects brought to you. Write what they said, not what you concluded. If someone laid a petition, say so and give its number; if they should have laid one and did not, say that too.',
      good: 'Three of the Reach mining families report that the wages of the ore road have not been paid since Last Seed. None would lay a petition for fear of the foreman. I have told them the Petition Box takes a paper without a name.' },
    { h: 'Publications, Rumours or Matter Requiring Lawful Review',
      t: 'What is being printed, sung or repeated that the Ministry may need to look at. Report the rumour and where you heard it. You are not deciding whether it is false or seditious — that is the Ministry’s to weigh.',
      good: 'A broadsheet without a printer’s mark is circulating in Markarth saying the Empire means to close the Cidhna mine. I have kept a copy and enclose it. I do not know who prints it.' },
    { h: 'Recommended Routing',
      t: 'What you think should happen: Publish, Clarify, Monitor, Internal Inquiry or Refer. A recommendation is not an order and the Ministry may set it aside, but a Dispatch that recommends nothing makes the Envoy do your thinking for you.',
      good: 'Clarify — a short notice saying the Cidhna mine is not to be closed would end the rumour faster than anything else.' }
  ],
  rules: [
    ['Write what you saw, not what you decided', 'Say "the Steward said the tithe was already paid", not "the Steward lied". If you believe he lied, say why you believe it and let the Ministry weigh it.'],
    ['Name people properly', 'A name and an office. "A guard" is of no use to anyone reading this a month from now.'],
    ['Keep the dates in the Imperial style', 'The 6th of Hearthfire, 4E 226. Not 6/9/226.'],
    ['Say plainly when nothing happened', 'An empty section is a hole. "Nothing was received in this period" is a report; a blank is a question.'],
    ['Never promise what you cannot give', 'If you told a subject the Ministry would do something, write down that you told them, so the Ministry knows what it now owes.'],
    ['Report what went badly', 'A Dispatch that says everything went well every fortnight stops being read. The Envoy needs the refusals and the closed doors more than the courtesies.']
  ],
  limits: 'A Delegate is a civil-information liaison. You do not command a Hold’s authorities, investigate a crime, sit in judgment, or bind a Jarl to anything. Where a matter passes beyond that, your Dispatch is how it reaches someone who may act — which is why it matters that you send one.'
};

// Kept from the applicant. Officers who may appoint see it; nobody else does.
const INTERVIEW = [
  { h: 'Opening',
    qs: [
      ['Which two Holds would you want, and what do you already know about the court there?', 'Whether they have read anything about the Hold, or picked one that sounded good.'],
      ['Tell me about a character you have played who had to talk their way out of something rather than fight.', 'Delegates are talkers. If every story is a fight, this is the wrong office for them.']
    ] },
  { h: 'Do they understand the office',
    qs: [
      ['A Jarl asks you to settle a dispute between two of his thanes. What do you do?', 'Good: sees it is the Jarl’s own court, offers to witness an Accord if both want one, decides nothing. Bad: starts ruling on who is right.'],
      ['What can you not do as a Delegate?', 'The best question here. Someone who names their own limits unprompted is safe to appoint. Someone who only lists powers is a problem waiting to happen.'],
      ['Something serious happens in your Hold. Who do you tell, and how?', 'Wanted: a Dispatch to the Imperial Envoy, promptly, in writing. Not "I handle it".']
    ] },
  { h: 'Scenarios',
    qs: [
      ['The Jarl’s Steward refuses to see you and says the Empire has no business in this Hold. What now?', 'Polite, persistent, tries the court another way, reports the refusal upward. Watch for anyone who reaches for a threat.'],
      ['You witness an Accord between two merchants. A week later one says you promised the Ministry would enforce it. You did not. What do you do?', 'Whether they know witnessing is not enforcing — and whether they go back to the paper they filed rather than arguing from memory.'],
      ['A subject tells you a Hold guard is taking bribes and wants it fixed tonight.', 'Good: takes it down, is honest that they cannot act on it themselves, files it so it reaches someone who can. Bad: promises what they cannot deliver, or brushes the person off.'],
      ['At court, the Jarl insults the Empire in front of everyone. How do you answer in the moment?', 'No single right answer. You want composure, and an instinct to report rather than retaliate.'],
      ['A player accuses you out of character of abusing the position. Walk me through how you handle it.', 'Tells you more about whether they will cause you trouble than any in-character question will.']
    ] },
  { h: 'Reliability',
    qs: [
      ['How often are you realistically on, and at what times?', 'Ask for honest numbers. A Hold with an absent Delegate is worse than a Hold with none.'],
      ['The office means filing paperwork after the roleplay — Dispatches, Returns of the Court. Will you actually do that, or does it sound like a chore?', 'Let them say no. Better now than after they hold the title.'],
      ['Have you held an officer position on a server before? How did it end?', 'Not disqualifying if it ended badly. How they describe it is the tell.']
    ] },
  { h: 'Closing',
    qs: [
      ['What do you want from this that you could not get as an ordinary character?', 'Stories and access to the court is a good answer. Authority over other players is what you are screening for.']
    ] }
];

const RED_FLAGS = [
  'Talks about what they would make people do.',
  'Cannot name a single limit upon the office.',
  'Vague about when they are on — "whenever I can".',
  'Frames every scenario as a confrontation they win.',
  'Asks about permissions before asking about the Holds.'
];

module.exports = { DISPATCH_GUIDE, INTERVIEW, RED_FLAGS };
