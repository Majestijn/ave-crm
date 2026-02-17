# Cloudflare Origin Certificates – Stappenplan

Cloudflare Origin Certificates zijn certificaten die **Cloudflare** uitgeeft voor jouw origin server. Cloudflare vertrouwt deze certs bij de verbinding tussen Cloudflare en je server (Full/Full strict).

**Voordelen:** 15 jaar geldig, geen automatische vernieuwing nodig, geen DNS/HTTP challenge.

---

## Hoe het werkt

```
Browser  ──HTTPS──►  Cloudflare  ──HTTPS──►  Jouw server (origine)
         (Edge cert)   (Origin cert)
```

1. **Browser → Cloudflare:** Cloudflare gebruikt het standaard Edge-certificaat.
2. **Cloudflare → jouw server:** Cloudflare gebruikt jouw Origin Certificate op de server; Cloudflare vertrouwt dit cert omdat ze het zelf hebben uitgegeven.

---

## Stap 1: Certificaat aanmaken in Cloudflare

1. Log in op [dash.cloudflare.com](https://dash.cloudflare.com)
2. Selecteer **avecrm.nl**
3. Ga naar **SSL/TLS** → **Origin Server**
4. Klik **Create Certificate**
5. Kies:
   - **Private key type:** RSA (2048) of ECDSA (P-256)
   - **Hostnames:** 
     - `avecrm.nl`
     - `*.avecrm.nl` (voor tenant-subdomeinen)
6. Klik **Create**
7. Je krijgt twee blokken tekst:
   - **Origin Certificate** (het certificaat)
   - **Private Key** (de privésleutel)
8. Sla beide op; je kunt ze later niet meer ophalen.

---

## Stap 2: Certificaat op de server plaatsen

SSH naar je server en maak het bestand aan:

```bash
ssh forge@161.35.150.212
```

Maak de map en bestanden:

```bash
sudo mkdir -p /etc/nginx/ssl/cloudflare
sudo nano /etc/nginx/ssl/cloudflare/origin.crt
```

Plak het **Origin Certificate** (inclusief `-----BEGIN CERTIFICATE-----` en `-----END CERTIFICATE-----`). Sla op (Ctrl+O, Enter, Ctrl+X).

```bash
sudo nano /etc/nginx/ssl/cloudflare/origin.key
```

Plak de **Private Key** (inclusief `-----BEGIN PRIVATE KEY-----` en `-----END PRIVATE KEY-----`). Sla op.

Stel rechten goed in:

```bash
sudo chmod 644 /etc/nginx/ssl/cloudflare/origin.crt
sudo chmod 600 /etc/nginx/ssl/cloudflare/origin.key
```

---

## Stap 3: Nginx configuratie controleren

Je Nginx-config moet naar deze bestanden verwijzen:

```nginx
ssl_certificate /etc/nginx/ssl/cloudflare/origin.crt;
ssl_certificate_key /etc/nginx/ssl/cloudflare/origin.key;
```

Controleer dat je config dit zo heeft. Test en herlaad Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Stap 4: Cloudflare SSL-modus instellen

1. Cloudflare → **SSL/TLS** → **Overview**
2. Zet de modus op **Full (strict)**
   - Cloudflare maakt dan HTTPS-verbinding naar je server
   - Jouw Origin Certificate wordt daarvoor gebruikt

---

## Stap 5: DNS proxy controleren

Controleer in Cloudflare → **DNS** dat de A-records voor `avecrm.nl` en `*` op **Proxied** (oranje wolk) staan, zodat verkeer via Cloudflare loopt.

---

## Samenvatting

| Stap | Actie |
|------|-------|
| 1 | Cloudflare → SSL/TLS → Origin Server → Create Certificate |
| 2 | Sla cert + key op in `/etc/nginx/ssl/cloudflare/` op de server |
| 3 | Nginx naar deze bestanden laten verwijzen, herladen |
| 4 | Cloudflare SSL-modus → Full (strict) |
| 5 | DNS-records op Proxied zetten |

---

## Verlenging

Cloudflare Origin Certificates zijn **15 jaar** geldig. Je hoeft ze niet te vernieuwen zoals bij Let’s Encrypt. Alleen bij het verlopen (of bij een nieuw domein) maak je een nieuw certificaat aan en vervang je de bestanden in `/etc/nginx/ssl/cloudflare/`.
