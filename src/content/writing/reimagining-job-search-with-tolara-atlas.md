---
title: "Reimagining Job Search With Tolara Atlas"
slug: "reimagining-job-search-with-tolara-atlas"
description: "How I am using maps, change tracking, verified sources, and a grounded voice copilot to rethink the job search experience."
coverImage: "../../assets/article-tolara-atlas.jpg"
videoUrl: "https://youtu.be/peEsPsXCRdA"
category: "AI Products"
tags: ["AI Product", "Job Search", "Voice AI", "Maps", "Building in Public"]
draft: false
publishDate: 2026-09-29
order: 0
author: "Gabriel Pendleton"
---

Job search still feels surprisingly old.

Most platforms are built around the same interaction model they have used for years: type in a title, add a few filters, scroll through a long list, open several tabs, and try to keep track of which opportunities are actually worth pursuing.

When I started building **Tolara Atlas**, I wanted to explore a different question:

**What would job search look like if it were designed around exploration, context, and trust instead of just listings?**

Tolara Atlas is an interactive map of open Product Manager roles across the United States, built from companies' own applicant tracking systems. It currently tracks more than 1,800 roles across nearly 600 companies and more than 100 cities.

But the map is only the surface.

The bigger idea is to make job search feel more like understanding a market than querying a database.

## A map instead of a list

Atlas starts with geography.

Each company and office location becomes a point on the map. If a company is hiring in multiple cities, those opportunities appear separately. If several companies are hiring in the same area, the interface spreads them out so each stays clickable.

That changes the way you think about a search.

Instead of only asking, "Which jobs match my filters?" you can start asking broader questions:

- Where is hiring concentrated?
- Which cities have the strongest clusters of product roles?
- Which companies are hiring across multiple locations?
- Where are higher-paying opportunities appearing?

The map makes the market itself easier to understand.

## Tracking what changed

Most job boards show you what exists right now. Atlas also tracks what changed.

The nightly sync records when a role was first seen, when it was last seen, and when it closes. That history powers a change feed showing new openings and recent closures.

I think this is especially useful for an active job search. Sometimes the most important question is not, "What jobs are available?" It is, **"What appeared since yesterday?"**

A newly posted role can be more actionable than a perfect match that has already been sitting open for weeks.

## Verifiability over completeness

Another major design principle behind Atlas is trust.

The platform builds interview-prep dossiers around companies and roles, including company information, leadership, recent news, salary data, and what the role is likely focused on.

But Atlas is intentionally conservative about what it claims. Wherever possible, the role focus comes directly from the posting itself.

The rule is simple:

**A blank field is better than a confident invention.**

That matters because AI products can sound extremely convincing even when they are wrong. For job search, that is dangerous. A fabricated responsibility, salary range, or company detail can change how someone prepares for an interview or evaluates an opportunity.

Atlas is designed so useful claims can be traced back to an actual source.

## Talking to the map

The most experimental part of Atlas is the voice copilot. You can talk to it naturally:

- "Take me to New York."
- "Only show senior roles over two hundred thousand."
- "What would I actually be working on?"

The interesting part is not simply that it uses voice. The important part is that the agent is grounded in the application itself.

It can update filters, navigate the map, and retrieve information about roles, but when it describes a role, it has to use the actual posting. These jobs may have been published hours ago. They are not reliably sitting inside a model's memory.

So Atlas retrieves the source text first and answers from that. If it does not have the information, it can simply say so.

## The model is only one layer

Building Atlas reinforced something I have been thinking about across a lot of my AI work: the AI is rarely the entire product.

Behind the voice interface is a much larger system of applicant tracking system adapters, nightly synchronization, salary parsing, geocoding, company enrichment, historical state, and retrieval.

The model is just another interface into that system.

That distinction matters. Putting a chatbot on top of unreliable data does not create a good AI product. It just creates a more conversational way to access bad information.

The real value comes from the infrastructure underneath.

## What I am actually exploring

Tolara Atlas started as a job search tool, but the underlying question is broader.

AI gives us a chance to rethink the way people interact with software. For years, software forced users to adapt to interfaces built around databases, forms, menus, and lists.

Now the interface can start adapting to us.

We can ask questions instead of building perfect queries. We can explore instead of search. We can ask software what changed, what matters, and where we should look next.

But the more natural the interface becomes, the more important it is that the information underneath remains trustworthy.

That is what I am trying to get right with Tolara Atlas. Not just adding AI to job search, but reimagining what job search could feel like if we designed it from scratch today.

You can follow the project and explore the implementation on [GitHub](https://github.com/GabeTHEGeek/tolara-atlas).
