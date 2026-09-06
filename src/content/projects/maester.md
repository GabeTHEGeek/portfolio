---
title: "Maester"
slug: "maester"
description: "A grounded multi-source hiring workflow using a two-stage LLM pipeline designed to reduce fabrication and improve matching."
heroImage: "../../assets/projects/maester-1.png"
tags: ["Hiring workflows", "Grounded AI", "LLM pipelines"]
status: "launched"
githubUrl: "https://github.com/GabeTHEGeek/maester"
featured: true
kind: "ai"
order: 3
publishDate: 2026-08-10
---

## Overview

Maester is an AI-powered hiring panel that searches live job listings, scores them against a candidate's resume, and generates tailored, ATS-optimized applications. Five distinct reviewer personas evaluate each role through the lenses of hiring, product, engineering, design, and recruiting—and surface disagreement instead of collapsing into generic praise.

## Problem

Candidates are told to tailor every application, but job boards provide little help deciding which listings deserve that time. Noisy or stale postings waste effort, while ungrounded AI-generated applications can fabricate experience and undermine credibility.

## Product approach

Live search spans Remotive, Greenhouse, Ashby, Gem, and Lever. Claude Haiku performs fast triage; Claude Sonnet runs deeper multi-agent evaluation. The tailoring engine produces ATS-safe resume and cover-letter PDFs with code-enforced rules against inventing employers, dates, experience, or metrics.

## Key lessons

The working product combines live data from five job-board sources, multi-model cost optimization, local CSV tracking, opt-in email, and explicit fabrication guardrails.

## Stack

Streamlit · Anthropic API · Remotive · Greenhouse · Ashby · Gem · Lever · ReportLab · Python
