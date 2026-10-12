---
name: google-chat-reply
description: >-
  Decide whether a Google Chat answer is a straight space reply or a
  thread. Default is a straight reply. Use when sending or replying in
  Google Chat.
---

# Straight reply by default

Decide **thread vs straight reply** before `send_message`. **Most cases are a straight reply.**

## Default

Send in the space. Omit `thread_id`.

## Thread only when needed

Pass `thread_id` only if **one** of these is true:

- The user asked to reply in that thread
- You are continuing an existing back-and-forth in that thread (3+ messages)
- The answer is a long dump that would spam the space

A one-liner like "hi" is always a **straight reply**.