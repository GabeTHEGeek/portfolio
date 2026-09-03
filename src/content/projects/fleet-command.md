---
title: "Fleet Command AIOS"
slug: "fleet-command"
description: "A multi-agent operating system for coordinating specialized agents around shared state, permissions, evidence, escalation, and progressive autonomy."
heroImage: "../../assets/projects/fleet-command-1.png"
screenshots:
  - "../../assets/projects/fleet-command-2.png"
  - "../../assets/projects/fleet-command-3.png"
  - "../../assets/projects/fleet-command-4.png"
tags: ["Agent orchestration", "Workflow productization", "Permissions", "Telemetry", "Progressive autonomy"]
status: "in-development"
liveUrl: "https://sidious-fleet-command.netlify.app/"
githubUrl: "https://github.com/GabeTHEGeek"
featured: true
kind: "ai"
order: 1
publishDate: 2026-09-01
---

## Overview

Built Fleet Command, a multi-agent AI operating system for running a one-person services business. Specialized agents work across sales, product, delivery, and operations while a Chief of Staff agent manages handoffs, surfaces decisions, and keeps the human operator in control of consequential actions.

## Problem

Most agent demos stop at task completion and do not model how work moves across a business. Giving AI too much autonomy creates risk around outreach, scope, claims, and delivery, while fragmented state makes multi-agent work difficult to monitor.

## Product approach

The product combines agent orchestration, persistent state, structured telemetry, human-in-the-loop approvals, deployment workflows, and a voice interface. Deterministic gates govern probabilistic AI decisions, including lead scoring, evidence verification, outreach approval, scope validation, and pre-deployment review.

## Architecture and workflow

Sidious serves as Chief of Staff, Boba Fett handles prospecting and outreach, Tarkin produces requirements, and Vader builds and deploys deliverables. An append-only event architecture records actions, state changes, interventions, runtime, model use, failures, and estimated cost. Git-based delivery, review, reporting, and Netlify deployment are part of the handoff process.

## Key lessons

The system supports an end-to-end workflow from discovery and qualification through delivery and retrospective learning. Human control, observable execution, and persistent memory are designed into the operating model rather than added after the fact.

## Stack

Claude Code · Anthropic Claude · Gemini API · MCP · Gmail · GitHub · Netlify · VoiceBox · JSONL event telemetry · HTML/CSS/JavaScript · Markdown-based state and memory
