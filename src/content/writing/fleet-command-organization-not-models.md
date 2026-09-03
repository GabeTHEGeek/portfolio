---
title: "Fleet Command Should Own the Organization, Not the Models"
slug: "fleet-command-organization-not-models"
description: "Why Fleet Command should separate agent roles from model providers—and own the state, permissions, evidence, and routing that make an AI organization work."
coverImage: "../../assets/article-fleet-command.png"
category: "AI Agents"
tags: ["AI Product", "Agents", "Model Routing", "Building in Public"]
publishDate: 2026-09-03
readTime: "6 min read"
author: "Gabriel Pendleton"
---

A lot of AI products are being designed around the wrong abstraction.

They start with the model.

Claude does this. Gemini does that. DeepSeek is cheaper for this workload. OpenAI is better for that one.

That makes sense when you are building a single assistant.

It starts to break when you are building an organization.

That is the direction I have been exploring with Fleet Command.

Fleet Command is a multi-agent operating system. Different agents occupy different roles across sales, product, engineering, and marketing. The important part is not that every agent has a name or a personality. The important part is that they have responsibilities, permissions, shared state, dependencies, and work that has to move between them.

At first, it is easy to tie each agent directly to a model.

Vader is Claude.

Tarkin is Claude.

Boba Fett is Claude.

Sidious is Claude.

That works for a prototype.

It is probably the wrong architecture for the long term.

## The agent and the model are not the same thing

The more I build this, the more I think an agent should represent a **role**, not a specific model.

Vader is the engineering agent because of what Vader is responsible for.

It should not matter whether Vader uses Claude, Gemini, DeepSeek, OpenAI, or a local model to complete a particular step.

The model is compute.

The agent is organizational responsibility.

That distinction matters.

A senior engineer does not become a different employee because they switch from one IDE to another.

In the same way, an AI engineering agent should not become a different agent just because the underlying model changes.

That leads to a cleaner architecture:

```text
Fleet Command
    |
    +-- Sidious
    +-- Boba Fett
    +-- Tarkin
    +-- Vader
    |
    +-- State
    +-- Memory
    +-- Permissions
    +-- Artifacts
    |
    +-- Execution Layer
          |
          +-- Claude
          +-- Gemini
          +-- DeepSeek
          +-- OpenAI
          +-- Grok
          +-- Local models
          +-- OpenCode
```

Fleet Command owns the organization.

The execution layer provides the labor.

## Why this matters for cost

One of the easiest mistakes in agent systems is to use an expensive frontier model for everything.

That means you end up paying frontier-model prices for work that does not require frontier-model reasoning.

A strong model may be useful for:

- breaking down a complex objective
- resolving ambiguity
- making a product decision
- handling an exception
- changing the plan when something fails

But a lot of execution work is simpler:

- extracting structured data
- formatting output
- clicking through a workflow
- applying a known transformation
- classifying a document
- running a repetitive code change

Those tasks may be handled by smaller models, local models, or deterministic code.

So the cost advantage of a multi-agent system is not simply that it has multiple agents.

It comes from being able to assign the **cheapest capable intelligence to each step**.

That is a much more interesting optimization problem.

## OpenCode fits into this as infrastructure

This is also why something like OpenCode is interesting to me.

I would not move Fleet Command into OpenCode.

I would use OpenCode as one possible execution backend.

For example, Tarkin might produce an approved engineering specification.

Fleet Command then sends that work to Vader.

Vader could invoke OpenCode.

OpenCode could use Claude for a hard architectural decision, a cheaper model for straightforward code changes, and another model or deterministic process for verification.

The results would come back into Fleet Command.

Fleet Command would still own the project state, permissions, evidence, artifacts, and what happens next.

Something like:

```text
Tarkin
   |
   | approved specification
   v
Fleet Command
   |
   v
Vader
   |
   v
OpenCode
   |
   +-- Claude for reasoning
   +-- cheaper model for execution
   +-- tests / verification
   |
   v
Fleet Command
   |
   +-- update state
   +-- store artifacts
   +-- escalate if needed
```

That feels much more durable than making the entire product dependent on one model provider.

## Model routing becomes part of the operating system

Once you separate the role from the model, another possibility opens up.

The system can choose models dynamically.

Not:

> Vader uses Claude.

But:

> This Vader task requires this level of intelligence.

A future routing decision might consider:

- complexity
- expected cost
- latency
- privacy requirements
- context size
- reliability
- tool support
- whether the task can run locally
- whether a previous model already failed

A cheap model could attempt the task first.

If it succeeds and passes verification, the system moves on.

If it fails, Fleet Command escalates to a more capable model.

That could look like:

```text
Task
 |
 v
Can deterministic code do it?
 |
 +-- yes -> execute
 |
 no
 |
 v
Can a cheap model reliably do it?
 |
 +-- yes -> execute + verify
 |
 no / failed
 |
 v
Use frontier model
 |
 v
Verify
```

That architecture starts to look less like a chatbot and more like compute scheduling.

And that is probably where autonomous organizations eventually need to go.

## The same idea applies beyond engineering

Vader is just the easiest example.

Boba Fett might use one model to research hundreds of companies cheaply, deterministic rules to score them, and a stronger model only when deciding how to approach a high-value account.

Tarkin might use a smaller model to organize research, then a stronger one when defining product scope.

Sidious may use the most capable model more frequently because orchestration, reprioritization, and exception handling require more reasoning.

The organization remains stable.

The intelligence underneath it can change.

## The operating layer is the product

This is becoming one of the core ideas behind Fleet Command for me.

The long-term value is not owning the best model.

That layer is going to keep changing.

The durable layer may be the system that understands:

- who is responsible for what
- what work is currently happening
- what evidence exists
- what permissions an agent has
- what model should perform the next step
- when something should escalate
- when work is complete

That is the operating system.

And if AI agents eventually become persistent workers inside organizations, the winning architecture may not be one model powering everything.

It may be an organizational layer coordinating many different forms of intelligence underneath it.

**Fleet Command should own the organization.**

**The models should be replaceable.**

