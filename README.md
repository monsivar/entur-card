# Entur Card

Et brukervennlig Lovelace-kort for Home Assistant-integrasjonen
[`entur_public_transport`](https://www.home-assistant.io/integrations/entur_public_transport/).

Kortet er tilpasset den moderniserte Entur-integrasjonen i
[Home Assistant Core PR #182523](https://github.com/home-assistant/core/pull/182523).
PR-en introduserer søkbare stoppesteder, konfigurasjon per stoppested,
støtte for hele stoppesteder eller valgte plattformer, stabile entiteter og
samling av plattformsensorer under samme Home Assistant-enhet.

## Hva er nytt i 3.0

- Velg Entur-stoppesteder direkte i korteditoren når enhetene finnes i entity registry.
- Velg én eller flere Entur-enheter i stedet for å skrive inn alle sensorene manuelt.
- Gruppér plattformsensorer under stoppestedets Home Assistant-enhet.
- Støtte for både eksisterende attributter og en fremtidig strukturert `departures`-liste.
- Mer robust visning av tid, inkludert avganger rundt midnatt.
- Fungerer med både gamle YAML-sensorer og nye UI-konfigurerte stoppesteder.
- Oppdatert visning av destinasjon, forsinkelse, sanntidsstatus og manglende avganger.

## Installasjon

### HACS

Installer kortet fra HACS under **Frontend**, og legg til ressursen når Home
Assistant ber om det.

### Manuell installasjon

1. Last ned `entur-card.js` fra siste release.
2. Legg filen i `config/www`.
3. Legg til `/local/entur-card.js` som en JavaScript Module under
   **Settings → Dashboards → Resources**.

## Anbefalt oppsett

Når Entur-integrasjonen er satt opp fra brukergrensesnittet, velger du
stoppestedene i korteditoren. Kortet henter da entitetene som ligger under de
valgte Entur-enhetene.

```yaml
type: custom:entur-card
name: Neste avganger
devices:
  - 1234567890abcdef
  - fedcba0987654321
group_by_device: true
display_time: true
divide_routes: true
```

`devices` bruker Home Assistants `device_id`. I korteditoren trenger du normalt
ikke skrive disse ID-ene manuelt; velg stoppestedene med avkrysningsboksene.

## Manuell entitetskonfigurasjon

Eksisterende oppsett fungerer fortsatt:

```yaml
type: custom:entur-card
name: Rutetider
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

En entitet kan også angis som en ren tekststreng:

```yaml
entities:
  - sensor.entur_oslo_s
```

## Kortinnstillinger

| Innstilling | Type | Beskrivelse |
| --- | --- | --- |
| `name` | tekst | Overskrift på kortet. |
| `entities` | liste | Eksplisitte sensor-entiteter eller entitetsobjekter. |
| `devices` | liste | Entur-enheter som skal oppdages automatisk. |
| `group_by_device` | boolsk | Viser en overskrift per stoppested/enhet. |
| `display_time` | boolsk | Viser klokkeslett i kortoverskriften. |
| `divide_routes` | boolsk | Skiller stoppesteder med en linje. |
| `show_empty` | boolsk | Viser forklaring når ingen avganger eller sensorer finnes. |

## Innstillinger per sensor

| Innstilling | Beskrivelse |
| --- | --- |
| `name` | Overstyrer sensornavnet. |
| `destination` | Legger til en fast destinasjonstekst. |
| `extra_departures` | `next` viser neste avgang; `all` viser alle tilgjengelige avganger. |
| `remaining_time` | `line`, `line_next`, `line_extras` eller `all`. |
| `human_readable_time` | Viser «Avgang om …» for samme verdier som over. |
| `clock_icon_state` | `left` eller `right`. |
| `divide_lines` | Skiller avgangene for én sensor. |

## Datakompatibilitet

Kortet bruker den strukturerte `departures`-attributten når integrasjonen
tilbyr den. Inntil den er tilgjengelig, støttes de eksisterende attributtene
fra Entur-integrasjonen: `route`, `due_at`, `next_route`, `next_due_at`,
`delay`, `real_time` og `departure_#3` og videre.

Det betyr at kortet kan brukes under migreringen til oppsettet fra
[Core PR #182523](https://github.com/home-assistant/core/pull/182523), uten at
eksisterende YAML-konfigurasjoner må bygges om.

Kortet henter ikke data direkte fra Entur. All API-kommunikasjon, filtrering,
oppdateringsfrekvens og stoppestedlogikk skal fortsatt ligge i Home Assistant-
integrasjonen.

## Bidrag

Forslag og pull requests er velkomne. Test særlig kombinasjonene stoppested,
alle plattformer, valgte plattformer, YAML-sensorer og avganger rundt midnatt.
