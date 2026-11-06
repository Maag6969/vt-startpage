# Turvaülevaatus (M2, 06.11.2026)

Tehtud käsitsi koodi lugemisega, sest `/security-review` vaatab ainult ootel muudatusi. Seis: commit `3e955e9`. Põhjus: POHIMOTTED.md C8
otsus, et M2 ülevaatus tehakse enne ühise mootori skeletti. **Tulemus: turvaauku (XSS, andmeleke, saladused) ei leitud; üks väike
töökindluse viga (leid 1) parandati samal päeval.**

## Leiud

| # | Raskus | Leid | Tõend | Parandus |
|---|---|---|---|---|
| 1 | madal | **Vigane `%` aadressis:** `parseHash` (`js/app.js:100`) kutsub `decodeURIComponent`'i ilma try/catch'ita. Aadress `#%E0%A4%A` annab käivitamisel `Uncaught URIError` ja sisupaneel jääb tühjaks (ka tühja olekut ei joonistata); hashchange'il erand, vaade ei uuene. Mõju ainult selle külastaja vaatele, XSS-i ega andmeleket pole. | Kontrollitud brauseris 06.11.2026 (`localhost:8080`): konsoolis `URIError: URI malformed at parseHash`, `#content` tühi, loend ja jalus joonistatud | **Parandatud 06.11.2026:** try/catch `parseHash`'is, vigane aadress jääb toorena ja kood on tundmatu (tühi olek). Kontrollitud brauseris: `#%E0%A4%A` ja `#%` annavad tühja oleku, `#ETU41?vanus=%E0%A4%A` avab aruande vaikevalikutega, vigu pole; regressioon 74/74 |
| 2 | info | **AI-aken ilma `noopener`'ita:** `window.open(url, "tai-ai-analysis", ...)` (`js/app.js:790-793`, `847`) jätab avatud aknale ligipääsu `window.opener`'ile. Sihtkohad on ainult `claude.ai`, `chatgpt.com`, `gemini.google.com` (`js/ai-prompt.js:18-20`), seega risk on teoreetiline. `noopener` lisamisel tagastaks `window.open` `null` ja teate akna fookuse loogika (`opened`) lakkaks töötamast. | Koodi lugemine, brauseris proovimata (AI-nuppe ei vajutatud, need avavad välise saidi) | Jäta; kirjas, et teadlik kompromiss |
| 3 | info | **CSP ja Referrer-Policy puuduvad; Roboto laeb Google'i serverist** (`index.html:16-18`). Teada punktid POHIMOTTED.md C1–C3. | `index.html` | Tuleb ühise mootori skeletiga, M2-sse alles kasutaja kinnitusel |
| 4 | info | **Abacus loendur on avalik:** igaüks saab `hit` päringuga numbreid suurendada, vaatamiste arvud pole usaldusväärne mõõdik. Lehe turvet see ei mõjuta. Võtmed koostatakse valideeritud väärtustest ja puhastatakse (`keyFilter`, `js/usage.js:67-73`). | Koodi lugemine | Jäta; arvesta numbrite tõlgendamisel |
| 5 | info | **`TAI.formatValue` lisab ühiku HTML-i ilma escape'ita** (`js/core.js:698-700`) ja `externalLink` ei kontrolli lingi skeemi (`js/core.js:673`). Praegu tuleb mõlemad alati koodis olevast konfiguratsioonist (ühik, URL), mitte andmetest, seega ohtu pole. | Koodi lugemine | Ühise mootori skeletis: escape'i ühik ja luba linkides ainult `https:` |

## Mis on kontrollitud ja korras
- **XSS:** kõik `innerHTML` kohad `js/app.js`-is (loend, staatusrida, veakast, filtrid, moodul, jalus) ja HTML-koostajad `js/module.js`-is
  (KPI, legend, andmetabelid, nii näitaja- kui üldmudel) panevad allikast tuleva teksti läbi `esc()` / `TAI.escapeHtml`. Tooltip kasutab
  `textContent`i, SVG-d tehakse `createElementNS` + `textContent`iga. Ainus `innerHTML` SVG-l on tühjendamine (`= ""`).
- **Üleslaaditud fail:** `JSON.parse` on try/catch'is, struktuur kontrollitakse, faili nimi on veateates ja meta-plaadil escape'itud.
- **Aadressi parameetrid:** `stateFromParams` võtab vastu ainult tabeli lubatud väärtusi; tundmatu kood jõuab `TAI.getTable`
  otsinguni ega mingi selektorisse.
- **Tervisekassa andmed:** `statusLine` escape'ib märke; varuskript `yldstat.js` laaditakse samast päritolust (`data/tervisekassa/`).
- **Sõltuvused:** ei npm-i ega kolmanda poole skripte; ainult Google Fonts stiilileht ja päringud andmeallikatele.
- **Saladused ja privaatsus:** ajaloo skann (41 commit'i) puhas (vt POHIMOTTED.md C6). Avalikus repos olevate `.xlsx` väljavõtete
  metaandmetes on looja ja viimane muutja „Power BI", isikuid ega failiteid pole.
- **Skripte ei käivitata andmetest:** `eval`, `new Function`, `document.write` puuduvad.

## Mida see ülevaatus ei katnud
- `js/module.js` SVG joonistusfunktsioonid ja arvutusloogika on loetud vaid sinkide otsinguga, mitte ridahaaval.
- `js/ai-prompt.js` juhise koostamist (kuidas andmesilte juhisesse pannakse) ei analüüsitud: API-st tulev tekst jõuab AI-le, kus
  see võiks teoreetiliselt proovida juhist mõjutada. Kasutaja kleebib juhise ise, midagi ei saadeta automaatselt.
- `scripts/*.ps1` ainult märksõnaotsinguga (võrgupäringuid, `Invoke-Expression`i ega `Start-Process`i ei leitud); ridahaaval lugemata.
- CSS, `tests/`, `tools/` (viimased kaks pole repos).
- Brauseris ei testitud muud kui leid 1; päris telefoni, SharePointi iframe'i ega HTTP-päiseid (GitHub Pages ei lase neid seadistada) ei kontrollitud.
