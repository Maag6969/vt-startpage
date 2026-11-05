<#
  Tervisekassa "Uldine statistika" väljavõtted (xlsx) -> JSON-failid kaustas data/tervisekassa/.
  Lähteülesanne ja reeglid: TERVISEKASSA.md.

  Käivitamine (M2 kaustas):
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/import-tervisekassa.ps1

  Mida skript teeb:
    1. Kontrollib, et täpselt need viis faili on olemas (vale või puuduv fail = viga).
    2. Loeb xlsx-i otse (xlsx on ZIP-fail XML-iga). Excelit ega lisapaigaldusi pole vaja.
    3. Võrdleb lahtri A1 filtreid failinimega ning kontrollib päist, ridu, aastaid ja vanuserühmi.
    4. Ümardab eurosummad kahe komakohani ja märgib iga väärtuse staatuse.
    5. Kirjutab detailread ja aasta koondid eraldi JSON-failidesse ning sama sisu ka failiks yldstat.js (varuks
       juhuks, kui leht avatakse failina). Sama sisend annab baidi täpsusega sama väljundi.

  Väärtuse staatus: olemas | null (tegelik 0) | puudub (tühi lahter) | varjatud (nt "<5").
  Staatus "toetamata" tuleb adapterist: sellist kombinatsiooni andmetes lihtsalt pole.
#>
[CmdletBinding()]
param(
  [string]$RawDir = "",
  [string]$OutDir = "",
  [string]$AllikaUuendus = "2026-11-01"   # aruandes nähtav uuenduskuupäev; xlsx-is seda pole
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

# Vaikimisi kaustad skripti asukoha järgi ($PSScriptRoot pole PowerShell 5.1 param-plokis alati täidetud)
if (-not $RawDir) { $RawDir = Join-Path $PSScriptRoot "..\data\tervisekassa\raw" }
if (-not $OutDir) { $OutDir = Join-Path $PSScriptRoot "..\data\tervisekassa" }

$INV = [Globalization.CultureInfo]::InvariantCulture

$ALLIKAVAADE = "Uldine statistika"
$POOLELI_AASTAD = @("2026")
$AASTAD = @("2021", "2022", "2023", "2024", "2025", "2026")
$VANUSERYHMAD = @("0-18", "19-24", "25-34", "35-64", "65+")
$DIAGNOOSID = [ordered]@{ F32F33 = @("F32", "F33"); F32 = @("F32"); F33 = @("F33") }
$SOOD = @("kokku", "mehed", "naised")
$TOETATUD = @("F32F33|kokku", "F32F33|mehed", "F32F33|naised", "F32|kokku", "F33|kokku")

# Tulba järjekord failis. tyyp: arv = täisarv >= 0, eur = ümardatakse 2 komakohani.
$NAITAJAD = @(
  @{ id = "isikud";                     nimi = "Isikud";                             yhik = "isikut";  tyyp = "arv" },
  @{ id = "arved";                      nimi = "Arved ehk ravijuhud";                yhik = "arvet";   tyyp = "arv" },
  @{ id = "arvete_summa";               nimi = "Arvete summa";                       yhik = "eurot";   tyyp = "eur" },
  @{ id = "retseptid";                  nimi = "Retseptid";                          yhik = "retsepti"; tyyp = "arv" },
  @{ id = "realiseeritud_retseptid";    nimi = "Realiseeritud retseptid";            yhik = "retsepti"; tyyp = "arv" },
  @{ id = "realiseeritud_kogusumma";    nimi = "Realiseeritud retseptide kogusumma"; yhik = "eurot";   tyyp = "eur" },
  @{ id = "tk_tasutud_summa_ilma_trmh"; nimi = "Realiseeritud retseptide Tervisekassa tasutud summa (ilma TRMH)"; yhik = "eurot"; tyyp = "eur" }
)
$PAIS = @("Aasta ja vanus", "Vanusegrupp") + @($NAITAJAD | ForEach-Object { $_.nimi })

function Stop-Import([string]$fail, [string]$sonum) { throw "VIGA ($fail): $sonum" }

# ---- xlsx lugemine --------------------------------------------------------

function Read-ZipXml($zip, [string]$entryName) {
  $entry = $zip.GetEntry($entryName)
  if (-not $entry) { return $null }
  $reader = New-Object IO.StreamReader($entry.Open(), [Text.Encoding]::UTF8)
  try { $text = $reader.ReadToEnd() } finally { $reader.Close() }
  $doc = New-Object Xml.XmlDocument
  $doc.PreserveWhitespace = $true
  $doc.LoadXml($text)
  return $doc
}

# Tagastab @{ reanumber = lahtrite tekstid järjekorras }. Eksportfailis lahtritel aadressi pole,
# seega loeb järjekord; tühjad lahtrid on failis olemas (<c></c>) ja nende arv kontrollitakse hiljem.
function Read-Sheet([string]$path, [string]$nimi) {
  $zip = [IO.Compression.ZipFile]::OpenRead($path)
  try {
    $wb = Read-ZipXml $zip "xl/workbook.xml"
    $lehed = @($wb.SelectNodes("//*[local-name()='sheet']"))
    if ($lehed.Count -ne 1 -or $lehed[0].GetAttribute("name") -ne "Sheet1") {
      Stop-Import $nimi "oodati ühte lehte nimega Sheet1"
    }
    $jagatud = @()
    $ss = Read-ZipXml $zip "xl/sharedStrings.xml"
    if ($ss) { $jagatud = @($ss.SelectNodes("//*[local-name()='si']") | ForEach-Object { $_.InnerText }) }

    $sheet = Read-ZipXml $zip "xl/worksheets/sheet1.xml"
    $read = @{}
    foreach ($rida in $sheet.SelectNodes("//*[local-name()='sheetData']/*[local-name()='row']")) {
      $lahtrid = New-Object System.Collections.Generic.List[string]
      foreach ($c in $rida.SelectNodes("*[local-name()='c']")) {
        $v = $c.SelectSingleNode("*[local-name()='v']")
        $tekst = if ($v) { $v.InnerText } else { "" }
        if ($c.GetAttribute("t") -eq "s") { $tekst = $jagatud[[int]$tekst] }
        $lahtrid.Add($tekst)
      }
      $read[[int]$rida.GetAttribute("r")] = $lahtrid.ToArray()
    }
    return $read
  } finally { $zip.Dispose() }
}

# ---- lahter A1 ------------------------------------------------------------

function Read-Filters([string]$a1, [string]$nimi) {
  $read = @(($a1 -replace "`r", "") -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  if ($read.Count -lt 3 -or $read[0] -ne "Applied filters:") { Stop-Import $nimi "lahter A1 ei alga filtrite loeteluga" }

  $vanusFilter = $false
  $sugu = "kokku"      # kui sugu pole nimetatud, tähendab see "Kõik"
  $nimed = @()
  foreach ($r in $read[1..($read.Count - 1)]) {
    if ($r -eq "Vanusegrupp is not (Blank)") { $vanusFilter = $true }
    elseif ($r -cmatch '^Diagnoos_grupp is (.+)$') { $nimed = @($Matches[1] -split ' or ' | ForEach-Object { $_.Trim() }) }
    elseif ($r -ceq "Sugu_uus is Mees") { $sugu = "mehed" }
    elseif ($r -ceq "Sugu_uus is Naine") { $sugu = "naised" }
    else { Stop-Import $nimi "lahtris A1 on ootamatu filter: '$r'" }
  }
  if (-not $vanusFilter) { Stop-Import $nimi "lahtris A1 puudub filter 'Vanusegrupp is not (Blank)'" }
  if (-not $nimed.Count) { Stop-Import $nimi "lahtris A1 puudub diagnoosifilter" }

  $diagnoosid = @($nimed | ForEach-Object {
    if ($_ -cnotmatch '^(F\d\d)\b') { Stop-Import $nimi "diagnoosi koodi ei leia: '$_'" }
    @{ kood = $Matches[1]; nimi = $_ }
  } | Sort-Object { $_.kood })

  return @{ diagnoosid = $diagnoosid; sugu = $sugu; read = $read[1..($read.Count - 1)] }
}

# ---- väärtused ------------------------------------------------------------

function Read-Value([string]$tekst, $naitaja, [string]$kontekst) {
  $t = $tekst.Trim()
  if ($t -eq "") { return @{ vaartus = $null; staatus = "puudub" } }
  if ($t -match '^(<|\*)') { return @{ vaartus = $null; staatus = "varjatud" } }

  $d = [decimal]0
  $stiil = [Globalization.NumberStyles]::Float
  if (-not [decimal]::TryParse($t, $stiil, $INV, [ref]$d)) { Stop-Import $kontekst "väärtus pole arv: '$tekst'" }

  if ($naitaja.tyyp -eq "eur") {
    $d = [Math]::Round($d, 2, [MidpointRounding]::AwayFromZero)
  } elseif ($d -lt 0 -or $d -ne [Math]::Truncate($d)) {
    Stop-Import $kontekst "$($naitaja.nimi) peab olema täisarv >= 0, leitud '$tekst'"
  }
  return @{ vaartus = $d; staatus = $(if ($d -eq 0) { "null" } else { "olemas" }) }
}

# ---- JSON (oma kirjutaja: stabiilne väljakord ja arvuvorming igal käivitusel) ----

function ConvertTo-Json1($v) {
  if ($null -eq $v) { return "null" }
  if ($v -is [string]) {
    return '"' + ($v -replace '\\', '\\' -replace '"', '\"' -replace "`n", '\n' -replace "`r", '') + '"'
  }
  if ($v -is [Collections.IDictionary]) {
    $osad = foreach ($k in $v.Keys) { (ConvertTo-Json1 ([string]$k)) + ":" + (ConvertTo-Json1 $v[$k]) }
    return "{" + ($osad -join ",") + "}"
  }
  if ($v -is [Collections.IEnumerable]) {
    $osad = foreach ($x in $v) { ConvertTo-Json1 $x }
    return "[" + ($osad -join ",") + "]"
  }
  if ($v -is [decimal]) { return $v.ToString("0.##", $INV) }
  return ([IFormattable]$v).ToString($null, $INV)
}

function Write-Utf8([string]$path, [string]$text) {
  [IO.File]::WriteAllText($path, $text, (New-Object Text.UTF8Encoding($false)))
}

function Format-Records($kirjed) {
  $read = foreach ($k in $kirjed) { ConvertTo-Json1 $k }
  return "[`n" + ($read -join ",`n") + "`n]`n"
}

# ---- failide leidmine ja kontroll -----------------------------------------

if (-not (Test-Path -LiteralPath $RawDir)) { throw "VIGA: kausta ei leitud: $RawDir" }
$failid = @{}
$valjavotteKuupaev = $null
foreach ($f in Get-ChildItem -LiteralPath $RawDir -Filter *.xlsx) {
  if ($f.Name -cnotmatch '^tk_yldstat_(F32F33|F32|F33)_sugu-(kokku|mehed|naised)_(\d{4}-\d{2}-\d{2})\.xlsx$') {
    Stop-Import $f.Name "failinimi ei vasta mustrile tk_yldstat_<diagnoos>_sugu-<sugu>_<kuupaev>.xlsx"
  }
  $voti = $Matches[1] + "|" + $Matches[2]
  if ($TOETATUD -notcontains $voti) { Stop-Import $f.Name "see diagnoosi ja soo kombinatsioon pole piloodis toetatud" }
  if ($failid.ContainsKey($voti)) { Stop-Import $f.Name "sama kombinatsiooni fail on kaustas mitu korda" }
  if ($valjavotteKuupaev -and $valjavotteKuupaev -ne $Matches[3]) { Stop-Import $f.Name "failide kuupäevad erinevad" }
  $valjavotteKuupaev = $Matches[3]
  $failid[$voti] = $f
}
$puudu = @($TOETATUD | Where-Object { -not $failid.ContainsKey($_) })
if ($puudu.Count) { throw "VIGA: sisendfail puudub: $($puudu -join ', ') (kaust $RawDir)" }

# ---- lugemine --------------------------------------------------------------

$detail = New-Object System.Collections.Generic.List[object]
$koond = New-Object System.Collections.Generic.List[object]
$diagnoosiNimed = @{}
$failiMeta = New-Object System.Collections.Generic.List[object]

foreach ($diagId in $DIAGNOOSID.Keys) {
  foreach ($sugu in $SOOD) {
    $voti = "$diagId|$sugu"
    if ($TOETATUD -notcontains $voti) { continue }
    $f = $failid[$voti]
    $sheet = Read-Sheet $f.FullName $f.Name

    # A1 peab ühtima failinimega
    if (-not $sheet.ContainsKey(1)) { Stop-Import $f.Name "lahter A1 puudub" }
    $filtrid = Read-Filters $sheet[1][0] $f.Name
    $koodid = @($filtrid.diagnoosid | ForEach-Object { $_.kood })
    if (($koodid -join ",") -cne ($DIAGNOOSID[$diagId] -join ",")) {
      Stop-Import $f.Name "A1 diagnoosid ($($koodid -join ', ')) ei ühti failinimega ($diagId)"
    }
    if ($filtrid.sugu -cne $sugu) { Stop-Import $f.Name "A1 sugu ($($filtrid.sugu)) ei ühti failinimega ($sugu)" }
    if (-not $diagnoosiNimed.ContainsKey($diagId)) { $diagnoosiNimed[$diagId] = @($filtrid.diagnoosid | ForEach-Object { $_.nimi }) }

    # päis ja read
    if (-not $sheet.ContainsKey(3) -or ($sheet[3] -join "|") -cne ($PAIS -join "|")) {
      Stop-Import $f.Name "rea 3 päis ei vasta oodatule"
    }
    $andmeRead = @($sheet.Keys | Where-Object { $_ -ge 4 })
    $oodatudRidu = $AASTAD.Count * $VANUSERYHMAD.Count
    if ($andmeRead.Count -ne $oodatudRidu) { Stop-Import $f.Name "oodati $oodatudRidu andmerida, leiti $($andmeRead.Count)" }

    $rida = @{}
    foreach ($nr in $andmeRead) {
      $cells = $sheet[$nr]
      if ($cells.Count -ne $PAIS.Count) { Stop-Import $f.Name "real $nr on $($cells.Count) lahtrit, oodati $($PAIS.Count)" }
      if ($AASTAD -notcontains $cells[0]) { Stop-Import $f.Name "real $nr on tundmatu aasta '$($cells[0])'" }
      if ($VANUSERYHMAD -notcontains $cells[1]) { Stop-Import $f.Name "real $nr on tundmatu vanuserühm '$($cells[1])'" }
      $k = $cells[0] + "|" + $cells[1]
      if ($rida.ContainsKey($k)) { Stop-Import $f.Name "korduv rida: $k" }
      $rida[$k] = $cells
    }

    $failiMeta.Add([ordered]@{ fail = $f.Name; diagnoos_id = $diagId; sugu = $sugu; a1_filtrid = @($filtrid.read) })

    # kirjed: järjekord tuleb nimekirjadest, mitte failist, et väljund oleks deterministlik
    foreach ($aasta in $AASTAD) {
      $staatusAasta = if ($POOLELI_AASTAD -contains $aasta) { "pooleli" } else { "taisaasta" }
      for ($n = 0; $n -lt $NAITAJAD.Count; $n++) {
        $naitaja = $NAITAJAD[$n]
        $summa = [decimal]0
        $koondStaatus = "olemas"
        foreach ($vanus in $VANUSERYHMAD) {
          $parsed = Read-Value $rida["$aasta|$vanus"][$n + 2] $naitaja "$($f.Name), $aasta $vanus"
          $detail.Add([ordered]@{
            tase = "detail"; aasta = $aasta; diagnoos_id = $diagId; diagnoosid = $DIAGNOOSID[$diagId]; sugu = $sugu
            vanuseryhm = $vanus; maakond = "ei kohaldu"; naitaja = $naitaja.id; vaartus = $parsed.vaartus; staatus = $parsed.staatus
            allikavaade = $ALLIKAVAADE; valjavotte_kuupaev = $valjavotteKuupaev; allika_uuendus = $AllikaUuendus; taisaasta_staatus = $staatusAasta
          })
          # Osalist summat ei tehta: kui mõni rühm puudub või on varjatud, pole ka koondit.
          if ($parsed.staatus -eq "puudub" -or $parsed.staatus -eq "varjatud") { $koondStaatus = $parsed.staatus }
          elseif ($koondStaatus -eq "olemas") { $summa += $parsed.vaartus }
        }
        $koondVaartus = if ($koondStaatus -eq "olemas") { $summa } else { $null }
        if ($koondStaatus -eq "olemas" -and $summa -eq 0) { $koondStaatus = "null" }
        $koond.Add([ordered]@{
          tase = "aasta_kokku"; aasta = $aasta; diagnoos_id = $diagId; diagnoosid = $DIAGNOOSID[$diagId]; sugu = $sugu
          vanuseryhm = "kokku"; maakond = "ei kohaldu"; naitaja = $naitaja.id; vaartus = $koondVaartus; staatus = $koondStaatus
          allikavaade = $ALLIKAVAADE; valjavotte_kuupaev = $valjavotteKuupaev; allika_uuendus = $AllikaUuendus; taisaasta_staatus = $staatusAasta
        })
      }
    }
  }
}

# ---- väljund ---------------------------------------------------------------

$diagMeta = foreach ($id in $DIAGNOOSID.Keys) { [ordered]@{ id = $id; koodid = $DIAGNOOSID[$id]; allika_nimed = $diagnoosiNimed[$id] } }
$naitajaMeta = foreach ($x in $NAITAJAD) { [ordered]@{ id = $x.id; nimi = $x.nimi; yhik = $x.yhik } }
$meta = [ordered]@{
  aruanne = "Vaimne tervis - retseptide ja arvete andmed"
  allikas_url = "https://tervisekassa.ee/vaimne-tervis-retseptide-ja-arvete-andmed"
  allikavaade = $ALLIKAVAADE
  valjavotte_kuupaev = $valjavotteKuupaev
  allika_uuendus = $AllikaUuendus
  aastad = $AASTAD
  pooleli_aastad = $POOLELI_AASTAD
  vanuseryhmad = $VANUSERYHMAD
  sood = $SOOD
  diagnoosivalikud = @($diagMeta)
  toetatud_kombinatsioonid = $TOETATUD
  naitajad = @($naitajaMeta)
  sisendfailid = $failiMeta.ToArray()
}

if (-not (Test-Path -LiteralPath $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
$detailJson = Format-Records $detail
$koondJson = Format-Records $koond
$metaJson = (ConvertTo-Json1 $meta) + "`n"
Write-Utf8 (Join-Path $OutDir "yldstat_detail.json") $detailJson
Write-Utf8 (Join-Path $OutDir "yldstat_koond.json") $koondJson
Write-Utf8 (Join-Path $OutDir "yldstat_meta.json") $metaJson

# Sama sisu tavalise skriptifailina. Brauser ei luba lehel, mis on avatud failina (file://), JSON-faile lugeda,
# aga <script> laadimine töötab. Leht kasutab seda ainult siis, kui JSON-ide lugemine ebaõnnestub.
$jsText = "/* Genereeritud: scripts/import-tervisekassa.ps1. Ära muuda käsitsi. Sama sisu mis yldstat_*.json failidel. */`n" +
  "window.TAI_TERVISEKASSA = {`n`"detail`": " + $detailJson.TrimEnd() + ",`n`"koond`": " + $koondJson.TrimEnd() +
  ",`n`"meta`": " + $metaJson.TrimEnd() + "`n};`n"
Write-Utf8 (Join-Path $OutDir "yldstat.js") $jsText

$staatused = $detail | Group-Object { $_.staatus } | Sort-Object Name | ForEach-Object { "$($_.Name)=$($_.Count)" }
Write-Host "Valmis: $($failid.Count) faili, $($detail.Count) detailkirjet, $($koond.Count) koondkirjet (staatused detailis: $($staatused -join ', '))"
