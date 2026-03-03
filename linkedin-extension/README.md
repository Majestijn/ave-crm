# AVE CRM LinkedIn Extension

Chrome-extensie om LinkedIn-profielen te importeren als netwerkcontacten in AVE CRM en direct te koppelen aan een opdracht.

## Installatie (Chrome)

1. Open Chrome en ga naar `chrome://extensions/`
2. Schakel **Developer mode** in (rechtsboven)
3. Klik op **Load unpacked**
4. Selecteer de map `linkedin-extension`

## Configuratie

1. Klik op het extensie-icoon
2. Vul **CRM URL** in (bijv. `https://ave.avecrm.nl` of `http://ave.lvh.me:8080`)
3. Vul **API Token** in:
   - Log in op het CRM in een andere tab
   - Open DevTools (F12) → Application → Local Storage
   - Kopieer de waarde van `auth_token`

## Gebruik

1. Ga naar een LinkedIn-profielpagina (`linkedin.com/in/...`)
2. Klik op het extensie-icoon
3. Kies een opdracht uit de dropdown
4. Klik op **Importeer dit profiel**

De profieltekst wordt via Gemini AI geanalyseerd, een contact wordt aangemaakt en gekoppeld aan de gekozen opdracht.