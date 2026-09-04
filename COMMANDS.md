# SignalBox — Command Reference

SignalBox supports two interfaces for most commands:

- **Slash commands** — `/command`, registered via Discord's application command API
- **Prefix (text) commands** — `!command`, triggered by messages starting with `!`

Not every command is available in both forms — see the "Interfaces" column below.

| Command                                   | Interfaces   | Required Role               |
| ----------------------------------------- | ------------ | --------------------------- |
| [`ping`](#ping)                           | Slash only   | none                        |
| [`server`](#server)                       | Slash + Text | none                        |
| [`user`](#user)                           | Slash + Text | `BASIC_COMMANDS_ROLE_ID`    |
| [`remindme`](#remindme)                   | Slash + Text | `BASIC_COMMANDS_ROLE_ID`    |
| [`reminders`](#reminders)                 | Slash + Text | `BASIC_COMMANDS_ROLE_ID`    |
| [`delreminder`](#delreminder)             | Slash + Text | `BASIC_COMMANDS_ROLE_ID`    |
| [`show-apply-button`](#show-apply-button) | Slash only   | `MC_MOD_ROLE_ID or MANAGER_ROLE_ID`|
| [`list-applications`](#list-applications) | Slash only   | `MC_MOD_ROLE_ID or MANAGER_ROLE_ID`|
| [`strike`](#strike)                       | Slash + Text | `ADVANCED_COMMANDS_ROLE_ID` |
| [`checkstrike`](#checkstrike)             | Slash + Text | `ADVANCED_COMMANDS_ROLE_ID` |

---

## Utility Commands

### `ping`

Replies with `Pong!` — a basic connectivity/health check.

**Slash:**

```
/ping
```

**Text:** not available.

---

### `server`

Shows basic info about the current server (name, member count).

**Slash:**

```
/server
```

**Text:**

```
!server
```

---

### `user`

Shows profile info about a user: display name, username, ID, account creation date, join date, invite info (if tracked), and roles.

**Slash:**

```
/user [target]
```

- `target` _(optional)_ — mention or user ID. Defaults to yourself if omitted.

**Text:**

```
!user [@mention|userID]
```

---

## Reminder Commands

### `remindme`

Schedules a reminder that pings you back in the channel once the time elapses.

**Slash:**

```
/remindme time:<duration> [message:<text>]
```

- `time` _(required)_ — duration string, e.g. `1m`, `2h`, `3d`, `1w`
- `message` _(optional)_ — reminder text

**Text:**

```
!remindme <time> [message]
```

Example:

```
!remindme 2h Check on the build
```

---

### `reminders`

Lists your currently active reminders, numbered, with relative expiry times.

**Slash:**

```
/reminders
```

**Text:**

```
!reminders
```

---

### `delreminder`

Deletes one of your reminders by its list number (as shown by `/reminders`).

**Slash:**

```
/delreminder num:<number>
```

- `num` _(required)_ — the reminder's position in your `/reminders` list

**Text:**

```
!delreminder <number>
```

Example:

```
!delreminder 2
```

---

## Application Commands

### `show-apply-button`

Posts an embed with an **📝 Apply** button in the current channel, which opens the application form for users.

**Slash:**

```
/show-apply-button
```

**Text:** not available.

---

### `list-applications`

Lists submitted applications (up to 25 shown at once), optionally filtered by status.

**Slash:**

```
/list-applications [status:<Pending|Approved|Rejected>]
```

- `status` _(optional)_ — filter results by application status

**Text:** not available.

---

## Moderation Commands

### `strike`

Issues or removes a strike for a user. Strike levels 1–3 have different expiry/downgrade schedules; level `0` removes an existing strike. Logs the action to the moderation log channel (`MODERATION_LOGS_CHANNEL_ID`) if configured.

**Slash:**

```
/strike level:<0|1|2|3> user:<mention|ID>
```

- `level` _(required)_ — `0` (remove), `1` (Warning), `2` (Serious), `3` (Severe)
- `user` _(required)_ — mention or Discord ID of the target user

**Text:**

```
!strike <level> <userID|@mention>
```

Example:

```
!strike 2 @SomeUser
```

---

### `checkstrike`

Looks up the active strike (if any) for a user, showing level, issuer, and the downgrade/clear schedule.

**Slash:**

```
/checkstrike user:<mention|ID>
```

- `user` _(required)_ — mention or Discord ID of the target user

**Text:**

```
!checkstrike <userID|@mention>
```

---

## Notes

- Text-prefix commands require the message to start with `!` and are ignored from bots.
- Role-gated commands (`requiredRoles`) check the invoking member against the relevant role ID environment variable(s); `ADVANCED_COMMANDS_ROLE_ID` supports a comma-separated list of role IDs.
- `strike`, `checkstrike`, `remindme`, `reminders`, and `delreminder` are available via both slash and text interfaces; `ping`, `show-apply-button`, and `list-applications` are slash-only.
