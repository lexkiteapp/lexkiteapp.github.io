---
title: "FSRS Algorithm Explained: Smarter Flashcard Scheduling"
description: "The FSRS algorithm explained in plain English: difficulty, stability and retrievability, how it beats SM-2, and how to choose a desired retention of 80–95%."
slug: fsrs-algorithm-explained
lang: en
translationKey: fsrs-la-gi
category: phuong-phap
tags: [fsrs, flashcards, anki, spaced-repetition]
keyword: "fsrs algorithm"
cover: review
coverAlt: "Lexkite flashcard review screen with the word \"pollution\", its phonetics and a Flip button, scheduled by FSRS"
publishAt: 2026-10-16T15:17:00+07:00
factChecked: 2026-10-15
qualityScore: 94
author: Lexkite
status: ready
---
The FSRS algorithm (Free Spaced Repetition Scheduler) is an open-source method that decides when you should see each flashcard again. It models every card with three numbers, difficulty, stability and retrievability, and schedules the next review for the moment your chance of remembering drops to a target you choose, usually around 90%. Compared with the older SM-2 algorithm, it typically asks for fewer reviews to keep the same amount in memory, because it learns from your own review history instead of applying one fixed formula to everyone.

That is the one-paragraph answer. Below, each part is unpacked without equations, so you can decide how to set it up and what to expect from your daily queue.

## What is the FSRS algorithm?

FSRS is a scheduler, not a study method. The study method is spaced repetition: reviewing material at growing intervals, just before you would forget it. (If that idea is new to you, start with [spaced repetition for language learning](/en/blog/spaced-repetition-for-language-learning/).) A scheduler is the piece of software that turns the idea into dates: "review *mitigate* tomorrow, *pollution* in 12 days, *come up with* in 47 days".

FSRS was developed in the open by Jarrett Ye and contributors in the open-spaced-repetition community, and it has been built into Anki since version 23.10. Because it is open source, other apps can use it too; Lexkite uses it for all flashcard reviews.

The key shift is that FSRS treats memory as something it can measure. Every time you rate a card, you give the algorithm a data point. Over hundreds of reviews it estimates how quickly *you* forget *each* card, and adjusts.

## The three numbers behind every card

Think of each card as having a small memory profile. FSRS tracks three values, often called the DSR model.

### Difficulty: how hard this card is for you

Difficulty describes how much a card resists being learned. A word like *environment* may be easy for a Spanish speaker (it resembles *ambiente*) but harder for someone whose language has a completely different root. A phrasal verb like *put up with* is often hard for everyone, because the meaning cannot be guessed from the parts. In FSRS, difficulty sits on a scale from 1 to 10. Pressing "Again" or "Hard" raises it, "Easy" lowers it, and "Good" leaves it roughly where it is, apart from a slow drift back towards a default value, so a card is never stuck as "hard" forever. Higher difficulty means stability grows less after each success, so the interval stretches more slowly.

### Stability: how long the memory lasts

Stability is roughly the number of days it takes for your chance of recall to fall to 90%. A brand-new word might have a stability of one or two days. After several successful reviews, the same word might reach a stability of months. Stability grows most when you recall a card successfully at a moment when it was already somewhat faded; recalling something you saw an hour ago adds very little. This is the mathematical version of the classic advice "review just before you forget".

### Retrievability: your chance of remembering right now

Retrievability is the probability that you could recall the card if you were tested at this exact moment. It starts near 100% right after a review and slowly declines. FSRS schedules the next review for the day retrievability is predicted to hit your target. That is why two cards learned on the same day can come back weeks apart: they have different stability.

One detail separates FSRS from older schedulers: its forgetting curve is a power curve rather than a simple exponential. Recall drops quickly at first and then flattens, which matches how memory behaves when you average over many words. You never need to see the formula, but it explains why a card with 30 days of stability is not "almost gone" on day 31; it has only dipped to around your target.

| Value | Plain meaning | Changes when… |
|---|---|---|
| Difficulty | How stubborn the card is | You rate it Again/Hard (up) or Good/Easy (down) |
| Stability | How many days the memory lasts | You recall it successfully, especially after a gap |
| Retrievability | Chance of recall today | Time passes (down) or you review it (resets high) |

## FSRS vs SM-2: what actually changed

SM-2 dates from the SuperMemo software of the late 1980s and powered Anki for many years. It gives each card an "ease" multiplier: after a correct answer, the interval is multiplied by that ease; after a failure, ease drops and the card restarts. It is simple and it works, but it has known weaknesses.

- **One formula for everyone.** SM-2 uses the same starting values for every user. Someone who forgets quickly and someone with excellent recall get the same early intervals.
- **"Ease hell".** Every lapse lowers a card's ease, and the default system rarely raises it again. Hard cards can get stuck on very short intervals and flood the queue long after you have actually learned them.
- **Late reviews are handled poorly.** If you come back after a week away, SM-2 does not fully account for the fact that you still remembered a card after a much longer gap than planned.

FSRS addresses each SM-2 weakness: its parameters can be fitted to your own history, difficulty can recover, and the actual time since the last review feeds directly into the next calculation. In practice, users typically report a lighter daily queue for the same retention, though the exact gain depends on the learner and the material. It is not magic; it is simply a better estimate of a real forgetting curve.

## How FSRS learns your memory (parameters and the optimizer)

Behind the three numbers sit a set of model parameters, a list of around twenty weights in recent versions such as FSRS-5, that control things like how much stability a first "Good" gives and how sharply a lapse cuts it. Default values were fitted on review logs from a large number of learners, so FSRS works well from your first card.

Apps can then fit those weights to *your* history. In Anki this is the "Optimize" button in the deck options; it needs a reasonable number of reviews before the result is more reliable than the defaults, so new users are usually advised to wait and optimize later. Lexkite uses the published default weights, which is why there is nothing to tune beyond the retention target described below.

![The Lexkite method page describing the daily study loop: due reviews, new words, practice, reading or listening, and speaking](media:method "The Lexkite method page shows where FSRS reviews fit into a 30-minute daily loop")

## Choosing your desired retention (80–95%)

The one setting most learners should understand is **desired retention**: the probability of remembering you want on the day a card comes due. It is a trade-off, not a quality dial.

| Desired retention | What it feels like | Good for |
|---|---|---|
| 80–85% | Fewer reviews, more forgotten cards | Busy periods, large casual decks |
| 90% | Balanced workload and recall | Most learners, most of the time |
| 93–95% | Many more reviews, very few lapses | The final weeks before an exam |

Raising the target from 90% to 95% sounds like a small change, but intervals shrink sharply near the top, so the workload grows much faster than the retention. Going below 80% saves time but means you will fail a large share of reviews, which is discouraging and can push difficulty up.

A sensible plan for IELTS, TOEIC or TOEFL candidates: keep 90% during normal study, then raise it to around 93–95% in the last three or four weeks before the test for your core exam vocabulary.

## Using FSRS in Lexkite

Lexkite schedules every flashcard with FSRS automatically; there is nothing to install or configure to get started. New and forgotten cards first go through two short learning steps (about 1 minute, then about 10 minutes) before FSRS starts scheduling them in days, and cards reviewed under an older SM-2 schedule are converted to an estimated stability and difficulty rather than reset.

1. Save words from the dictionary or a word set, then open [Review](/#/review) each day. Recall the word before you flip the card, then rate yourself honestly.
![Lexkite Today page showing how many flashcards are due, daily quests and a Start review button](media:home "Due cards appear first on the Today page, so FSRS reviews happen before any new words")

2. To change the target, open [Settings](/#/settings) and move the memory-target slider. Lexkite allows 80% to 95% and starts at 90%.
3. The [Lexkite method](/#/method) page shows how many cards are due and how reviews fit into a short daily session.

![Lexkite Progress page with level, XP, streak, a six-month study heatmap and a forecast of upcoming due cards](media:stats "The due-card forecast shows how FSRS spreads your upcoming reviews across the coming days")

{{cta: /#/review | Start your first FSRS review session}}

{{youtube: | Video idea: difficulty, stability and retrievability drawn on one forgetting curve, step by step}}

## How to get the best results from FSRS

The algorithm is only as good as the ratings you feed it. A few habits make a large difference.

- **Rate honestly.** If you needed a hint or took a long pause, choose "Hard" or "Again". Generous ratings make FSRS think you know a card better than you do, and it will schedule the next review too late.
- **Try to recall before flipping.** The value of a review comes from the effort of retrieval. Glancing at the answer and pressing "Good" teaches the algorithm nothing useful. This principle is covered in depth in [active recall for vocabulary](/en/blog/active-recall-for-vocabulary/).
- **Make cards that test one thing.** A card asking for the meaning, the collocation and the pronunciation at once produces mixed ratings. Split it, or use a phrase-based card as described in [how to learn IELTS vocabulary](/en/blog/how-to-learn-ielts-vocabulary/).
- **Do a little every day.** FSRS copes well with gaps, but a daily habit keeps the queue small. Ten minutes a day is better than an hour on Sunday.
- **Do not add hundreds of cards at once.** Each new card creates future reviews. Large word lists such as the [Academic Word List](/en/blog/academic-word-list/) or the [topic vocabulary lists](/en/vocabulary/) are best added one sublist or topic at a time.

## Common misconceptions about FSRS

**"FSRS means I will never forget."** No scheduler can promise that. At 90% desired retention you should expect to miss about one due card in ten, and that is normal.

**"A lot of due cards means the algorithm is broken."** Large queues usually follow a burst of new cards a week or two earlier, or a few missed days. Pause new words until the queue shrinks.

**"I should press Easy to speed things up."** Pressing Easy on cards you are unsure about only delays the next review past the point where you would remember, so you end up relearning.

**"FSRS replaces using the words."** It keeps words accessible. Turning them into fluent production still requires reading, writing and speaking with them.

## Frequently asked questions

### Is FSRS free to use?

Yes. FSRS is open source, so any app can implement it. Anki includes it from version 23.10, and Lexkite uses it for flashcard scheduling at no cost.

### What does a desired retention of 90% mean?

It means FSRS schedules each card for the day your predicted chance of recalling it falls to 90%. Across many reviews, you should remember about nine due cards in ten.

### Will I lose my progress if I switch from SM-2 to FSRS in Anki?

Your review history stays in your collection, and FSRS can use that history to estimate the memory state of each card. Back up your collection before changing scheduler settings, as you would before any major change.

### Why do I sometimes get a very large number of reviews in one day?

Usually because many new cards were learned around the same time, or because you missed some days. Keep reviewing daily, add fewer new cards for a while, and the load will spread out again.
