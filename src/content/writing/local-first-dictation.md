---
title: Why I built a local-first dictation app instead of another cloud tool
slug: local-first-dictation
description: Privacy, latency, cost, and the product decisions behind keeping
  speech recognition on-device.
aeoSummary: Speakit is a local-first macOS dictation app that runs speech recognition on the device. Its hold-to-talk workflow prioritizes privacy, low latency, predictable cost, and minimal interruption by inserting text directly into the active application.
faq:
  - question: What is Speakit?
    answer: Speakit is a local-first macOS dictation app that lets a user hold a shortcut, speak, and insert transcribed text directly into the active application.
  - question: Why does Speakit process speech on-device?
    answer: On-device recognition improves privacy, reduces dependence on a cloud service, keeps latency predictable, and avoids usage-based transcription costs.
  - question: What is the main product principle behind Speakit?
    answer: The interface should interrupt the user as little as possible, making dictation feel immediate, dependable, and native to the operating system.
coverImage: ../../assets/media/speakit_linkedin_1200x1200.png
category: Local AI
tags:
  - Local AI
  - Product Design
  - Speakit
publishDate: 2026-08-24
order: 3
relatedProject: speakit
author: Gabriel Pendleton
---

## Local AI should feel invisible

Speakit started with a narrow interaction: hold a shortcut, speak, and insert text directly where you are already working.

## Product constraints shape the experience

Keeping speech recognition on-device changes the privacy, latency, and cost model. More importantly, it lets the capability feel like part of the operating system rather than a trip to another service.

## The interface is the workflow

For a utility like dictation, the best interface may be the one that interrupts the least. The product earns its place by being immediate and dependable.
