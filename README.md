# 🚦 SignalBox

SignalBox is a utility Discord bot designed to keep the Train Yard on track.

From moderation tools to scheduling and reminders, SignalBox helps manage your community with the precision of a railway signal system.

---

## ✨ Features

- Forum channel role auto-add
    - Automatically brings specific roles into thread channels
- Reminder system
    - Create and manage timed reminders
- Form channel automations
    - Whitelist Request Form
- Strike automation
    - Strike tracking and persistence
- Invite tracking
    - Tracks which invite was used when members join
- Persistent storage
    - Local JSON file storage
        - **Default**
    - MySQL database storage
        - **Optional**

---

## 💾 Persistent Storage

SignalBox supports two persistence backends:

1. **JSON files** — the default and simplest option
2. **MySQL** — optional database-backed storage

The persistence backend is selected using the `PERSISTENCE_PROVIDER` environment variable.

### JSON Storage

JSON storage is enabled by default.

```env
PERSISTENCE_PROVIDER=json
```
