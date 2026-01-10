# Implementatieplan: Migratie E-mail naar Microsoft 365 (Specifiek: aveconsult.nl)

**Project:** Migratie e-mail `info@aveconsult.nl` en `admin@aveconsult.nl` naar Microsoft 365.  
**Behoud:** Website blijft draaien op het huidige hostingpakket bij Vimexx.

---

## Fase 1: Voorbereiding & Licenties

1.  **Huidige situatie bij Vimexx**
    *   Accounts: `info@aveconsult.nl` en `admin@aveconsult.nl`.
    *   Zorg dat je de huidige wachtwoorden van deze twee accounts bij de hand hebt voor de data-migratie.

2.  **Microsoft 365 Tenant aanmaken**
    *   Koop 2 licenties aan (bijv. *Business Basic* of *Standard*).
    *   Maak de tenant aan (bijv. `aveconsult.onmicrosoft.com`).

3.  **Backup (Lokale veiligheid)**
    *   Exporteer voor de zekerheid de huidige mailboxen naar een .PST bestand via Outlook, of zorg dat je een volledige backup hebt via het Vimexx paneel.

## Fase 2: Microsoft 365 Inrichting (ZONDER website-onderbreking)

1.  **Domein toevoegen in Microsoft Admin Center**
    *   Voeg `aveconsult.nl` toe.
    *   **CRUCIAAL:** Wanneer Microsoft vraagt: *"Hoe wilt u uw domein verbinden?"*, kies dan voor: **"Ik beheer mijn eigen DNS-records"**. 
    *   *Pas de Nameservers (NS) bij Vimexx NOOIT aan, anders gaat je website offline.*

2.  **Domein Verificatie**
    *   Voeg bij Vimexx het gevraagde **TXT-record** toe (bijv. `v=ms12345678`). Hiermee bewijs je alleen dat je eigenaar bent; er verandert nog niets aan de mail.

3.  **Gebruikers aanmaken**
    *   Maak in Microsoft 365 de twee gebruikers aan:
        *   `info@aveconsult.nl`
        *   `admin@aveconsult.nl`
    *   Wijs de licenties toe.

## Fase 3: E-mail Migratie (Data kopiëren)

Voordat we de e-mail "live" zetten, halen we de oude mail op van de Vimexx servers.

1.  Gebruik de **IMAP-migratie** tool in het Microsoft Admin Center.
2.  Servergegevens Vimexx (meestal): `mail.zxcs.nl`.
3.  Vul de e-mailadressen en wachtwoorden in van de twee accounts.
4.  Start de migratie. Alle oude mail wordt nu gekopieerd naar de nieuwe Microsoft omgeving.

## Fase 4: De "Switch" bij Vimexx (DNS)

Pas nu gaan we de e-mail daadwerkelijk omzetten. De website blijft gewoon draaien omdat we de `A-records` niet aanraken.

Log in op het **Vimexx Klantenpaneel -> DNS Beheer** voor `aveconsult.nl`:

1.  **MX Records (E-mail route):**
    *   Verwijder de bestaande MX-records (die naar `mail.zxcs.nl` of `aveconsult.nl` wijzen).
    *   Voeg het Microsoft MX-record toe:
        *   Type: `MX`, Naam: `@`, Waarde: `aveconsult-nl.mail.protection.outlook.com`, Prioriteit: `0`.

2.  **SPF Record (Anti-Spam):**
    *   Pas het huidige TXT-record (v=spf1...) aan naar:
    *   `v=spf1 include:spf.protection.outlook.com -all`
    *   *Heeft de website een contactformulier?* Gebruik dan: `v=spf1 +a +mx include:spf.protection.outlook.com -all`.

3.  **Autodiscover (Instelhulp):**
    *   Voeg een CNAME record toe:
        *   Type: `CNAME`, Naam: `autodiscover`, Waarde: `autodiscover.outlook.com`.

## Fase 5: Afronding

1.  **Nieuwe Outlook Profielen**
    *   Verwijder de oude IMAP-accounts uit Outlook.
    *   Voeg de accounts opnieuw toe als "Exchange" of "Microsoft 365" accounts.

2.  **Vimexx Hosting**
    *   Laat het hostingpakket bij Vimexx gewoon doorlopen. Dit is nodig voor je website. 
    *   In het Vimexx paneel onder "E-mail accounts" kun je de accounts eventueel laten staan, maar ze zullen geen nieuwe mail meer ontvangen.

3.  **CRM Koppeling**
    *   Koppel nu de Microsoft 365 agenda's van `info@` en `admin@` aan het CRM.

---

### Overzicht DNS Wijzigingen bij Vimexx:

| Record Type | Naam | Oude Waarde (Vimexx) | Nieuwe Waarde (M365) |
| :--- | :--- | :--- | :--- |
| **A** | **@ / www** | **[IP Adres]** | **NIET WIJZIGEN** (is voor website) |
| MX | @ | mail.zxcs.nl | `aveconsult-nl.mail.protection.outlook.com` |
| TXT | @ | v=spf1 ... | `v=spf1 include:spf.protection.outlook.com -all` |
| CNAME | autodiscover | (geen) | `autodiscover.outlook.com` |