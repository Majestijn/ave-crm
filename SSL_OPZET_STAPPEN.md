# SSL-opzet met Cloudflare + Forge – Stappenplan

Dit plan zet SSL correct op voor avecrm.nl met Cloudflare als proxy.

---

## Stap 1: Cloudflare – SSL-modus instellen

1. Log in op [dash.cloudflare.com](https://dash.cloudflare.com)
2. Kies je domein **avecrm.nl**
3. Ga naar **SSL/TLS** → **Overview**
4. Zet de modus op **Full** of **Full (strict)**

---

## Stap 2: Cloudflare – Wildcard record achter proxy

1. Blijf in Cloudflare, ga naar **DNS** → **Records**
2. Zoek het **A-record** met naam `*` (wildcard)
3. Klik **Edit**
4. Zet **Proxy status** op **Proxied** (oranje wolk)
5. Sla op

Nu gaat alle verkeer (domein én tenant-subdomeinen) via Cloudflare met SSL.

---

## Stap 3: Trust Proxies in Laravel (code)

Laravel moet Cloudflare herkennen als proxy, anders worden URLs en headers verkeerd verwerkt.

**Bestand:** `backend/bootstrap/app.php`

Vervang het `withMiddleware`-blok:

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->trustProxies(
        at: '*',
        headers: \Illuminate\Http\Request::HEADER_X_FORWARDED_FOR
            | \Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO
            | \Illuminate\Http\Request::HEADER_X_FORWARDED_PORT
    );
})
```

Committen en pushen, daarna opnieuw deployen (of na stap 6).

---

## Stap 4: Forge – Environment controleren

1. Forge → **Sites** → **avecrm.nl** → **Environment**
2. Controleer:
   - `APP_URL=https://avecrm.nl`
   - `APP_ENV=production`
   - `CORS_ALLOWED_ORIGIN=https://avecrm.nl`
   - `CORS_PATTERN=https?://.*\.avecrm\.nl`
   - `SANCTUM_STATEFUL_DOMAINS=avecrm.nl,*.avecrm.nl`
3. Pas zo nodig aan en **Save**

---

## Stap 5: Forge – SSL-certificaat aanvragen

1. Forge → **Sites** → **avecrm.nl** → **SSL**
2. Klik **New Certificate** of **Let's Encrypt**
3. Voeg domeinen toe: `avecrm.nl`, `www.avecrm.nl`
4. Klik **Obtain Certificate**

Werkt dit niet (bijv. validatiefout):
- Zet de A-records in Cloudflare tijdelijk op **DNS only**
- Probeer opnieuw in Forge
- Zet daarna weer op **Proxied**

---

## Stap 6: Deploy en testen

1. Commit de wijziging uit stap 3
2. Push naar `main`
3. Wacht op automatische deploy, of gebruik **Deploy Now** in Forge
4. Test:
   - https://avecrm.nl (groen slot)
   - https://www.avecrm.nl
   - https://jouw-tenant.avecrm.nl

---

## Nginx – wildcard voor tenant-subdomeinen

Bij een 520 op tenant-subdomains (bijv. `ave-consult-bv.avecrm.nl`): Nginx moet alle subdomains accepteren.

**In Forge → Edit Nginx configuration** wijzig:

```nginx
server_name avecrm.nl;
```

naar:

```nginx
server_name avecrm.nl www.avecrm.nl .avecrm.nl;
```

De `.avecrm.nl` (met punt ervoor) omvat alle subdomeinen. Sla op en herlaad Nginx.

**Let op:** Voor HTTPS op subdomains heb je ook een **wildcard-certificaat** nodig (`*.avecrm.nl` via DNS-01 in Forge).

---

## Extra: poppler-utils (CV-import)

Als CV-import e-mail, telefoon of geboortedatum mist:

```bash
ssh forge@161.35.150.212
sudo apt-get update && sudo apt-get install -y poppler-utils
```

---

## Volgorde-overzicht

| # | Waar       | Actie                                      |
|---|------------|--------------------------------------------|
| 1 | Cloudflare | SSL-modus → Full (strict)                  |
| 2 | Cloudflare | Wildcard A-record → Proxied                |
| 3 | Codebase   | Trust Proxies in `bootstrap/app.php`       |
| 4 | Forge      | Environment controleren                     |
| 5 | Forge      | Let's Encrypt-certificaat aanvragen        |
| 6 | -          | Deploy en testen                           |
