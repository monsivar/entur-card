# Entur Card

A user-friendly Lovelace card for the Home Assistant
[`entur_public_transport`](https://www.home-assistant.io/integrations/entur_public_transport/)
integration.

This branch proposes an incremental update to the existing Entur Card. It is
designed to work with both the current integration contract and the modernized
stop-place setup proposed in
[Home Assistant Core PR #182523](https://github.com/home-assistant/core/pull/182523).

## Relationship to Home Assistant Core

This card update is intentionally coupled to the entity model introduced by
[home-assistant/core#182523](https://github.com/home-assistant/core/pull/182523):

- stop places are configured through the Home Assistant UI;
- each configured stop place can expose a whole-stop sensor, all active
  platforms, or selected platforms;
- entities have stable identities and are grouped under the stop-place device;
- route filtering remains local to each configured stop place.

The card does not call Entur directly. API access, filtering, polling and
stop-place configuration remain the responsibility of the Home Assistant
integration. This keeps the card compatible with existing YAML sensors while
making it useful with the proposed Core update.

## What this update adds

- Select one or more Entur devices in the visual card editor.
- Search stop places by name in the visual editor and see how many sensors each
  stop place provides.
- Discover the sensors belonging to selected stop-place devices automatically.
- Group platform sensors under their Home Assistant stop-place device.
- Prefer platform sensors when they are available, avoiding a duplicate
  whole-stop row by default.
- Keep legacy and per-entity settings available in a compact advanced section.
- Accept both explicit entity objects and plain entity ID strings.
- Read a future structured `departures` attribute when available.
- Fall back to the existing Entur attributes during migration.
- Handle departures around midnight more reliably.
- Display destinations, delays, scheduled departures and empty states more clearly.
- Refresh the clock shown in the card without requiring a state change.
- Keep Norwegian Bokmål, Norwegian Nynorsk and English translations.

## Installation

### HACS

Install Entur Card from HACS under **Frontend**. Add the resource when Home
Assistant asks for it.

### Manual installation

1. Download `entur-card.js` from the latest release.
2. Copy it to `config/www`.
3. Add `/local/entur-card.js` as a JavaScript Module under
   **Settings → Dashboards → Resources**.

## Recommended configuration

After configuring stop places through the Entur integration, select the
corresponding devices in the card editor. The card will discover the sensors
belonging to those devices.

```yaml
type: custom:entur-card
name: Next departures
devices:
  - 1234567890abcdef
  - fedcba0987654321
group_by_device: true
display_time: true
divide_routes: true
```

`devices` contains Home Assistant `device_id` values. Normally these do not
need to be entered manually; select the stop places using the checkboxes in
the visual editor. The editor supports searching by stop-place name and shows
the number of discoverable Entur sensors for each device.

## Existing entity configuration

Existing dashboards remain supported:

```yaml
type: custom:entur-card
name: Departures
entities:
  - entity: sensor.entur_oslo_s
    extra_departures: all
    remaining_time: all
    clock_icon_state: left
  - entity: sensor.entur_nationaltheatret
    extra_departures: next
display_time: true
divide_routes: true
```

An entity can also be supplied as a plain string:

```yaml
entities:
  - sensor.entur_oslo_s
```

## Card options

| Option | Type | Description |
| --- | --- | --- |
| `name` | string | Card heading. |
| `entities` | list | Explicit sensor entities or entity objects. |
| `devices` | list | Entur device IDs to discover automatically. |
| `group_by_device` | boolean | Show a heading for each stop-place device. |
| `display_time` | boolean | Show the current time in the card heading. |
| `divide_routes` | boolean | Separate stop-place rows with a divider. |
| `show_stop_place` | boolean | Keep the whole-stop sensor when platform sensors are available. Defaults to `false` for device discovery. |
| `show_empty` | boolean | Show an explanation when no sensors or departures are available. |

## Per-entity options

| Option | Description |
| --- | --- |
| `name` | Override the entity name. |
| `destination` | Add a fixed destination label. |
| `extra_departures` | `next` shows the next departure; `all` shows all available departures. |
| `remaining_time` | `line`, `line_next`, `line_extras` or `all`. |
| `human_readable_time` | Show a sentence such as “Departs in 5 minutes”. |
| `clock_icon_state` | `left` or `right`. |
| `divide_lines` | Separate departures for one sensor. |

## Data compatibility

The card uses the structured `departures` attribute when the integration
provides it. During the transition it also supports the existing attributes:
`route`, `due_at`, `next_route`, `next_due_at`, `delay`, `real_time` and
`departure_#3` and subsequent fields.

When a selected device exposes both a whole-stop sensor and platform sensors,
device discovery displays the platform sensors and suppresses the duplicate
whole-stop sensor. Set `show_stop_place: true` when the whole-stop view is also
useful. Explicit `entities` configurations are left unchanged.

This allows the card to be released as a companion update to
[home-assistant/core#182523](https://github.com/home-assistant/core/pull/182523)
without requiring existing YAML dashboards to be rewritten.

## Development

```sh
npm install
npm run build
```

The production bundle is written to `dist/entur-card.js`.

## Contributions

Pull requests are welcome. Please test whole-stop sensors, all-platform
sensors, selected-platform sensors, legacy YAML sensors and departures around
midnight.
