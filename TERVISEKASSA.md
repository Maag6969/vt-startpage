# Tervisekassa allikarühm (II etapp) — lähteülesanne, reeglid ja ülesanded

Selle faili sisu on koostatud claude.ai vestluses (05.11.2026) ja on mõeldud repo juurde. Kui TASKS.md,
README.md ja disain.md on repos olemas, tuleb nende vastavad lõigud (README: "Andmeallikad II etapp", TASKS:
sektsioon 9, disain: p. 5 rida ja p. 7) lisada sinna, mitte kopeerida siia. Kuni see pole tehtud, on SEE fail
Tervisekassa piloodi tõe allikas.

## 1. Eesmärk ja arhitektuur

Lisa näidikulauale allikarühm **Tervisekassa**: aruanne "Vaimne tervis — retseptide ja arvete andmed"
(https://tervisekassa.ee/vaimne-tervis-retseptide-ja-arvete-andmed, Power BI). Eesmärk on täiendada juba
kuvatavaid vaimse tervise indikaatoreid (nt TAI depressiooni sümptomid) raviandmete vaatega.

- Aruandel pole kinnitatud avalikku API-d ega püsivat otseühendust. Andmed saadakse Power BI Exceli ekspordiga
  ("Underlying data" on aruande autori poolt keelatud).
- **Arhitektuur:** väljavõtted (xlsx) -> importskript -> valmis JSON-failid samas repos
  (`data/tervisekassa/`) -> moodul laeb need samast päritolust. Live-fetchi Tervisekassa Power BI-sse ei
  tehta; lehe avamine ei päri Tervisekassat. Kõrvalmõju: CORS-i probleemi pole.
- Vasaku paneeli Tervisekassa ridadel on nupu silt "Ava aruanne" (mitte "API").
- **Iga aruanne on iseseisev:** oma filtrid, klassifikaatorid, vaikevalikud ja metoodika. Ühine on ainult
  tehniline raam ja esitusstruktuur. Aruannete vahel filtreid ei ühtlustata ega kanta üle.

Kavandatud aruanded (prioriteedi järjekorras): 1. Diagnoosid raviandmetes (**piloot: F32/F33**);
2. Maakondade võrdlus; 3. Retseptid ja realiseerimine; 4. Raviarvete ja retseptide kulud; 5. Esmased
diagnoosikirjed; hiljem enesekahjustamisega seotud raviandmed. Piloodis tehakse AINULT aruanne 1.

## 2. Sisendfailid (data/tervisekassa/raw/)

Power BI "Summarized data" xlsx-eksport vaatest "Uldine statistika", allika uuendus 1.11.2026, eksporditud
05.11.2026. Viis faili: `tk_yldstat_F32F33_sugu-kokku_2026-11-05.xlsx`, `..._sugu-mehed_...`,
`..._sugu-naised_...`, `tk_yldstat_F32_sugu-kokku_2026-11-05.xlsx`, `tk_yldstat_F33_sugu-kokku_2026-11-05.xlsx`.

**Struktuur (kontrollitud, kõigil sama):**
- Üks leht "Sheet1". Lahter A1 = filtrite kirjeldus, nt "Applied filters: Vanusegrupp is not (Blank) /
  Diagnoos_grupp is F33 ... or F32 ... / Sugu_uus is Naine". Loetletud on ainult aktiivsed filtrid; kui sugu
  pole nimetatud, tähendab see "Kõik". `Vanusegrupp is not (Blank)` on alati peal ja jätab välja "Vanus
  teadmata" isikud (aruandes see kategooria on).
- Rida 3 = päis: Aasta ja vanus | Vanusegrupp | Isikud | Arved ehk ravijuhud | Arvete summa | Retseptid |
  Realiseeritud retseptid | Realiseeritud retseptide kogusumma | Realiseeritud retseptide Tervisekassa tasutud
  summa (ilma TRMH). Andmed algavad reast 4: 30 rida (aastad 2021–2026 × vanusegrupid 0-18, 19-24, 25-34,
  35-64, 65+). Aasta on tekst. Koondridu failis EI OLE.
- Eurosummades on ujukomamüra (nt 2221577.68000011): ümarda 2 komakohani.

**Kontrollarvud (testideks; peavad klappima enne UI ehitamist), isikud:**
- F32+F33 kokku, sugu kokku, 2021 vanuserühmiti: 2570, 3760, 6661, 25904, 14311 = 53206. 2022 kokku 55048.
  2025 kokku 61819. 2021 arved kokku 110430.
- Naised: 2021 38165, 2022 39541, 2025 43384, 2026 42727. Mehed: 2021 15041, 2022 15507, 2025 18435,
  2026 17951. Mehed + Naised = Kokku igal aastal.
- F32 üksi: 2021 39608, 2022 40885, 2025 46694. F33 üksi: 2021 17031, 2022 17503, 2025 18734.
- **Kattuvus (põhijuhtum):** 2021 F32 + F33 = 56639, aga ühine valik 53206. 2025: 46694 + 18734 = 65428,
  aga ühine valik 61819. Ühise valiku väärtus tuleb alati ühisfailist, mitte summast.

## 3. Arvutus- ja tõlgendusreeglid (kohustuslikud)

1. Vanuserühmi võib ühe aasta sees liita (vanus 31.12 seisuga; kontrollitud, et summa = allika koond).
   Aastaid ega diagnoose liita ei tohi, ka mitte "perioodi kordumatuteks isikuteks".
2. Sugu: Mehed + Naised = Kokku on kontrollitud, aga iga väärtus tuleb oma failist. Ära tuleta Mehed/Naised
   lahutamisega (alla 5 väärtused võivad olla varjatud).
3. Toetatud diagnoosivalikud: F32F33 (ühine), F32, F33. Kõik muu -> "Selle kombinatsiooni koondandmed
   puuduvad", mitte liidetud hinnang. Diagnoosirühmi ei esitata osakaaludena ühisest 100%-st (kattuvad).
4. Määrasid (100 000 elaniku kohta) ei arvutata: rahvaarvu nimetajad (Statistikaamet RV0240) pole kinnitatud.
   Kuva ainult isikute arv ja selle muutus.
5. 2026 on pooleli: märgista pooleliolevana, ära kasuta vaikimisi täisaastana. Vaikeaasta 2025, võrdlusaasta
   2024, trend 2021–2025. 2026 retseptide realiseerimise osakaal ~75% vs 2025 ~86% (viivituse märk), seega
   realiseerimise osakaalu 2026 ei võrrelda täisaastatega.
6. Eralda null, puuduv, varjatud ja toetamata kombinatsioon (väärtuse staatus JSON-is).
7. Callouti tekstid kirjeldavad numbreid, mitte halvenemist: kasv võib peegeldada abi otsimist, teenuste
   kasutust või kodeerimist; see ei ole levimus ega ravimata inimeste osakaal. Retsepti arv != ravimeid saanud
   inimeste arv; arvete arv != visiitide arv. Arved lähevad aastasse arve lõpetamise järgi, retseptid
   väljakirjutamise järgi.
8. Sümptomiprotsendi (nt TAI 2019) ja raviandmete määra lahutamist "ravimata inimeste" leidmiseks ei tehta.

## 4. Disaini erisused (lisa disain.md p. 5 tabelisse)

Tervisekassa "Diagnoosid raviandmetes": peagraafik aastatrend + soo- või vanuserühmade võrdlus. Avavaade:
F32/F33, Eesti, sugu kokku; viimane kinnitatud täisaasta vs eelmine. Põhinäitaja: isikute arv ja muutus (määr
alles pärast nimetaja kinnitust). 2026 märgistatud pooleliolevana. Üks võrdlustunnus korraga (sugu VÕI vanus).
Vanuserühmade piire ei muudeta (0-18 ei ole 0-17). Ristviited teistesse aruannetesse avavad sihtaruande tema
enda vaikevalikutega, filtreid ei kanta üle.

## 5. Ülesanded (piloot)

- [x] Piloodiväljavõtted tehtud (5 faili, kõik aastad × vanuserühmad ühes failis).
- [x] Kontrollarvud kinnitatud (vt p. 2).
- [x] Importskript xlsx -> JSON (`scripts/`): loeb xlsx-id, parsib A1 filtri (kontrollib vastavust failinimega),
      valideerib ridu/aastaid/vanuserühmi, ümardab eurod, deterministlik. Kirje väljad: aasta, diagnooside
      hulk + identifikaator (F32F33/F32/F33), sugu, vanuserühm, maakond ("ei kohaldu"), näitaja, väärtus,
      väärtuse staatus, allikavaade, väljavõtte kuupäev (2026-11-05), allika uuendus (2026-11-01),
      täisaasta staatus. Aasta kokku = vanuserühmade summa, eraldi koondtasemena.
- [x] Testid kontrollarvudele (p. 2); näita tulemust kasutajale enne UI ehitamist.
- [x] Adapter (`js/tables/` või repo tegelik muster): väärtus täpse filtrivõtme järgi; toetamata -> teade.
- [x] Moodul "Diagnoosid raviandmetes": filtrid diagnoos (F32F33/F32/F33), sugu (Kokku/Mehed/Naised/Mehed vrdl
      naised), vanuserühm (kokku + 5), vaatlus- ja võrdlusaasta; KPI, trend, vanuserühmade võrdlus, callout,
      tabel (details), jalus allika ja metoodikaga; master-lehel allikarühm "Tervisekassa", nupp "Ava aruanne".
- [x] Kontroll brauseris: filtrid uuendavad kõike kooskõlaliselt; kattuvuse näide õige; 2026 märgistatud;
      toetamata kombinatsioon -> teade; aruande filtrid ei sega teisi.
- [x] Uuenda TASKS.md. Ära tee commit/push/avalda enne kasutaja kinnitust. (Tehtud 05.11.2026; commit ja avaldamine ootavad.)

Piloodist väljas: maakonnad, retseptide/kulude/esmaste aruanded, rahvaarvud ja määrad, enesekahjustamise
vaade, andmepäring Tervisekassale (kasutaja teeb ise; küsimused allpool).

## 6. Tervisekassa andmepäring (kasutaja saadab: tervisekassa.ee/andmeparingud)

Küsimused: regulaarne CSV/JSON/Exceli väljastus või päringuliides (soo, vanus, maakond, diagnoosirühm)?
Kordumatute isikute koondid mitme diagnoosi/aasta valikul? Esmasuse tagasivaate pikkus ja kas esmaseid saab
maakonniti? Maakonna ajalooline tähendus (viimane rahvastikuregistri sissekirjutus vs aasta elukoht)?
Hõlmatud populatsioon ja soovitatud nimetaja? Retseptide kohordi/loendusühiku loogika? Andmete lõppkuupäev,
täisaasta staatus, tagantjärele parandamise reegel? Kuluväljad ja TRMH välistus? Väikeste väärtuste
avaldamis- ja allikaviite tingimused?

## 7. Eksporditöö õppetunnid (Power BI)

- Eksport: tabeli menüü (...) -> Export data -> "Summarized data" -> .xlsx. Brauser nimetab failid data.xlsx
  jne; nimeta kohe mustri `tk_<vaade>_<diagnoos>_sugu-<kokku|mehed|naised>_<kuupaev>.xlsx` järgi.
- Filtrid uuenevad 2–3 sekundiga; kiire topeltklõps lülitab märke tagasi. Ekspordidialoogi vaikevalik on
  "Data with current layout": kontrolli enne vajutamist, et "Summarized data" on valitud, ja et ekraanil
  olevad arvud ühtivad kontrollarvudega.
- Diagnoosifilter on hierarhiline; vaatel "Uldine statistika" on aruandes ka "Vanus teadmata", mis ekspordist
  välja filtreeritakse (A1: `Vanusegrupp is not (Blank)`).
- Allikas on Power BI-s sisse ehitatud märkus: graafikutel puuduvad tulbad, mille väärtus on < 5. TRMH =
  täiendav ravimi- ja meditsiiniseadmehüvitis.
