#!/usr/bin/env node
/**
 * Export backlog ureninschatting naar Excel (.xlsx)
 * Alleen Backlog + Doing (geen Testing)
 * Run: node scripts/export-backlog-to-excel.mjs
 */
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const data = [
  // Backlog spoed (21 items)
  ['Backlog spoed', 1, 'Klant > bij salesdoel: meerdere afdelingen kunnen aanklikken tegelijk + category', '4-6', 4, 6, 'Het systeem moet zo worden aangepast dat je meerdere afdelingen tegelijk kunt selecteren in plaats van één. Dat vraagt aanpassingen op verschillende plekken.'],
  ['Backlog spoed', 2, 'Homepagina -> dashboard ontwikkelen (interim opdrachten, lopende opdrachten, etc.)', '16-24', 16, 24, 'Er wordt een compleet nieuw overzichtsscherm gebouwd met verschillende blokken (interim opdrachten, lopende opdrachten, etc.). Alles moet nieuw worden opgezet en aan elkaar gekoppeld.'],
  ['Backlog spoed', 3, 'Netwerk > kolom uurtarief ZZP, jaarsalaris, emolumenten (zie opdracht bewerken)', '4-6', 4, 6, 'Er moeten nieuwe velden worden toegevoegd (uurtarief, salaris, etc.), bestaande gegevens moeten worden overgezet, en het moet kloppen met wat je bij opdrachten invult.'],
  ['Backlog spoed', 4, 'Klant > nieuw account labels: pet toevoegen', '1-2', 1, 2, 'Eén extra keuzemogelijkheid toevoegen aan een bestaande lijst. Klein karweitje.'],
  ['Backlog spoed', 5, 'Klanten: Moederbedrijf-niveau, per klant koppelbaar', '6-8', 6, 8, 'Het systeem moet bedrijven aan elkaar kunnen koppelen (moeder-dochter). Dat vraagt een nieuwe structuur en aanpassingen op meerdere schermen.'],
  ['Backlog spoed', 6, 'Netwerk > contact bewerken: koppeling welke bedrijven, kolom naar gekoppeld bedrijf', '4-6', 4, 6, 'Je moet kunnen zien en bewerken bij welke bedrijven een contact hoort. Er moet een nieuwe kolom komen en de koppelingen moeten op verschillende plekken worden getoond.'],
  ['Backlog spoed', 7, 'Opdracht > min/max werkuren per week', '2-3', 2, 3, 'Twee extra invoervelden met controle dat ze kloppen. Beperkt werk.'],
  ['Backlog spoed', 8, 'Opdracht > upload rolprofiel PDF/Word, AI-samenvatting in omschrijving', '8-12', 8, 12, 'Je moet een PDF of Word kunnen uploaden, het systeem leest de tekst, stuurt die naar een slim programma dat een samenvatting maakt, en zet die in de omschrijving. Meerdere stappen die aan elkaar gekoppeld moeten worden.'],
  ['Backlog spoed', 9, 'Opdracht > bonusregeling in emolumenten (percentage of maanden)', '4-6', 4, 6, 'De salaris/emolumenten-sectie moet worden uitgebreid met bonusregelingen (percentage of maanden). Er moet logica voor berekeningen komen.'],
  ['Backlog spoed', 10, 'Opdracht > info-balk: startdatum, invoerdatum, totaal fee, voor fee', '4-6', 4, 6, 'Vier extra velden op de opdrachtpagina: startdatum, invoerdatum, totaal fee, voor fee. Plus de layout van de balk aanpassen.'],
  ['Backlog spoed', 11, 'Netwerk > oude bedrijven en functies invoeren', '6-8', 6, 8, 'Het systeem moet werkervaring kunnen bijhouden: waar iemand heeft gewerkt, wanneer, en bij welk bedrijf. Nieuwe velden, schermen en mogelijke overzet van bestaande data.'],
  ['Backlog spoed', 12, 'Netwerk: beschikbaarheidsdatum alleen voor interim', '2-3', 2, 3, 'Het veld "beschikbaar vanaf" mag alleen getoond worden voor interim-kandidaten, niet voor vaste plaatsingen. Beperkte aanpassing.'],
  ['Backlog spoed', 13, 'Klanten > gekoppelde opdrachten aanklikscherm (events, kandidatenlijst met aantallen)', '6-8', 6, 8, 'Er moet een pop-upvenster komen waar je opdrachten, events en kandidaten van een klant ziet, met aantallen. Meerdere tabbladen en koppelingen.'],
  ['Backlog spoed', 14, 'Opdrachten > kunnen verwijderen', '2-3', 2, 3, 'Een knop om opdrachten te verwijderen, met bevestiging. Het systeem moet ook controleren of er geen gekoppelde gegevens meer zijn.'],
  ['Backlog spoed', 15, 'Status aan klant toevoegen (met kleurtje)', '3-4', 3, 4, 'Een nieuw statusveld (bijv. actief, inactief) met een kleur per status, zichtbaar in overzichten en filters.'],
  ['Backlog spoed', 16, 'Klanten: afbeelding toevoegen makkelijker', '2-4', 2, 4, 'De huidige manier van logo\'s/foto\'s uploaden verbeteren zodat het sneller en intuïtiever wordt.'],
  ['Backlog spoed', 17, 'Klanten: 2 afbeeldingen (holding + bedrijf)', '4-6', 4, 6, 'Bij holdings moet je zowel het holding-logo als het bedrijfslogo kunnen tonen. Het systeem moet meerdere afbeeldingen per klant ondersteunen.'],
  ['Backlog spoed', 18, 'Limiet plaats kandidaat: alleen woonplaats', '2-3', 2, 3, 'Het veld "plaats" mag alleen een woonplaats zijn, geen vrije tekst. Validatie toevoegen.'],
  ['Backlog spoed', 19, 'Klant > contactpersoon doorklikken naar meer info', '2-3', 2, 3, 'Als je op een contactpersoon klikt, moet je direct naar de contactgegevens gaan. Klein aanpassinkje.'],
  ['Backlog spoed', 20, 'Heeft gewerkt bij filter', '4-6', 4, 6, 'Een filter om kandidaten te vinden die bij een bepaald bedrijf hebben gewerkt. Het systeem moet door werkervaring kunnen zoeken.'],
  ['Backlog spoed', 21, 'Klant > salesdoel', '2-4', 2, 4, 'Nieuwe velden om salesdoelen per klant bij te houden. Afhankelijk van hoeveel velden en keuzes er komen.'],
  // Backlog midden (14 items)
  ['Backlog midden', 1, 'Instelling – overzicht en notificatie', '4-8', 4, 8, 'Eerst moet worden bepaald hoe het scherm eruitziet en welke notificaties waar komen. Daarna de bouw.'],
  ['Backlog midden', 2, 'Agenda – meerdere personen uitnodigen voor afspraak', '6-8', 6, 8, 'Je moet meerdere mensen kunnen uitnodigen voor één afspraak. Er moet een selectie- en koppelfunctie komen.'],
  ['Backlog midden', 3, 'Opdrachten > aanklikbaar ipv snelkoppeling ernaast', '2-3', 2, 3, 'De opdrachtnaam moet zelf aanklikbaar zijn en je naar de opdracht brengen, in plaats van een apart icoon ernaast.'],
  ['Backlog midden', 4, 'Opdracht > direct naar opdracht vanuit klanten (geen scrollen)', '2-3', 2, 3, 'Vanuit het klantoverzicht direct naar een specifieke opdracht gaan, zonder te moeten zoeken of scrollen.'],
  ['Backlog midden', 5, 'Hugo email: hugo@aveconsult.nl fixen', '0,5-1', 0.5, 1, 'Eenmalig een e-mailadres aanpassen. Vrijwel direct klaar.'],
  ['Backlog midden', 6, 'Netwerk/Klanten: persoon als contactpersoon + afdeling', '4-6', 4, 6, 'Als iemand in het netwerk zit, moet die automatisch als contactpersoon bij een klant kunnen verschijnen, met afdelingsaanduiding. Koppeling tussen twee delen van het systeem.'],
  ['Backlog midden', 7, 'Notificaties bij statusveranderingen klanten/opdrachten, monitor', '12-16', 12, 16, 'Het systeem moet zelf meldingen sturen zodra iets verandert (bijv. status klant of opdracht). Daarvoor moet een heel notificatiesysteem worden opgezet, met voorkeuren per gebruiker.'],
  ['Backlog midden', 8, 'Netwerk > na x maanden rappel CV-houdbaarheid AVG', '6-8', 6, 8, 'Het systeem moet automatisch onthouden wanneer een CV is geüpload en na X maanden een herinnering sturen om te controleren of het nog mag. Regelmatige controles en e-mails.'],
  ['Backlog midden', 9, 'Agenda: Outlook koppelen en toevoegen in CRM', '16-24', 16, 24, 'Afspraken uit Outlook moeten in het CRM verschijnen en omgekeerd. Microsoft geeft hiervoor beperkt toegang; er moet veilig worden ingelogd en gesynchroniseerd. Complexe koppeling.'],
  ['Backlog midden', 10, 'Nieuwe CRM-gebruiker > e-mailverificatie bij aanmelding', '4-6', 4, 6, 'Bij aanmelding moet een bevestigingsmail worden gestuurd en moet de gebruiker eerst op een link klikken. Het inlogproces moet hiervoor worden uitgebreid.'],
  ['Backlog midden', 11, 'LinkedIn browser-extensie: profiel opslaan → Gemini → netwerk + koppeling', '24-40', 24, 40, 'Een extra programmaatje in de browser om LinkedIn-profielen op te slaan. Het profiel gaat naar een AI die de gegevens uitleest, die komen in het netwerk en worden aan een opdracht gekoppeld. Veel onderdelen die samen moeten werken.'],
  ['Backlog midden', 12, 'Export alle Peoplematch-velden naar Excel', '6-10', 6, 10, 'Alle velden uit Peoplematch moeten naar Excel kunnen. Er moet een exportfunctie komen die alle kolommen goed mapt en formateert.'],
  ['Backlog midden', 13, 'Opdracht on-hold > wekelijkse notificatie in agenda', '4-6', 4, 6, 'Het systeem moet elke week een herinnering in de agenda zetten voor opdrachten die on-hold staan. Automatische taak + koppeling met agenda.'],
  ['Backlog midden', 14, 'Netwerk > NAW verrijken vanuit LinkedIn', '8-12', 8, 12, 'Met één knop gegevens van LinkedIn ophalen en in het contact invullen (naam, adres, etc.). Er moet worden gekoppeld aan LinkedIn, bestaande contacten worden gematcht, en de weergave moet kloppen.'],
  // Doing (3 items)
  ['Doing', 1, 'Dropdowns, multi-select modulair maken', '8-12', 8, 12, 'Overal waar je uit een lijst kiest (dropdowns) of meerdere opties selecteert, moet hetzelfde type keuzevak komen. Dat moet één keer goed worden ontworpen en overal worden toegepast.'],
  ['Doing', 2, 'CRM momenten lijst', '4-8', 4, 8, 'Een lijst met "CRM-momenten" (wat dat precies is moet nog worden uitgewerkt). De uren hangen af van de definitie.'],
  ['Doing', 3, 'Risicoanalyse maken linkedin importer', '4-8', 4, 8, 'Een analyse maken van de risico\'s van de LinkedIn-importfunctie, met documentatie en eventuele aanpassingen om risico\'s te beperken.'],
];

const headers = ['Categorie', '#', 'Item', 'Uren', 'Uren min', 'Uren max', 'Waarom'];
const sheetData = [headers, ...data];

const ws = XLSX.utils.aoa_to_sheet(sheetData);
ws['!cols'] = [
  { wch: 18 },
  { wch: 4 },
  { wch: 70 },
  { wch: 10 },
  { wch: 10 },
  { wch: 10 },
  { wch: 85 },
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Backlog ureninschatting');

const summaryData = [
  ['Samenvatting (Backlog + Doing, geen Testing)'],
  [],
  ['Categorie', 'Aantal items', 'Uren min', 'Uren max'],
  ['Backlog spoed', 21, 95, 140],
  ['Backlog midden', 14, 94, 153],
  ['Doing', 3, 16, 28],
  [],
  ['Totaal', '38', '~205', '~321'],
  [],
  ['Met buffer 20%', '', '~246', '~385'],
];
const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
ws2['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }];
XLSX.utils.book_append_sheet(wb, ws2, 'Samenvatting');

const outPath = path.join(ROOT, 'BACKLOG_URENINSCHATTING.xlsx');
XLSX.writeFile(wb, outPath);
console.log('Excel bestand aangemaakt:', outPath);
