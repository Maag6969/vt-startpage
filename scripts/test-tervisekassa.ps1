<#
  Tervisekassa importskripti testid: kontrollarvud (TERVISEKASSA.md p. 2) ja reeglid (p. 3).
  Oodatud arvud on siia käsitsi kirjutatud allika vaatest ega tule importskriptist.

  Käivitamine (M2 kaustas, pärast importi):
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-tervisekassa.ps1

  NB: failides pole allika koondridu, seega "vanuserühmade summa = allika koond" saab kontrollida
  ainult siin kirjas olevate kontrollarvude vastu. Uue väljavõtte puhul tuleb need allikast uuesti võtta.
#>
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$import = Join-Path $PSScriptRoot "import-tervisekassa.ps1"
$dataDir = Join-Path $root "data\tervisekassa"
$rawDir = Join-Path $dataDir "raw"

$script:ok = 0
$script:vigu = 0
function Check([string]$nimi, [bool]$tingimus, [string]$info = "") {
  if ($tingimus) { $script:ok++; Write-Host "  OK    $nimi" }
  else { $script:vigu++; Write-Host "  VIGA  $nimi  $info" }
}
function Section([string]$t) { Write-Host ""; Write-Host $t }

function Read-Json([string]$path) {
  return [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8) | ConvertFrom-Json
}

$detail = Read-Json (Join-Path $dataDir "yldstat_detail.json")
$koond = Read-Json (Join-Path $dataDir "yldstat_koond.json")
$meta = Read-Json (Join-Path $dataDir "yldstat_meta.json")

$K = @{}; foreach ($r in $koond) { $K["$($r.diagnoos_id)|$($r.sugu)|$($r.aasta)|$($r.naitaja)"] = $r }
$D = @{}; foreach ($r in $detail) { $D["$($r.diagnoos_id)|$($r.sugu)|$($r.aasta)|$($r.vanuseryhm)|$($r.naitaja)"] = $r }

function Isikud([string]$diag, [string]$sugu, [string]$aasta) { return [decimal]$K["$diag|$sugu|$aasta|isikud"].vaartus }
function CheckIsikud([string]$diag, [string]$sugu, [string]$aasta, [decimal]$oodatud) {
  $v = Isikud $diag $sugu $aasta
  Check "$diag $sugu $aasta = $oodatud" ($v -eq $oodatud) "(leiti $v)"
}

Section "Kontrollarvud: F32+F33 kokku, sugu kokku"
$vanused = @{ "0-18" = 2570; "19-24" = 3760; "25-34" = 6661; "35-64" = 25904; "65+" = 14311 }
foreach ($v in "0-18", "19-24", "25-34", "35-64", "65+") {
  $leitud = [decimal]$D["F32F33|kokku|2021|$v|isikud"].vaartus
  Check "F32F33 kokku 2021 $v = $($vanused[$v])" ($leitud -eq $vanused[$v]) "(leiti $leitud)"
}
CheckIsikud F32F33 kokku 2021 53206
CheckIsikud F32F33 kokku 2022 55048
CheckIsikud F32F33 kokku 2025 61819
$arved = [decimal]$K["F32F33|kokku|2021|arved"].vaartus
Check "F32F33 kokku 2021 arved = 110430" ($arved -eq 110430) "(leiti $arved)"

Section "Kontrollarvud: naised ja mehed"
CheckIsikud F32F33 naised 2021 38165
CheckIsikud F32F33 naised 2022 39541
CheckIsikud F32F33 naised 2025 43384
CheckIsikud F32F33 naised 2026 42727
CheckIsikud F32F33 mehed 2021 15041
CheckIsikud F32F33 mehed 2022 15507
CheckIsikud F32F33 mehed 2025 18435
CheckIsikud F32F33 mehed 2026 17951
foreach ($a in $meta.aastad) {
  $m = Isikud F32F33 mehed $a; $n = Isikud F32F33 naised $a; $s = Isikud F32F33 kokku $a
  Check "Mehed + Naised = Kokku, $a ($m + $n = $s)" (($m + $n) -eq $s)
}

Section "Kontrollarvud: F32 ja F33 eraldi"
CheckIsikud F32 kokku 2021 39608
CheckIsikud F32 kokku 2022 40885
CheckIsikud F32 kokku 2025 46694
CheckIsikud F33 kokku 2021 17031
CheckIsikud F33 kokku 2022 17503
CheckIsikud F33 kokku 2025 18734

Section "Kattuvus: ühine valik ei ole F32 + F33 summa"
foreach ($t in @(@("2021", 56639, 53206), @("2025", 65428, 61819))) {
  $sum = (Isikud F32 kokku $t[0]) + (Isikud F33 kokku $t[0])
  $yhine = Isikud F32F33 kokku $t[0]
  Check "$($t[0]) F32 + F33 = $($t[1])" ($sum -eq $t[1]) "(leiti $sum)"
  Check "$($t[0]) ühine valik = $($t[2]), mitte summa" ($yhine -eq $t[2] -and $yhine -ne $sum) "(leiti $yhine)"
}

Section "Andmete kuju"
Check "detailkirjeid 5 faili x 30 rida x 7 näitajat = 1050" ($detail.Count -eq 1050) "(leiti $($detail.Count))"
Check "koondkirjeid 5 faili x 6 aastat x 7 näitajat = 210" ($koond.Count -eq 210) "(leiti $($koond.Count))"
Check "detailis pole koondridu" (@($detail | Where-Object { $_.vanuseryhm -eq "kokku" -or $_.tase -ne "detail" }).Count -eq 0)
Check "koondis pole vanuserühma ridu" (@($koond | Where-Object { $_.vanuseryhm -ne "kokku" -or $_.tase -ne "aasta_kokku" }).Count -eq 0)
Check "toetamata kombinatsiooni (F32 mehed, F33 naised) andmetes pole" (@($detail + $koond | Where-Object { $_.diagnoos_id -ne "F32F33" -and $_.sugu -ne "kokku" }).Count -eq 0)
$vead = @($detail + $koond | Where-Object {
  $_.maakond -ne "ei kohaldu" -or $_.allikavaade -ne "Uldine statistika" -or $_.valjavotte_kuupaev -ne "2026-11-05" -or $_.allika_uuendus -ne "2026-11-01"
})
Check "igal kirjel maakond, allikavaade ja kuupäevad õiged" ($vead.Count -eq 0) "($($vead.Count) viga)"
$vead = @($detail + $koond | Where-Object { ($_.aasta -eq "2026") -ne ($_.taisaasta_staatus -eq "pooleli") })
Check "2026 on pooleli, teised täisaastad" ($vead.Count -eq 0) "($($vead.Count) viga)"
Check "F32F33 kirjel on diagnooside hulk F32 ja F33" ((@($K["F32F33|kokku|2021|isikud"].diagnoosid) -join ",") -eq "F32,F33")

Section "Eurode ümardamine ja koondi arvutus"
Check "2221577.68000011 -> 2221577.68" ([decimal]$D["F32F33|kokku|2021|0-18|arvete_summa"].vaartus -eq 2221577.68)
$liigsed = @($detail + $koond | Where-Object { $_.vaartus -ne $null -and ([decimal]$_.vaartus * 100) -ne [Math]::Truncate([decimal]$_.vaartus * 100) })
Check "ühelgi väärtusel pole üle 2 komakoha" ($liigsed.Count -eq 0) "($($liigsed.Count) viga)"
$valed = 0
foreach ($r in $koond) {
  $s = [decimal]0
  foreach ($v in $meta.vanuseryhmad) { $s += [decimal]$D["$($r.diagnoos_id)|$($r.sugu)|$($r.aasta)|$v|$($r.naitaja)"].vaartus }
  if ($s -ne [decimal]$r.vaartus) { $valed++ }
}
Check "iga koond = vanuserühmade summa (210 koondit)" ($valed -eq 0) "($valed viga)"

Section "Realiseerimise osakaal (rakendub ainult 2026 märkusele, kasutajaliideses seda ei kuvata)"
function Osakaal([string]$a) { return 100 * [decimal]$K["F32F33|kokku|$a|realiseeritud_retseptid"].vaartus / [decimal]$K["F32F33|kokku|$a|retseptid"].vaartus }
$o25 = [Math]::Round((Osakaal "2025"), 1); $o26 = [Math]::Round((Osakaal "2026"), 1)
Check "2025 on ~86% ($o25%)" ($o25 -ge 85 -and $o25 -le 87)
Check "2026 on ~75% ($o26%)" ($o26 -ge 74 -and $o26 -le 76)

# ---- importskripti käitumine: töö ajutises kaustas, M2 faile ei muudeta --------

$tmp = Join-Path ([IO.Path]::GetTempPath()) ("tk-test-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null

function New-RawCopy([string]$nimi) {
  $d = Join-Path $tmp $nimi
  New-Item -ItemType Directory -Path $d | Out-Null
  Get-ChildItem -LiteralPath $rawDir -Filter *.xlsx | Copy-Item -Destination $d
  return $d
}
function Invoke-Import([string]$raw, [string]$out) {
  try { & $import -RawDir $raw -OutDir $out *> $null; return "" }
  catch { return $_.Exception.Message }
}
function Edit-Cell([string]$xlsx, [string]$vana, [string]$uus) {
  $zip = [IO.Compression.ZipFile]::Open($xlsx, [IO.Compression.ZipArchiveMode]::Update)
  try {
    $e = $zip.GetEntry("xl/worksheets/sheet1.xml")
    $r = New-Object IO.StreamReader($e.Open(), [Text.Encoding]::UTF8); $t = $r.ReadToEnd(); $r.Close()
    if (-not $t.Contains($vana)) { throw "testi viga: '$vana' puudub failist" }
    $e.Delete()
    $n = $zip.CreateEntry("xl/worksheets/sheet1.xml")
    $w = New-Object IO.StreamWriter($n.Open(), (New-Object Text.UTF8Encoding($false))); $w.Write($t.Replace($vana, $uus)); $w.Close()
  } finally { $zip.Dispose() }
}

try {
  Section "Deterministlikkus: kaks käivitust annavad baidi täpsusega sama tulemuse"
  $o1 = Join-Path $tmp "valjund1"; $o2 = Join-Path $tmp "valjund2"
  $v1 = Invoke-Import $rawDir $o1; $v2 = Invoke-Import $rawDir $o2
  Check "import õnnestus kaks korda" ($v1 -eq "" -and $v2 -eq "") "$v1 $v2"
  foreach ($f in "yldstat_detail.json", "yldstat_koond.json", "yldstat_meta.json", "yldstat.js") {
    $h1 = (Get-FileHash (Join-Path $o1 $f)).Hash; $h2 = (Get-FileHash (Join-Path $o2 $f)).Hash
    $h0 = (Get-FileHash (Join-Path $dataDir $f)).Hash
    Check "$f on identne (ka kaustas data/tervisekassa olevaga)" ($h1 -eq $h2 -and $h1 -eq $h0)
  }

  Section "yldstat.js (varuks failina avamisel) sisaldab täpselt JSON-failide sisu"
  $js = [IO.File]::ReadAllText((Join-Path $dataDir "yldstat.js"), [Text.Encoding]::UTF8)
  foreach ($nimi in "detail", "koond", "meta") {
    $tekst = [IO.File]::ReadAllText((Join-Path $dataDir "yldstat_$nimi.json"), [Text.Encoding]::UTF8).TrimEnd()
    Check "yldstat.js sisaldab faili yldstat_$nimi.json sisu" ($js.Contains($tekst))
  }
  Check "yldstat.js omistab ühe globaalmuutuja window.TAI_TERVISEKASSA" ($js -match '(?m)^window\.TAI_TERVISEKASSA = \{')

  Section "Vigased sisendid peatavad impordi"
  $d = New-RawCopy "puudub"
  Remove-Item (Join-Path $d "tk_yldstat_F33_sugu-kokku_2026-11-05.xlsx")
  $v = Invoke-Import $d (Join-Path $tmp "o")
  Check "puuduv fail annab veateate" ($v -match "sisendfail puudub") $v

  $d = New-RawCopy "vale-a1"
  $a = Join-Path $d "tk_yldstat_F32_sugu-kokku_2026-11-05.xlsx"; $b = Join-Path $d "tk_yldstat_F33_sugu-kokku_2026-11-05.xlsx"
  Remove-Item $a; Copy-Item $b $a
  $v = Invoke-Import $d (Join-Path $tmp "o")
  Check "F33 sisu F32 nime all: A1 ei ühti failinimega" ($v -match "ei ühti failinimega") $v

  $d = New-RawCopy "vale-sugu"
  $a = Join-Path $d "tk_yldstat_F32F33_sugu-mehed_2026-11-05.xlsx"; $b = Join-Path $d "tk_yldstat_F32F33_sugu-naised_2026-11-05.xlsx"
  Remove-Item $a; Copy-Item $b $a
  $v = Invoke-Import $d (Join-Path $tmp "o")
  Check "naiste sisu meeste nime all: A1 ei ühti failinimega" ($v -match "ei ühti failinimega") $v

  $d = New-RawCopy "tundmatu"
  Copy-Item (Join-Path $d "tk_yldstat_F32_sugu-kokku_2026-11-05.xlsx") (Join-Path $d "tk_yldstat_F32_sugu-mehed_2026-11-05.xlsx")
  $v = Invoke-Import $d (Join-Path $tmp "o")
  Check "toetamata kombinatsiooni fail (F32 mehed) lükatakse tagasi" ($v -match "pole piloodis toetatud") $v

  Section "Null, puuduv ja varjatud eristuvad"
  $xlsx = "tk_yldstat_F32F33_sugu-kokku_2026-11-05.xlsx"
  $proov = @(
    @{ nimi = "tühi lahter"; asendus = "<v></v>"; staatus = "puudub"; vaartus = $null; koond = "puudub"; koondVaartus = $null },
    @{ nimi = "tekst <5"; asendus = "<v>&lt;5</v>"; staatus = "varjatud"; vaartus = $null; koond = "varjatud"; koondVaartus = $null },
    @{ nimi = "tegelik 0"; asendus = "<v>0</v>"; staatus = "null"; vaartus = 0; koond = "olemas"; koondVaartus = 50636 }
  )
  foreach ($p in $proov) {
    $d = New-RawCopy ("staatus-" + [Guid]::NewGuid().ToString("N"))
    Edit-Cell (Join-Path $d $xlsx) "<v>2570</v>" $p.asendus
    $o = Join-Path $tmp ("o-" + [Guid]::NewGuid().ToString("N"))
    $v = Invoke-Import $d $o
    if ($v) { Check "$($p.nimi): import õnnestub" $false $v; continue }
    $r = (Read-Json (Join-Path $o "yldstat_detail.json")) | Where-Object { $_.diagnoos_id -eq "F32F33" -and $_.sugu -eq "kokku" -and $_.aasta -eq "2021" -and $_.vanuseryhm -eq "0-18" -and $_.naitaja -eq "isikud" }
    $q = (Read-Json (Join-Path $o "yldstat_koond.json")) | Where-Object { $_.diagnoos_id -eq "F32F33" -and $_.sugu -eq "kokku" -and $_.aasta -eq "2021" -and $_.naitaja -eq "isikud" }
    Check "$($p.nimi): staatus '$($p.staatus)'" ($r.staatus -eq $p.staatus -and $r.vaartus -eq $p.vaartus) "(leiti $($r.staatus)/$($r.vaartus))"
    Check "$($p.nimi): koond '$($p.koond)' = $($p.koondVaartus)" ($q.staatus -eq $p.koond -and $q.vaartus -eq $p.koondVaartus) "(leiti $($q.staatus)/$($q.vaartus))"
  }
} finally {
  Remove-Item -LiteralPath $tmp -Recurse -Force
}

Write-Host ""
Write-Host "KOKKU: $($script:ok) läbis, $($script:vigu) ebaõnnestus"
if ($script:vigu -gt 0) { exit 1 }
