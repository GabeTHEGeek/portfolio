---
title: "I’m starting to think the agent and the model should be two different things"
slug: "fleet-command-organization-not-models"
description: "An experiment with multi-agent systems changed how I think about roles, models, cost, and what should stay constant when the intelligence underneath an agent changes."
coverImage: "../../assets/article-fleet-command-organization.png"
category: "AI Agents"
order: 1
tags: ["AI Product", "Agents", "Model Routing", "Building in Public"]
publishDate: 2026-09-03
readTime: "6 min read"
author: "Gabriel Pendleton"
---

I’ve been experimenting with a multi-agent system lately and ran into an architecture question that I originally thought was pretty simple.

If I have an engineering agent, what model is it?

Claude?

Gemini?

OpenAI?

At first I just picked a model and moved on.

That works.

But the more I built around it, the more I started to think I was combining two things that probably should be separate.

The agent is responsible for a job.

The model is one of the things it can use to get that job done.

That sounds like a small distinction, but I think it changes quite a bit about how these systems might eventually work.

## The experiment

The system I’ve been building has a few different agents with specific responsibilities.

There is one that coordinates work, one focused on sales, another on product, and another on engineering.

I gave them names because it made the system easier for me to reason about, but the names really aren’t important.

What matters is that each one has a responsibility.

The engineering agent should understand the engineering work it owns, what it has permission to do, what other work it depends on, what has already happened, and what it is expected to return.

Originally I was thinking about that agent almost like this:

```text
Engineering Agent = Claude
```

But that started feeling wrong.

Claude might be the best model for one part of the job today.

That does not mean Claude should define what the agent is.

If I swap Claude for another model tomorrow, I haven't suddenly created a new engineering role.

I just changed what intelligence that role is using to complete the work.

I think that distinction becomes more important the more persistent these agents become.

## Roles may be more durable than models

Models are changing incredibly fast.

A model I prefer this month might not be the model I prefer six months from now.

Some models are better at reasoning. Others are cheaper. Some are faster. Some can run locally. Some have better tool support.

There probably isn't going to be one model that makes sense for every piece of work.

So I’ve started thinking about the system more like this:

```text
Organization

    Product
    Engineering
    Sales
    Operations

        ↓

Execution

    Claude
    Gemini
    OpenAI
    Local models
    Deterministic code
```

The top part should probably remain relatively stable.

The bottom part can change constantly.

That feels closer to how I already think about software teams.

An engineer does not become a different engineer because they switch IDEs, languages, or tools.

The responsibility is more durable than the tool being used.

Maybe agents eventually work the same way.

## It also changes how I think about cost

This came up pretty quickly while I was experimenting.

Using the most capable model for every step is easy.

It is also probably wasteful.

Some work actually requires a strong model.

Understanding an ambiguous objective, making a difficult decision, changing a plan after something unexpected happens, or reasoning through a complex technical problem might justify the cost.

But a lot of work inside an agent workflow is much less interesting.

Extract this data.

Change this format.

Run this check.

Classify these records.

Apply this known transformation.

Those things may not need the same level of intelligence.

I started wondering whether the better system is one that asks:

What is the cheapest thing that can reliably complete this part of the work?

Sometimes that answer might even be normal code.

Then maybe a small model.

Then something more capable if the earlier attempt fails.

Something like:

```text
Task

Can code do it?
    ↓ no

Can a cheaper model do it?
    ↓ no / failed

Use a stronger model
    ↓

Verify the result
```

I’m still experimenting with this, so I don't know how far the idea goes.

But I like the idea that the role owns the outcome while the system can change the intelligence underneath it.

## Engineering made this easier to see

Engineering is where this clicked for me because there are already tools that make the separation easier to imagine.

Something like OpenCode can act as an execution environment.

An engineering agent could receive an approved piece of work and use OpenCode to complete it.

Maybe one model handles the difficult reasoning.

Maybe another handles straightforward implementation.

Tests or deterministic tooling verify the result.

Then the outcome goes back into the larger system.

The important part for me is that OpenCode does not need to become the organization.

Neither does Claude.

Neither does any other model provider.

They are pieces of the execution environment.

The system above them still needs to understand what the work is, who owns it, what happened, and what should happen next.

## Then I started thinking beyond engineering

Once I saw it there, I started noticing the same thing in other roles.

A sales agent probably does not need its best reasoning model to research every company.

Maybe cheap models collect information.

Rules eliminate obvious bad fits.

A stronger model gets involved when there is actually a difficult decision to make.

A product agent might use one model to organize customer research and something stronger when there is real ambiguity around scope or strategy.

Different work probably requires different levels of intelligence.

That seems obvious when I write it out.

But most of the agent systems I initially built were still basically:

```text
Agent → Model
```

Now I think it might be closer to:

```text
Agent → Work → Appropriate intelligence
```

That is a different abstraction.

## I’m not sure “model routing” is the interesting part

You could describe all of this as model routing, and technically that is part of it.

But I think the more interesting question is what remains constant while all of those models change.

If these agents become persistent and actually start doing meaningful work, something still has to know:

who owns the work,

what has already happened,

what the objective is,

what the agent is allowed to do,

what evidence was produced,

whether the result was good enough,

and what should happen next.

That part feels more durable to me than whichever model happens to be best this month.

And it has made me wonder whether we are sometimes thinking about agent architecture from the wrong direction.

We start with intelligence and build outward.

Maybe we should start with the organization and plug intelligence into it.

I don't know yet.

That is part of what I’m trying to figure out with this experiment.

But I’m becoming less interested in which model an agent *is* and much more interested in what the agent is responsible for, what it knows, what authority it has, and whether the system can swap the intelligence underneath it without changing the organization itself.

If that turns out to be right, models may end up looking a lot more like infrastructure than identity.
