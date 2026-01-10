**Onderzoeksplan: Data Fetching & State Management**

**AVE CRM Frontend**

**Auteur:** Stijn van der Neut

**Datum:** December 2025

**Project:** AVE CRM Frontend Optimalisatie

# **1. Inleiding**
Dit document beschrijft het onderzoeksplan voor het verbeteren van de data fetching en state management architectuur in het AVE CRM frontend project. Het huidige systeem gebruikt custom React hooks voor API-communicatie, maar mist belangrijke functionaliteiten zoals caching, automatische refetching en optimistic updates.

Dit onderzoek dekt de volgende HBO-i vaardigheden en beroepstaken:

**Productvaardigheden:**

•  Overzicht Creëren (Niveau 2/3) - Analyse fase

•  Juiste Kennis Ontwikkelen (Niveau 2/3) - Onderzoek fase

•  Kritisch Oordelen (Niveau 2/3) - Evaluatie fase

•  Kwalitatief Product Maken (Niveau 2/3) - Documentatie fase

**Beroepstaken:**

•  Software Analyseren (Niveau 2/3) - Probleemanalyse

•  Software Adviseren (Niveau 2/3) - Adviesrapport

•  Software Ontwerpen (Niveau 2/3) - Architectuur ontwerp

•  Software Realiseren (Niveau 2/3) - Implementatie
# **2. Probleemanalyse (Software Analyseren)**
**2.1 Huidige Situatie**

Het AVE CRM frontend gebruikt momenteel custom hooks voor data fetching. Deze hooks bevinden zich in de folder frontend/src/hooks/ en omvatten useAccounts, useContacts, useCandidates en useUsers. Elke hook implementeert zijn eigen useState voor data, loading en error states, en een useEffect voor het ophalen van data bij mount.

**2.2 Geïdentificeerde Problemen**

**Geen caching (Hoog):** Elke pagina-wissel haalt data opnieuw op van de server, wat leidt tot een trage gebruikerservaring en onnodige serverbelasting.

**Geen request deduplication (Medium):** Meerdere componenten kunnen dezelfde data tegelijkertijd ophalen, wat resulteert in dubbele API calls.

**Geen background refetching (Medium):** Data kan verouderd raken zonder dat de gebruiker het merkt. Er is geen mechanisme om data automatisch te verversen.

**Geen optimistic updates (Medium):** Gebruikers moeten wachten op de server response voordat de UI wordt bijgewerkt, wat een trage ervaring geeft.

**Geen retry logic (Medium):** Bij netwerkfouten faalt het request direct zonder herhaalpogingen.

**Code duplicatie (Laag):** Elke hook herhaalt dezelfde fetch logica, wat onderhoud bemoeilijkt.

**2.3 User Stories**

**US-1:** *"Als recruiter wil ik dat eerder bekeken data direct beschikbaar is, zodat ik snel kan navigeren tussen pagina's."*

**US-2:** *"Als recruiter wil ik dat de data automatisch ververst wordt op de achtergrond, zodat ik altijd actuele informatie zie."*

**US-3:** *"Als recruiter wil ik dat wijzigingen direct zichtbaar zijn in de UI, zodat ik niet hoef te wachten op de server."*

**2.4 Requirements**

**Functionele Requirements:**

•  FR-1: Data moet gecached worden en hergebruikt bij terugkeer naar een pagina

•  FR-2: Cache moet automatisch invalideren na mutaties (create/update/delete)

•  FR-3: Data moet op de achtergrond refetchen bij window focus

•  FR-4: Optimistic updates voor snelle UI feedback

•  FR-5: Automatische retry bij gefaalde requests (max 3 pogingen)

**Niet-functionele Requirements:**

•  NFR-1: Bundle size toename max 15KB gzipped

•  NFR-2: Geen breaking changes in bestaande componenten

•  NFR-3: TypeScript first met volledige type inference

•  NFR-4: Minimale learning curve voor team
# **3. Onderzoeksvragen**
**Hoofdvraag:**

*"Welke data fetching library biedt de beste balans tussen functionaliteit, bundle size en developer experience voor het AVE CRM frontend?"*

**Deelvragen:**

1\.  Welke libraries zijn beschikbaar voor server state management in React?

2\.  Hoe verhouden deze libraries zich qua features, bundle size en populariteit?

3\.  Welke library past het beste bij de bestaande architectuur van AVE CRM?

4\.  Hoe kan de gekozen library geïntegreerd worden met minimale refactoring?
# **4. Onderzoeksmethode (Juiste Kennis Ontwikkelen)**
Net als bij het multi-tenancy onderzoek pas ik Design Science Research toe. Deze methode is geschikt omdat het gaat om het ontwikkelen van een werkend artefact (de nieuwe data fetching architectuur) en niet puur om theorievorming.

**De DSR cyclus:**

1\.  Probleemanalyse - Huidige situatie en tekortkomingen in kaart brengen

2\.  Ontwerp - Architectuur ontwerpen met gekozen library

3\.  Realisatie - Proof-of-concept implementeren

4\.  Evaluatie - Resultaat toetsen aan requirements

**DOT Framework strategieën die ik toepas:**

**•  Library:** Documentatie van TanStack Query, SWR en RTK Query bestuderen

**•  Field:** Requirements vanuit gebruikersperspectief (recruiters)

**•  Lab:** Proof-of-concept implementeren en testen

**•  Showroom:** Vergelijken met best practices in de React community

**•  Workshop:** Prototypen van de nieuwe hook architectuur
# **5. Library Vergelijking (Overzicht Creëren)**
**5.1 Kandidaten**

Op basis van populariteit, onderhoud en features heb ik de volgende libraries geselecteerd voor vergelijking:

**TanStack Query (v5):** De meest populaire server state library met 43k+ GitHub stars en ~13KB gzipped bundle size.

**SWR:** Van Vercel, bekend om zijn eenvoud met 30k+ stars en slechts ~4KB gzipped.

**RTK Query:** Onderdeel van Redux Toolkit, krachtig maar vereist Redux als dependency (~12KB gzipped).

**5.2 Feature Vergelijking**

Alle drie de libraries ondersteunen de basis features: caching, background refetch, window focus refetch, prefetching en retry logic. De belangrijkste verschillen zitten in:

**Mutations:** TanStack Query en RTK Query hebben ingebouwde mutation support met cache invalidation. Bij SWR moet je dit handmatig implementeren.

**DevTools:** TanStack Query heeft de beste DevTools voor het inspecteren van cache state. RTK Query werkt via de Redux DevTools. SWR heeft meer beperkte debugging tools.

**Optimistic Updates:** TanStack Query en RTK Query ondersteunen dit out-of-the-box. Bij SWR is handmatige implementatie nodig.
# **6. Kritische Evaluatie (Kritisch Oordelen)**
**6.1 TanStack Query**

**Voordelen:**

•  Meest complete feature set van alle opties

•  Uitstekende DevTools voor debugging

•  Actieve community en regelmatige updates

•  Ingebouwde mutation handling met automatische cache invalidation

•  Uitstekende TypeScript support met type inference

**Nadelen:**

•  Grotere bundle size dan SWR (~13KB vs ~4KB)

•  Steilere learning curve door meer concepten

•  Kan overkill zijn voor zeer simpele applicaties

**6.2 SWR**

**Voordelen:**

•  Kleinste bundle size (~4KB gzipped)

•  Simpele, intuïtieve API

•  Van Vercel, goed onderhouden

**Nadelen:**

•  Mutations moeten handmatig geïmplementeerd worden

•  Minder geavanceerde cache invalidation mogelijkheden

•  DevTools minder uitgebreid

**6.3 RTK Query**

**Voordelen:**

•  Krachtige cache invalidation met tags systeem

•  Goede integratie met Redux ecosystem

**Nadelen:**

•  Vereist Redux Toolkit als dependency

•  Overkill als je geen Redux nodig hebt

•  Meer boilerplate code nodig

**6.4 Gewogen Beoordeling**

Op basis van de requirements van AVE CRM heb ik de volgende gewogen beoordeling gemaakt:

•  Features (30%): TanStack Query scoort 10, SWR 7, RTK Query 9

•  Bundle Size (20%): TanStack Query scoort 7, SWR 10, RTK Query 6

•  Developer Experience (20%): TanStack Query scoort 8, SWR 9, RTK Query 6

•  TypeScript (15%): TanStack Query scoort 10, SWR 8, RTK Query 10

•  Community/Docs (15%): TanStack Query scoort 10, SWR 9, RTK Query 8

**Totaalscore:** TanStack Query 8.85, SWR 8.35, RTK Query 7.65
# **7. Advies (Software Adviseren)**
**7.1 Aanbeveling**

Ik adviseer **TanStack Query (v5)** voor de volgende redenen:

**1.  Complete oplossing:** Caching, mutations, invalidation en devtools zijn allemaal out-of-the-box beschikbaar. Dit bespaart veel custom code.

**2.  Schaalbaarheid:** De library groeit mee met de applicatie zonder dat architecturale wijzigingen nodig zijn.

**3.  Developer Experience:** De DevTools maken debugging veel eenvoudiger, wat de ontwikkeltijd verkort.

**4.  TypeScript:** Beste type inference van alle opties, wat past bij de TypeScript-first aanpak van AVE CRM.

**5.  Toekomstbestendig:** Actief onderhouden met een grote community, waardoor support gegarandeerd is.

**7.2 Risico's en Mitigatie**

**Learning curve:** Gefaseerde implementatie - begin met één hook als proof-of-concept voordat de rest wordt gemigreerd.

**Bundle size (+13KB):** Dit valt binnen de gestelde NFR-1 (max +15KB) en is acceptabel gezien de geboden functionaliteit.

**Breaking changes:** Wrapper hooks maken voor abstractie, zodat componenten niet direct afhankelijk zijn van de library API.

**7.3 Alternatief**

Als bundle size kritischer blijkt dan verwacht, adviseer ik SWR als tweede keuze. De ~4KB footprint is aantrekkelijk, maar de handmatige mutation handling voegt complexiteit toe die TanStack Query out-of-the-box oplost.
# **8. Architectuur Ontwerp (Software Ontwerpen)**
**8.1 Nieuwe Folder Structuur**

De nieuwe structuur scheidt queries en mutations in aparte folders voor overzichtelijkheid:

frontend/src/api/

├── client.ts              # Axios instance

├── queries/

│   ├── accounts.ts        # Account query hooks

│   ├── contacts.ts        # Contact query hooks

│   ├── users.ts           # User query hooks

│   └── keys.ts            # Query key factory

└── mutations/

`    `├── accounts.ts        # Account mutations

`    `├── contacts.ts        # Contact mutations

`    `└── users.ts           # User mutations

**8.2 Query Key Factory Pattern**

Een centrale plek voor alle query keys zorgt voor consistentie en maakt invalidation eenvoudiger. De keys zijn hiërarchisch opgebouwd zodat je zowel specifieke queries als groepen queries kunt invalideren.

**8.3 Provider Setup**

De QueryClient wordt geconfigureerd met standaard opties die passen bij de use case van AVE CRM:

•  staleTime: 5 minuten - Data blijft 5 minuten 'fresh' voordat background refetch plaatsvindt

•  gcTime: 30 minuten - Unused data blijft 30 minuten in cache

•  retry: 3 - Automatisch 3 keer opnieuw proberen bij falen

•  refetchOnWindowFocus: true - Data verversen bij terugkeer naar tabblad
# **9. Implementatieplan (Software Realiseren)**
**Fase 1: Setup & Infrastructuur**

•  TanStack Query en DevTools installeren

•  QueryProvider aanmaken en in App.tsx wrappen

•  Query key factory opzetten

•  Axios client verplaatsen naar api/client.ts

**Fase 2: Eerste Hook Migratie (Proof of Concept)**

•  useAccounts migreren als eerste hook

•  Bestaande hook behouden voor backward compatibility

•  Accounts pagina updaten om nieuwe hook te gebruiken

•  Testen en valideren dat caching werkt

**Fase 3: Mutations Implementeren**

•  Create, Update en Delete mutations voor accounts

•  Optimistic updates implementeren voor snelle UI feedback

•  Cache invalidation testen

**Fase 4: Overige Hooks Migreren**

•  useContacts migreren

•  useCandidates migreren

•  useUsers migreren

•  Alle pagina's updaten naar nieuwe hooks

**Fase 5: Cleanup & Documentatie**

•  Oude hooks verwijderen of deprecaten

•  Code documenteren

•  Performance meten en vergelijken met oude situatie

•  Onderzoeksdocument finaliseren
# **10. Evaluatiecriteria**
De implementatie wordt geëvalueerd op de volgende meetbare doelen:

**Bundle size:** Huidige ~150KB, doel < 165KB (max +15KB toename)

**Pagina navigatie (cached):** Huidige ~500ms, doel < 50ms

**Code duplicatie:** Huidige ~120 regels, doel < 50 regels

**API calls bij navigatie:** Huidig altijd, doel alleen bij stale data
# **11. Bronnen**
•  TanStack Query Documentatie: https://tanstack.com/query/latest

•  SWR Documentatie: https://swr.vercel.app/

•  RTK Query Documentatie: https://redux-toolkit.js.org/rtk-query/overview

•  Bundlephobia: https://bundlephobia.com/

•  ICT Research Methods: https://ictresearchmethods.nl/
# **12. Relatie met HBO-i Competenties**
**Productvaardigheden:**

**•  Overzicht Creëren:** Sectie 2 (probleemanalyse) en sectie 5 (library vergelijking)

**•  Juiste Kennis Ontwikkelen:** Sectie 4 (onderzoeksmethode) en bronnenonderzoek

**•  Kritisch Oordelen:** Sectie 6 (kritische evaluatie met gewogen scores)

**•  Kwalitatief Product:** Dit document plus de uiteindelijke implementatie

**Beroepstaken:**

**•  Software Analyseren:** Sectie 2 (huidige situatie, requirements, user stories)

**•  Software Adviseren:** Sectie 7 (advies met risico's en mitigatie)

**•  Software Ontwerpen:** Sectie 8 (architectuur, patterns, folder structuur)

**•  Software Realiseren:** Sectie 9 (implementatieplan) plus de daadwerkelijke code
