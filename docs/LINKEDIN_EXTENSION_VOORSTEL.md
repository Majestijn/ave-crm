# Voorstel: LinkedIn Browser Extension

## Doel

Recruiters kunnen tijdens het zoeken op LinkedIn een geschikt profiel direct importeren als netwerkcontact in AVE CRM en koppelen aan een actieve opdracht, zonder handmatig te kopiëren of te wisselen tussen tabbladen.

## Architectuur

```
[LinkedIn profiel] → [Chrome Extension] → [AVE CRM API] → [Gemini AI] → [Contact + Koppeling]
```

- **Extension**: leest profieltekst van de pagina, toont opdrachtenlijst, stuurt data naar backend
- **Backend**: valideert, roept Gemini aan voor parsing, maakt contact aan, koppelt aan opdracht
- **Geen API-keys in de extension**: alles via de bestaande CRM API

## Geïmplementeerd

### Backend

- **Endpoint**: `POST /api/v1/linkedin-import`
- **Request**:
  ```json
  {
    "profile_text": "string (verplicht, 50-50000 tekens)",
    "linkedin_url": "string (optioneel)",
    "assignment_uid": "string (verplicht)"
  }
  ```
- **Flow**: Parse met Gemini → maak Contact → koppel aan Assignment (status: called)
- **Service**: `LinkedInProfileParsingService` – hergebruikt Vertex AI/Gemini setup

### Chrome Extension

- **Locatie**: `linkedin-extension/`
- **Manifest V3**, permissions: storage, activeTab, scripting, host_permissions voor LinkedIn + CRM
- **Popup**: instellingen (CRM URL, API token), opdrachten-dropdown, import-knop
- **Profiel-extractie**: content script haalt zichtbare tekst uit de LinkedIn DOM

## Gebruikersflow

1. Recruiter zoekt op LinkedIn, vindt een geschikt profiel
2. Klikt op het extensie-icoon
3. Kiest een opdracht uit de lijst (opgehaald via `/assignments`)
4. Klikt "Importeer dit profiel"
5. Extension extraheert profieltekst, stuurt naar backend
6. Backend parseert met Gemini, maakt contact, koppelt aan opdracht
7. Bevestiging in de popup

## Authenticatie

- **API-token**: gebruiker kopieert `auth_token` uit Local Storage na inloggen op het CRM
- **Alternatief (toekomst)**: aparte "Extension token" in CRM-instellingen met langere geldigheid

## Beperkingen & aandachtspunten

1. **LinkedIn DOM**: structuur wijzigt regelmatig; extractie kan breken. Fallback: `document.body.innerText`.
2. **LinkedIn ToS**: automatisch scrapen kan tegen de voorwaarden zijn; gebruik op eigen risico.
3. **Ontbrekende data**: e-mail en telefoon staan vaak niet op LinkedIn; velden blijven leeg.
4. **CORS**: API moet requests van de extension toestaan (zelfde origin als CRM-domein).

## Alternatief: Profiel plakken (ToS-vriendelijk)

Er is een **Paste Profile Import** flow in het CRM die geen browser extension gebruikt:
- **Netwerk** → **Importeren** → **Profiel plakken**
- Of direct: `/network?import=paste-profile` (voeg toe aan favorieten voor snelle toegang)
- Recruiter kopieert handmatig profieltekst op LinkedIn (Ctrl+A, Ctrl+C), plakt in het CRM
- Geen scraping, geen extension → beter verdedigbaar tegen LinkedIn ToS

## Uitbreidingen (optioneel)

- **Tokenbeheer in CRM**: pagina "LinkedIn Extension" in instellingen om een token te genereren
- **Firefox-versie**:zelfde logica, ander manifest
- **Bulk-import**: meerdere profielen in één keer (bijv. van zoekresultaten)
- **Duplicaatdetectie**: controleren op bestaand contact (LinkedIn URL of naam) vóór aanmaken
