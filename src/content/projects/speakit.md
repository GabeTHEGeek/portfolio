---
title: "Speakit"
slug: "speakit"
description: "A local-first dictation app for macOS: hold a shortcut, speak, and insert text directly where you are working using on-device speech recognition."
heroImage: "../../assets/projects/speakit-1.png"
tags: ["Local AI", "macOS", "Speech recognition"]
status: "launched"
liveUrl: "https://tryspeakit.netlify.app/"
featured: true
kind: "ai"
order: 2
publishDate: 2026-08-20
---

## Overview

Speakit is a local-first macOS dictation app I designed and built to make voice-to-text fast, private, and simple. Users hold a global shortcut, speak naturally, and Speakit transcribes directly into the active application.

## Problem

Cloud-dependent dictation introduces tradeoffs across privacy, latency, cost, and workflow interruption.

## Product approach

Speakit runs Whisper Small locally in a lightweight Tauri desktop shell. The product deliberately centers one workflow: press, speak, release, and keep working. I owned the concept, UX, architecture, AI-assisted development, local-model integration, desktop permissions, testing, and iteration.

## Key lessons

For local AI products, the model can recede into the background. The experience is defined by latency, privacy, reliability, and how naturally the capability fits an existing workflow.

## Stack

Tauri · TypeScript · HTML/CSS · Whisper Small · macOS system APIs · global hotkeys · clipboard and text injection
