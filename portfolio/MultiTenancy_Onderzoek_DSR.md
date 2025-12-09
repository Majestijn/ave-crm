# Multi-Tenancy Implementatie AVE CRM
**Student:** Stijn
**Datum:** 6 december 2025

## Inhoudsopgave
1. [Inleiding](#1-inleiding)
2. [Doel van het onderzoek](#2-doel-van-het-onderzoek)
    *   [2.1 User Story met Acceptatie- en Kwaliteitscriteria](#21-user-story-met-acceptatie--en-kwaliteitscriteria)
    *   [2.2 Learning Story met Acceptatie- en Kwaliteitscriteria](#22-learning-story-met-acceptatie--en-kwaliteitscriteria)
3. [Onderzoeksmethode: Design Science Research](#3-onderzoeksmethode-design-science-research)
    *   [3.1 Keuze voor Design Science Research](#31-keuze-voor-design-science-research)
4. [Onderzoeksvragen](#4-onderzoeksvragen)
5. [Stappen en resultaten van het onderzoek](#5-stappen-en-resultaten-van-het-onderzoek)
    *   [5.1 Probleemanalyse: Strategieën voor Multi-tenancy](#51-probleemanalyse-strategieën-voor-multi-tenancy)
    *   [5.2 Ontwerp: Database per Tenant in Laravel](#52-ontwerp-database-per-tenant-in-laravel)
    *   [5.3 Evaluatie en Reflectie: Hybride ID Strategie (Internal vs External)](#53-evaluatie-en-reflectie-hybride-id-strategie-internal-vs-external)
6. [Conclusie](#6-conclusie)
7. [Bronnen](#7-bronnen)

---

## 1. Inleiding
Dit document beschrijft hoe ik de vaardigheid **Overzicht Creëren** op niveau 2 heb toegepast binnen het AVE CRM project. Mijn opdracht was het realiseren van een multi-tenancy architectuur voor een SaaS-platform in de recruitmentbranche. Gezien de gevoelige aard van de gegevens (kandidaten, persoonsgegevens) is data-isolatie cruciaal.

Voordat ik begon met de technische uitvoering, heb ik methodisch onderzoek gedaan naar verschillende multi-tenancy patronen om te bepalen welke strategie het beste aansluit bij de eisen van de AVG (GDPR) en de wensen van de klant.

Dit document toont aan hoe ik systematisch informatie heb verzameld (Overzicht Creëren), nieuwe technische kennis heb opgedaan (Juiste Kennis Ontwikkelen) en kritische keuzes heb gemaakt in de architectuur (Kritisch Oordelen).

## 2. Doel van het onderzoek
Het doel van dit onderzoek was om vast te stellen hoe een **Database-per-Tenant** architectuur veilig en schaalbaar geïmplementeerd kan worden in Laravel, zonder de onderhoudbaarheid van de code in gevaar te brengen.

Mijn onderzoek richtte zich op drie doelstellingen:
1.  **Inzicht verwerven:** De voor- en nadelen van verschillende databank-scheidingsmodellen begrijpen.
2.  **Ontwerp opstellen:** Een architectuur ontwerpen waarbij Laravel automatisch de juiste database selecteert op basis van het subdomein.
3.  **Realiseren en Testen:** Een werkend prototype opleveren dat niet alleen functioneel is, maar ook veilig tegen moderne aanvalsvectoren.

### 2.1 User Story met Acceptatie- en Kwaliteitscriteria
**User Story:**
"Als recruitment-organisatie (Tenant) wil ik dat mijn data fysiek gescheiden is van andere organisaties, zodat ik zeker weet dat mijn concurrenten nooit inzicht krijgen in mijn kandidaten."

**Acceptatiecriteria:**
*   Bij het benaderen van `klant-a.ave-crm.com` toont de applicatie alleen data uit de database van Klant A.
*   Authenticatie vindt pas plaats *nadat* de tenant-database is geselecteerd; gebruikers zijn uniek per tenant.
*   De cache (Redis) is gescheiden per tenant (geen 'cache bleeding').

**Kwaliteitscriteria:**
*   **Veiligheid (Security):** Data-isolatie is 'enforced' door de architectuur (fysiek andere connectie), niet door queries (vergeten `WHERE` clause). *Bron: OWASP Multi-tenancy Risks.*
*   **Compliance:** De architectuur ondersteunt makkelijke verwijdering van alle data van één tenant (AVG Recht op vergetelheid).
*   **Obscurity:** Het is niet mogelijk voor gebruikers om de grootte van het klantenbestand te raden via opeenvolgende ID's (ID Enumeration).

### 2.2 Learning Story met Acceptatie- en Kwaliteitscriteria
**Learning Story:**
"Als student wil ik leren hoe ik 'Tenant Aware' jobs en caching kan implementeren in Laravel, zodat ik complexe enterprise-architecturen kan bouwen die verder gaan dan standaard CRUD-applicaties."

**Acceptatiecriteria:**
*   Ik kan uitleggen waarom de standaard Laravel Cache driver niet veilig is in een multi-tenant omgeving.
*   Ik heb een custom `SwitchTenantTask` geschreven die de cache prefix dynamisch aanpast.

**Kwaliteitscriteria:**
*   Mijn implementatie volgt de SOLID principes en maakt gebruik van de interfaces van de `spatie/laravel-multitenancy` package.
*   Ik kan beargumenteren waarom ik bepaalde online tutorials (die vaak onveilige 'single database' methodes aanleren) heb verworpen.

## 3. Onderzoeksmethode: Design Science Research
Voor dit vraagstuk heb ik de **Design Science Research (DSR)** methode toegepast.
1.  **Probleemanalyse:** Analyseren van de privacy-risico's bij gedeelde databases.
2.  **Ontwerp:** Het uitwerken van de Database-per-Tenant architectuur.
3.  **Evaluatie:** Het kritisch toetsen van standaard Laravel-conventies (zoals Auto-Increment ID's) tegenover de veiligheidseisen.

### 3.1 Keuze voor Design Science Research
DSR is gekozen omdat het niet gaat om louter theorie, maar om het oplossen van een *praktisch probleem* (data-isolatie) door middel van een *artefact* (de code-implementatie). Het dwingt mij om eerst te analyseren voordat ik ga bouwen ("Think before you code"), wat essentieel is voor complexe architecturen.

## 4. Onderzoeksvragen
1.  **Welke multi-tenancy strategie biedt de beste balans tussen veiligheid en onderhoudbaarheid voor AVE CRM?**
2.  **Hoe voorkomen we dat tenants elkaars cached data zien (Cache Bleeding)?**
3.  **Hoe beveiligen we publieke API-endpoints tegen ID Enumeration attacks zonder performance te verliezen?**

## 5. Stappen en resultaten van het onderzoek

### 5.1 Probleemanalyse: Strategieën voor Multi-tenancy
Ik heb drie gangbare patronen geanalyseerd:

1.  **Single Database (Discriminator Column):** Alle data in één tabel met `tenant_id`.
    *   *Oordeel:* Afgewezen. Te foutgevoelig. Eén vergeten `where` en data lekt.
2.  **Separate Schemas:** Eén database, aparte schema's (Postgres schema).
    *   *Oordeel:* Goede optie, maar complexer in migraties met Eloquent.
3.  **Database per Tenant:** Fysiek aparte databases.
    *   *Oordeel:* **Gekozen.** Maximale isolatie. Als Tenant A gehackt wordt, is Tenant B nog veilig. Makkelijker voor backups en GDPR-compliance.

### 5.2 Ontwerp: Database per Tenant in Laravel
Ik heb gebruik gemaakt van de `spatie/laravel-multitenancy` package.

**Implementatie Cache Isolatie:**
Uit onderzoek bleek dat Redis standaard gedeeld wordt. Ik heb een Task ontworpen om dit op te lossen.

*Codefragment: `backend/app/Tasks/SwitchTenantCacheTask.php`*
```php
public function makeCurrent(IsTenant $tenant): void
{
    // Dynamisch de prefix aanpassen zodat Tenant A nooit keys van Tenant B ziet
    $this->setCachePrefix("tenant_{$tenant->getKey()}_");
}
```

**Database Structuur:**
Ik heb de migraties gesplitst in `landlord` (systeembeheer) en `tenant` (klantdata).
*   `database/migrations/landlord/`: Bevat de `tenants` tabel.
*   `database/migrations/tenant/`: Bevat `users`, `candidates`, etc.

### 5.3 Evaluatie en Reflectie: Hybride ID Strategie (Internal vs External)
Bij het ontwerpen van de database en API stond ik voor een dilemma tussen **Performance** en **Security**.

**De Tegenstelling:**
*   *Optie A (Auto-Increment Integer):* Zeer snel voor database-indexen en joins (interne performance), maar onveilig voor de frontend (ID Enumeration attacks: `user/1`, `user/2`...).
*   *Optie B (UUID/ULID als Primary Key):* Zeer veilig en globaal uniek, maar kan leiden tot 'index fragmentation' en tragere queries bij miljoenen records ten opzichte van integers.

**Mijn Kritische Oordeel (Hybride Strategie):**
Ik heb geoordeeld dat ik niet hoef te kiezen voor het één of het ander. Ik heb een **hybride strategie** toegepast:
1.  **Intern (Backend):** Ik gebruik standaard `id` (bigint auto-increment) voor alle database-relaties. Dit houdt de joins razendsnel en de database compact.
2.  **Extern (Frontend/API):** Ik gebruik **ULIDs** (`uid` kolom) voor alle communicatie naar buiten. De frontend krijgt *nooit* de interne ID te zien.

**Bewijs in Code:**
Ik heb de model binding in Laravel aangepast zodat API-routes automatisch de `uid` kolom gebruiken, terwijl de database intern op `id` blijft draaien.

In `backend/app/Models/User.php`:
```php
// Zorgt ervoor dat /api/users/{user} zoekt op de ULID string, niet op ID 1, 2, 3
public function getRouteKeyName(): string
{
    return 'uid';
}

// Interne relaties blijven efficiënt (standaard Laravel gedrag)
// public function assignments() { return $this->hasMany(Assignment::class); } 
// (Dit gebruikt stiekem 'user_id' bigint, wat performant is)
```

Dit toont aan dat ik op Niveau 2 in staat ben om gangbare normen ter discussie te stellen en een oplossing te engineeren die "best of both worlds" biedt: de snelheid van integers en de veiligheid van ULIDs.

## 6. Conclusie
Met dit onderzoek en de realisatie ervan toon ik de volgende vaardigheden op Niveau 2 aan:

*   **Overzicht Creëren:** Ik heb methodisch de opties voor multi-tenancy in kaart gebracht en criteria (AVG, Veiligheid) opgesteld die leidden tot de keuze voor "Database per Tenant".
*   **Juiste Kennis Ontwikkelen:** Ik heb diepgaande kennis opgedaan van Laravel's Service Container en Caching drivers om de `SwitchTenantCacheTask` te kunnen schrijven.
*   **Kritisch Oordelen:** Ik heb de afweging gemaakt tussen performance (Integers) en veiligheid (ULIDs). In plaats van blindelings één kant te kiezen, heb ik een hybride architectuur opgezet die interne optimalisatie scheidt van externe beveiliging. Hiermee overstijg ik de standaard "tutorial-implementatie".

## 7. Bronnen
1.  **Spatie.** *Laravel Multitenancy Documentation.* Geraadpleegd op 6 december 2025.
    *   *Betrouwbaar:* Officiële documentatie van de gebruikte package, geschreven door experts in het Laravel ecosysteem.
2.  **Martin Fowler.** *Multi-Tenant Data Architecture.*
    *   *Betrouwbaar:* Martin Fowler is een autoriteit op het gebied van software architectuur.
3.  **OWASP.** *Insecure Direct Object References (IDOR).*
    *   *Betrouwbaar:* Wereldwijde standaard voor webapplicatie beveiliging. Geeft duidelijk aan waarom voorspelbare ID's gevaarlijk zijn.
4.  **Tom Harrison.** *UUIDs vs Integers for Database Primary Keys.*
    *   *Betrouwbaar:* Technisch artikel dat de performance-impact van UUIDs als primary keys analyseert, wat mijn keuze voor een hybride systeem onderbouwt.
