# Implementatieplan: AI-Gestuurde Bulk CV Import (Gemini 3 Pro)

Dit document beschrijft de technische implementatie voor het volledig automatisch importeren van 3500+ CV's in het AVE CRM. Hierbij wordt gebruik gemaakt van **Google Gemini 3 Pro** voor het extraheren van kandidaatgegevens.

## 1. Architectuur Overzicht

Het proces wordt asynchroon opgezet om timeouts te voorkomen en de limieten van de server te respecteren.

1.  **Frontend (React):** Een "Smart Uploader" die bestanden in batches (bijv. 5 tegelijk) naar de server stuurt om `post_max_size` limieten te omzeilen.
2.  **Backend (Laravel):** Een controller ontvangt de bestanden en plaatst ze in een tijdelijke map. Vervolgens wordt voor elk bestand een `ProcessCvImport` Job op de queue gezet.
3.  **Queue Worker:** Verwerkt de CV's één voor één op de achtergrond.
4.  **AI Service (Gemini 3 Pro):**
    *   Extraheert tekst uit PDF/Word.
    *   Stuurt tekst naar **Gemini 3 Pro**.
    *   Ontvangt gestructureerde JSON data (Voornaam, Achternaam, Functie, etc.).
5.  **Data Persistance:**
    *   Maakt `Contact` aan in database.
    *   Uploadt bestand naar Cloudflare R2 (`{tenant}/contacts/{uid}/{filename}`).
    *   Koppelt bestand aan contact.

---

## 2. Technische Stappenplan

### Stap 1: Voorbereiding & Dependencies

*   **PHP Packages installeren:**
    *   `smalot/pdfparser`: Voor het lezen van PDF's.
    *   `phpoffice/phpword`: Voor het lezen van .docx bestanden.
    *   `google-gemini-php/client` (of via Guzzle HTTP requests naar de Gemini API).

*   **Configuratie:**
    *   `.env` bijwerken met `GEMINI_API_KEY` en `GEMINI_MODEL=gemini-3.0-pro-001` (of de specifieke model string voor 3 Pro).
    *   `php.ini` controleren: `upload_max_filesize` en `post_max_size` (staat nu op 20M/25M, dit is krap voor batches, vandaar de frontend chunking strategie).

### Stap 2: Backend Implementatie

#### A. Service: `CvParsingService`
Deze service is verantwoordelijk voor de interactie met het bestand en de AI.
*   **Functie `extractText(string $path)`:** Haalt platte tekst uit PDF of Word.
*   **Functie `parseWithGemini(string $text)`:** Stuurt de tekst naar Gemini 3 Pro met een specifieke prompt:
    > "Extract the following fields from this CV in JSON format: first_name, last_name, email, phone, city, education (MBO/HBO/UNI), current_role, skills..."

#### B. Job: `ProcessCvImport`
Deze Job wordt gedispatcht voor elk geüpload bestand.
*   **Input:** Pad naar tijdelijk bestand, Tenant ID, User ID (uploader).
*   **Logica:**
    1.  Roep `CvParsingService` aan.
    2.  Maak `Contact` aan met de JSON data.
    3.  Gebruik bestaande `FileStorageService` om bestand van *temp* naar *R2* te verplaatsen (`uploadContactDocument`).
    4.  Verwijder tijdelijk bestand.
    5.  (Optioneel) Stuur notificatie bij falen.

#### C. Controller: `ContactController@smartBulkImport`
*   Accepteert `request->file('files')[]`.
*   Loopt door de bestanden, slaat ze tijdelijk op (`storage/app/temp/imports/{uniqid}`).
*   Dispatch `ProcessCvImport` voor elk bestand.
*   Return: "X bestanden in de wachtrij geplaatst".

### Stap 3: Frontend Implementatie

#### Component: `SmartBulkImportDialog`
*   Vervangt de huidige dummy-implementatie.
*   **Drag & Drop Zone:** Voor het selecteren van honderden bestanden tegelijk.
*   **Batching Logic:**
    *   De browser heeft honderden bestanden in memory.
    *   Verstuurt ze in batches van 5 of 10 naar de API om onder de 25MB limiet te blijven.
    *   Toont een voortgangsbalk (bijv. "Verwerken: 45/3500").
*   **Foutafhandeling:** Houdt bij welke bestanden mislukt zijn.

---

## 3. Kosten & Performance Schatten

### Performance
*   **Gemini Latency:** ~2-5 seconden per CV (Gemini 3 Pro is zeer snel).
*   **Queue Verwerking:** Met 1 worker: ~10 CV's per minuut -> ~600 per uur.
    *   *3500 CV's duurt ongeveer 6 uur.*
    *   Oplossing: Start tijdelijk 5 queue workers (`php artisan queue:work` x5) om dit terug te brengen naar ~1 uur.

### Kosten (Gemini 3 Pro)
*   Gemini 3 Pro is het 'flagship' model. De kosten liggen hoger dan Flash, maar lager dan de voorgaande Ultra modellen.
*   **Schatting:** Voor 3500 CV's zal de totale kostprijs waarschijnlijk tussen de €10 en €30 liggen, afhankelijk van de lengte van de CV's. Dit is een verwaarloosbaar bedrag voor de waarde van de data-import.

---

## 4. Actiepunten voor Developer

1.  [ ] `composer require smalot/pdfparser phpoffice/phpword` uitvoeren.
2.  [ ] `CvParsingService` aanmaken in Laravel met Gemini 3 Pro integratie.
3.  [ ] `ProcessCvImport` Job aanmaken.
4.  [ ] Nieuwe API endpoint `/api/v1/contacts/smart-import` maken.
5.  [ ] Frontend `SmartBulkImportDialog` bouwen met batching logica.
6.  [ ] Testen met 10 CV's.
