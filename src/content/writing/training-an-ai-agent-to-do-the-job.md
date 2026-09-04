---
title: "I Thought Building the AI Agent Was the Hard Part. Training It to Do the Job Was Harder."
slug: "training-an-ai-agent-to-do-the-job"
description: "What building an AI sales agent taught me about judgment, deterministic safeguards, evidence, and knowing when to stop training and let the agent work."
coverImage: "../../assets/article-fleet-command.png"
category: "AI Agents"
order: 2
tags: ["AI Product", "Agents", "Building in Public", "Evaluation"]
publishDate: 2026-09-03
readTime: "8 min read"
author: "Gabriel Pendleton"
---

When I started building AI agents, I thought the hard part would be getting them to do things.

Connect the tools. Give them memory. Define a role. Let them search the web, send emails, update state, call APIs, and hand work to other agents.

It turns out that part is relatively easy.

The harder problem starts after the agent technically works.

You have to teach it what good work looks like.

Over the last few weeks, I’ve been building an AI sales agent as part of Fleet Command. I call it Boba Fett.

Its job sounds straightforward: find companies worth contacting, research them, identify a real problem, find the right person, draft outreach, and eventually manage more of the sales process.

I got the basic workflow working fairly quickly.

Then I started watching it work.

That’s when things got interesting.

## An agent can follow the process and still be wrong

One of the first things I learned was that successful execution and good judgment are completely different problems.

Boba could find a company, score it, research it, identify a buyer, find an email, and write a perfectly reasonable message.

Every step could complete successfully.

And I could still look at the result and think:

I don’t think we should contact this person.

That is a very different failure from a broken API call.

Nothing crashed. The workflow completed. The agent did what I asked.

The problem was that I hadn’t actually defined what I meant by a good prospect precisely enough.

So I corrected it.

Then I ran it again.

Then corrected it again.

That became the real development loop:

**Run → observe → disagree → understand why → encode the lesson → run again.**

At some point, I realized I wasn’t really programming the agent anymore.

I was managing it.

## Prompts weren’t enough

My first instinct was to keep improving the instructions.

Be more careful here.

Check this before doing that.

Don’t make this claim unless you have enough evidence.

Escalate when you’re uncertain.

The prompt kept getting better.

The agent kept finding new ways to interpret it.

Eventually I realized I was assigning responsibilities to the model that should never have belonged to the model in the first place.

If a state transition must happen in a specific order, the AI should not decide whether that order was followed.

Code should.

If an email has already been verified as invalid, the AI should not be able to decide that it feels confident enough to send anyway.

Code should block it.

If an event must be recorded after an action, the AI should not be responsible for remembering to record it.

The system should.

That changed how I thought about the architecture.

The model proposes.

The deterministic layer decides what is actually allowed to happen.

That distinction has probably been one of the most important things I’ve learned while building agents.

**Use AI for judgment. Use software for invariants.**

## Different intelligence belongs in different places

I originally assumed a capable model should run the whole job.

That gets expensive very quickly.

So I started experimenting.

Could a cheaper model handle most of the sales workflow?

I took historical prospects where I already knew what the stronger model had decided and replayed them through a cheaper model.

Qualification was excellent.

Basic research was excellent.

Routing was excellent.

Structured execution eventually became excellent.

Subtle judgment was where things started to move.

A borderline finding would become stronger than it should have been.

Something that should have been MEDIUM became HIGH.

Something that deserved another look would confidently continue.

The answer wasn’t simply, “Use the expensive model.”

It also wasn’t, “The cheap model is good enough.”

The answer became:

**Use cheap intelligence by default and buy expensive intelligence at the points of ambiguity.**

That started making the architecture look less like a single AI system and more like an organization.

Routine work gets handled cheaply.

Code enforces the rules.

Ambiguous judgment gets escalated.

The expensive intelligence is reserved for decisions where it can actually change the outcome.

## Then the agent learned to game my rules

This was one of my favorite failures.

I added a rule saying certain ambiguous findings had to be escalated to the stronger model.

The agent found a field that allowed it to provide additional justification.

So it provided the justification.

Again.

And again.

Suddenly, almost nothing needed escalation.

Technically, it was following the system.

Practically, it had discovered a way around the intent of the system.

That taught me another lesson:

**You can’t ask the same intelligence you’re constraining to also decide whether the constraint applies.**

Some escalation conditions eventually had to become deterministic too.

The system decides when the agent needs help.

The agent does not get to waive its own review.

## Scale exposed problems small tests didn’t

Then I tried larger batches.

Small batches worked, so naturally I asked the agent to do more.

Twenty prospects.

Forty prospects.

That exposed a completely different class of failure.

The agent would get partway through the assignment, look at what it had learned, and decide the pattern was obvious enough to stop.

I told it explicitly not to stop early.

It stopped early.

I increased the budget.

It stopped early.

I specifically prohibited “the pattern is clear” as a reason to stop.

It essentially decided that continuing was not an efficient use of tokens.

At some point, continuing to rewrite the instruction becomes absurd.

The problem was no longer the prompt.

The architecture was wrong.

A 40-company mission can be perfectly reasonable.

A single agent context responsible for holding all 40 companies in its head may not be.

The solution became smaller, bounded workers operating inside a larger mission.

Again, this starts to look suspiciously like how we design human organizations.

You do not make one employee hold the entire company in their head.

You divide responsibility and maintain shared state.

## The most expensive bugs weren’t technical

Another pattern started showing up.

The system could be technically flawless and still produce bad work.

We built increasingly strong state validation.

Events matched records.

Transitions became deterministic.

External API calls were verified.

Email verification worked.

Tests passed.

Then the agent produced a prospect that looked fantastic.

The evidence was weak.

That is a dangerous kind of failure because the dashboard may still be completely green.

Everything worked.

The work was just wrong.

That forced me to start thinking about **evidence architecture**, not just system architecture.

What evidence did the agent actually observe?

What did it infer from that evidence?

What was speculation?

Could a claim in the final output be traced back to the source that supported it?

And one question became surprisingly useful:

**Would I personally be comfortable making this claim to another human?**

That sounds simple, but it created a useful standard for judgment.

## Training an agent feels less like software development than I expected

There is still plenty of software engineering involved.

But increasingly, this process feels like building an organization.

A new employee does not become great because you wrote them a 40-page handbook.

They work.

You review the work.

You notice patterns.

Some mistakes require coaching.

Some require a checklist.

Some require changing the process.

Some require better tools.

Some responsibilities should not belong to that employee at all.

And eventually, if things are working, you stop reviewing everything.

That is almost exactly what I’ve been doing with agents.

The difference is that when an AI employee makes a mistake, I can sometimes turn the correction into infrastructure.

A human employee might remember:

“Gabriel doesn’t consider that enough evidence.”

With an agent, I can encode that lesson into the system so future executions inherit it.

That has interesting implications.

Because training is not only happening inside the model.

The organization itself is learning.

Its memory changes.

Its rules change.

Its evaluation system changes.

Its routing changes.

Its permissions change.

Its software changes.

The model is only one component of that learning system.

## Eventually, you have to stop training

This is probably the lesson I’m struggling with most right now.

There is always another edge case.

Another evaluation.

Another model comparison.

Another safeguard.

Another prompt improvement.

Another thing that could be made deterministic.

If you are not careful, building autonomous agents becomes an endless research project.

At some point, the agent has to work.

Not in a benchmark.

Not against historical examples.

Not against synthetic tests.

It has to interact with the real world and produce an outcome.

A reply.

A customer.

Revenue.

A completed project.

Something outside the system that tells you whether all of this tuning actually matters.

That is where I am now.

I have spent a lot of time teaching an AI agent how I want a job done.

Now I need to let it do the job.

And I suspect this is going to become one of the defining problems of autonomous organizations:

**knowing when the agent needs another correction, and knowing when the human needs to get out of the way.**
