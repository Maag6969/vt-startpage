# AI-analüüsi nupud: metoodika

Kinnitatud 05.11.2026, kasutaja intervjuu vastuste põhjal. Alus: M3 juhis (`js/ai-prompt.js`) ja M3 kokkuvõte
(`M2-SOOVITUSED-M3-parandustest.md`, osa D). Teostus: `js/ai-prompt.js` (juhis) ja `js/app.js` (nupud). Kasutaja otsused on p. 9.

## 1. Eesmärk ja sihtgrupp

- **Kes kasutab:** avalikkus ja kolleegid.
- **Mida saab:** ühe klõpsuga loetava analüüsi just sellest lõikest, mis on ekraanil: mida numbrid näitavad, mida nad ei näita, võimalikud
  selgitused koos selge märkega, et need on oletused, ning soovitused.
- **Mida see ei ole:** meditsiiniline nõuanne, ametlik tõlgendus ega uus andmeallikas. Analüüsi kirjutab kasutaja valitud AI teenus, mitte näidikulaud.

## 2. Mudel ja tehniline põhimõte

**Lehel ei ole oma AI-mudelit ega API-kutset.** Nupp koostab teksti, kopeerib selle lõikelauale ja avab teenuse (Claude, ChatGPT või Gemini) külastaja enda
kontol. Analüüsi teeb see mudel, mis külastajal seal parajasti valitud on; leht seda valida ega näha ei saa ja vestlusest midagi ei tea.

- **Miks nii:** API-kutse läheks omaniku võtme ja kulu arvele, mis rikub projekti põhimõtet „ei mingeid isiklikke võtmeid lahenduses“ (README.md).
- **Mis sellest järeldub:** juhis peab töötama iga mudeliga, ka tasuta versioonidega. Reeglid kirjutatakse otse teksti ja need peavad olema üheselt mõistetavad.
- **Klõpsu järjekord (lõksud M3-st):** kopeeri (`execCommand`, enne akna avamist) → ava aken → näita teadet. Kui kopeerimine ei õnnestu, tekib
  kirjutuskaitstud tekstikast käsitsi kopeerimiseks.

## 3. Mida juhis sisaldab

Juhis loeb **ekraanil juba nähtava** aruande, nii et AI näeb samu arve, mida kasutaja: pealkiri, kirjeldus, allikas ja link, andmete seis (staatusrida), valitud
lõige, KPI-d, automaatne kokkuvõte, kõik andmetabelid, märkused (trendimärkus, allikakirjeldus) ja jalus. Peidetud `<details>` tabelid on kaasas.

M2 selektorid: `.kpi__label`, `.kpi__value`, `.kpi__delta`, `.kpi__note`, `.kpi__reference`, `.kpi__slice`, `.kpi-block__slice`, `.callout`, `.data-table`,
`.chart-note--after`, `.module__status`, `.module__footnotes p`.

## 4. Analüüsi struktuur (ühine)

1. **Lühikirjeldus:** mida näitaja mõõdab ja milline lõige on valitud.
2. **Trend või muutus:** suund, murdepunktid, erinevused rühmade vahel. Iga trendiväite juures andmepunktide arv; 1–2 punkti põhjal „esialgne märk“, mitte trend.
3. **Seosed ja võimalikud selgitused:** iga väide märgitud „andmetest tulenev“ või „oletus“. Keelatud väljendid: „kindlasti“, „ilmselt“, „suure tõenäosusega“.
4. **Soovitused:** (a) sisulised sammud ja küsimused, (b) mida andmestik võiks lisaks sisaldada. Ettevaatlik sõnastus. Lehe filtreid AI ei soovita (kasutaja otsus).
5. **Rahvusvaheline võrdlus:** ainult viide võimalikule võrdlusallikale, **välisallikast numbreid ei tooda**, lingid puhtal kujul, linke ei leiutata.
6. **Piirangud:** valim, ajavahemik, metoodika. Lõpus märge „See ei ole meditsiiniline nõuanne.“ ja üks rida: kui lugejal endal on mure, tasub pöörduda perearsti või vaimse tervise spetsialisti poole (ilma telefoninumbriteta, p. 9.3).

## 5. Reeglid allikate kaupa

Juhis koosneb ühisest osast, allika profiilist (`js/ai-prompt.js`, aruandes `ai: { profile: "etu" | "tervisekassa" | "eurostat" }`) ja aruande enda märkustest (`ai.notes`). Aastate märkused (üks aasta, lüngad, pooleli aasta) arvutatakse `config.years` ja `config.provisionalYears` põhjal, nii et uus aasta ei vaja juhise muutmist. **Ilma `ai` väljata aruandel nuppe ei näidata:** uue allika reeglid tuleb enne läbi mõelda.

| | TAI ETU41–43 (küsitlus) | Tervisekassa (raviandmed) | Eurostat ilc_pw01 (küsitlus) |
|---|---|---|---|
| **Roll** | vaimse tervise andmeanalüütik | tervishoiu raviandmete analüütik | heaolu statistika analüütik |
| **Mida number on** | küsitluses hinnatud sümptomite osakaal, mitte diagnoos | isikute arv arvete ja retseptide andmetes, mitte levimus | hinnang skaalal 0–10 |
| **Osa 3 selgitused** | võimalikud põhjused oletusena | ainult abi otsimine, teenuste kasutus ja kodeerimine; kliinilisi väiteid ei tehta | võimalikud põhjused oletusena |
| **Osa 4(a) soovitused** | sammud ja küsimused | ainult küsimused andmeomanikule ja edasiseks uurimiseks | sammud ja küsimused |
| **Osa 5** | viide | viide, võrreldavust ei väideta | riikide arvud on lehel olemas ja neid võib kasutada; muud riigid ainult viitena |
| **Eriline** | ETU43: üks aasta, trendi ega muutust ei analüüsita. ETU42: 2006/2014 vanuserühmad 16+, 2019 15+ | vt p. 6 | 7 mõõtmist, aastad ei ole järjestikused (2013, 2018, 2021–2025) |

## 6. Keelud

**Tervisekassa (kohustuslik, TERVISEKASSA.md p. 3):** isikute arvu muutust ei nimetata halvenemiseks ega paranemiseks; see ei ole levimus ega ravimata inimeste osakaal; diagnoose ja
aastaid ei liideta (kattuvad isikud), ka mitte „perioodi isikuteks“; pooleliolev aasta ei ole täisaasta; retseptide arv ei ole ravimeid saanud inimeste arv, arvete arv ei ole
visiitide arv; määrasid ei arvutata; sümptomite protsendist ei lahutata raviandmeid „ravimata inimeste“ leidmiseks.

**Kõigile allikatele (kasutaja kinnitas, p. 9.1):**
1. Ei anna meditsiinilist ega isiklikku nõu ega hinda ühegi inimese tervist.
2. Ei too väljast numbreid ega arvuta näitajaid, mida lehel pole (nt levimus, määr, inimeste arv).
3. Ei liida kattuvaid rühmi ega võrdle eri allikate numbreid, nagu mõõdaksid need sama asja.
4. Ei esita põhjust faktina.
5. Ei tee rühmade kohta üldistavaid ega häbimärgistavaid väiteid (nt rahvus, haridus, sugu): erinevus on andmete kirjeldus, mitte rühma omadus.
6. Ei järjesta riike ega maakondi hinnanguliselt („parim“, „halvim“); võib öelda „kõrgeim“, „madalaim“.

**Sõnad „paranenud“ ja „halvenenud“ (kasutaja kinnitas, p. 9.1):** Tervisekassa: keelatud. ETU: lubatud ainult kujul „näitaja järgi“ (sümptomite osakaalu kasv on näitaja järgi ebasoodne), mitte „inimeste
vaimne tervis halvenes“. Eurostat: sama kujul („rahulolu näitaja paranes“).

## 7. Paigutus ja välimus (kasutaja: sama nagu M3)

Aruande ülemine rida: vasakul staatusrida, paremal silt **„Analüüsi kuvatud andmeid AI-ga:“** ja nupud **Claude, ChatGPT, Gemini**: väikesed (0,78 rem), täielikult ümarad otsad. Nupud on abitegevus, mitte põhinupud. Teade
ujuva aknana (Chrome/Edge) või alanurgas: „Näidikulaua andmed on kopeeritud lõikelauale. Vajuta AI vestlusaknas Ctrl+V, et sisestada need analüüsiks, ja seejärel Enter.“ Printimisel peidetud.
Nupu värv: vt p. 9.2. Telefonivaade: etapp 7.

Lõikes, kus lehel numbreid ei ole (nt Tervisekassa F33 + sugu), on nupud välja lülitatud, sest AI-l poleks midagi analüüsida ja ta võiks hakata numbreid ise pakkuma. Filtri muutmisel kaob vana teade, sest lõikelaual on siis eelmise lõike andmed.

Loendurid: `a-<KOOD>-ai-claude`, `a-<KOOD>-ai-chatgpt`, `a-<KOOD>-ai-gemini` (ainult klõpside arv, juhise sisu ega vestlust ei salvestata).

Eraldi andmekaitse märget ei lisata (kasutaja: avalikud andmed, asutuse reeglid ei piira).

## 8. Testimine

- **Kolleegid proovivad** päris teenustega (kasutaja: lähitulevikus). Automaattestides nuppe ei klõpsata (avaksid välise saidi); testid kontrollivad juhise sisu ja kopeerimist `window.open` asendusega.
- **Kontrollnimekiri igale vastusele:** (1) kõik numbrid on lehelt, (2) väljamõeldud numbreid ega linke pole, (3) oletused on märgitud, (4) p. 6 keelatud väited puuduvad, (5) andmepunktide arv on nimetatud,
  (6) Tervisekassa: halvenemist ega levimust ei väideta, kattuvust arvestatakse.
- **Kohustuslik testijuhtum:** Tervisekassa F32 + F33, sest see on kõige tõenäolisem koht, kus mudel teeb keelatud järelduse. Lisaks ETU41 ja ilc_pw01.
- Ühtegi päris AI-vastust ei ole M2 juhisega veel proovitud. M3-s prooviti Gemini ja ChatGPT, kuid ainult ühe teemaga ning Claude'iga mitte.

## 9. Kasutaja otsused (05.11.2026)

1. **Keelud:** p. 6 ühised keelud ja sõnade „paranenud/halvenenud“ reegel on kinnitatud.
2. **Nupu värv:** sama asukoht ja suurus nagu M3-s, aga tumesinine taust `#181E54` valge kirjaga (kontrast ~15:1). M3 valge kiri keskmisel sinisel `#4B7DFF` (~3,7:1) ei vasta disain.md nõudele väikese kirja puhul (see lubab sellist kombinatsiooni ainult ≥ 19 px kirjaga).
3. **Abi viide:** AI lisab analüüsi lõppu ühe rea, et kui lugejal endal on mure, tasub pöörduda perearsti või vaimse tervise spetsialisti poole. Telefoninumbreid ei lisata.
