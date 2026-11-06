/*
 * Mooduli sisu: andmemudel, KPI-kaardid, automaatne callout, graafikud ja andmetabel.
 * Kujundusotsused: disain.md p. 3.1 ja p. 4. Sõltub core.js-ist.
 */
(function (TAI) {
  "use strict";

  var esc = TAI.escapeHtml;
  var fmt = TAI.formatPct;
  var SVG_NS = "http://www.w3.org/2000/svg";

  var COLORS = {
    series1: "var(--series-1)",
    series2: "var(--series-2)",
    selected: "var(--som-tumesinine)",
    bar: "var(--som-keskmine-sinine)"
  };

  /*
   * 17.09.2026: kaks paralleelset andmemudelit. Vana (allpool, "Indicator" sufiksiga) eeldab
   * binaarset config.indicator = { var, positive } (nt ETU tabelid: Depressioon jah/ei → osakaal).
   * Uus, üldine ("General" sufiksiga, vt allpool pärast SVG abi) töötab suvalise config.seriesVar
   * väärtusteljega (nt hindamisskaala, riik) — ei eelda binaarsust. Avalikud TAI.buildModel jt
   * funktsioonid dispatch'ivad config.seriesVar olemasolu järgi. ETU41-43 (config.indicator,
   * ilma seriesVar-ita) jäävad vana teed kasutama — see fail neid ei muuda.
   */

  // ---- andmemudel (vana, indicator-põhine) ---------------------------

  /** Seeriad olekust: soo võrdlusel mehed + naised, muu võrdlusel iga rühm (valitud soo piires), muidu valitud sugu. */
  function seriesOfIndicator(config, state) {
    if (state.compareSexes) {
      return [
        { code: "1", label: "Mehed", kes: "meeste", color: COLORS.series1 },
        { code: "2", label: "Naised", kes: "naiste", color: COLORS.series2 }
      ];
    }
    var code = state.Sugu || "0";
    var kes = code === "1" ? "meeste" : code === "2" ? "naiste" : "inimeste";
    var cmp = TAI.activeComparison(config, state);
    if (cmp) {
      return cmp.values.map(function (val, i) {
        return { code: code, cmpVar: cmp.filter, cmpCode: val, label: TAI.labelOf(config, cmp.filter, val), kes: kes, color: cmp.colors[i] };
      });
    }
    return [{ code: code, label: TAI.labelOf(config, "Sugu", code), kes: kes, color: COLORS.series1 }];
  }

  /**
   * Täielik valik lugeja jaoks: kõik filtrimuutujad (koondkategooria "0", kui valimata).
   * Lugeja ignoreerib võtmeid, mida vastuses pole — nii sobib sama valik nii API vastusele
   * kui ka üleslaaditud täistabelile.
   */
  function baseSelectionIndicator(config, state, s, year) {
    var sel = {};
    sel[config.yearVar] = year;
    Object.keys(config.vars).forEach(function (code) {
      if (code === config.yearVar || code === config.indicator.var) return;
      var v = config.vars[code];
      if (v.totalValue == null) return;
      sel[code] = state[code] != null ? state[code] : v.totalValue;
    });
    sel.Sugu = s.code;
    if (s.cmpVar) sel[s.cmpVar] = s.cmpCode;
    return sel;
  }

  function buildModelIndicator(config, data, state) {
    var series = seriesOfIndicator(config, state);
    var years = config.years;
    var latest = years[years.length - 1];
    // eelmine mõõtmine ainult siis, kui tabelil on trend (ühe aasta tabelile, nt ETU43, lisandunud uus aasta ei tekita
    // „Muutust ei saa arvutada“ märget)
    var prev = years.length > 1 && config.views.trend ? years[years.length - 2] : null;

    function share(reader, sel) { return reader ? TAI.indicatorShare(reader, config, sel) : null; }

    var trend = null;
    if (config.views.trend && data.trend) {
      trend = series.map(function (s) {
        return Object.assign({}, s, {
          points: years.map(function (y) {
            return { year: y, value: share(data.trend, baseSelectionIndicator(config, state, s, y)) };
          })
        });
      });
    }

    // KPI-d: trendist, kui see on olemas; muidu jaotuse koondväärtusest
    var kpis = series.map(function (s, i) {
      var value, delta = null;
      if (trend) {
        var pts = trend[i].points;
        value = pts[pts.length - 1].value;
        if (prev) delta = TAI.delta(value, pts[pts.length - 2].value);
      } else {
        var sel = baseSelectionIndicator(config, state, s, latest);
        if (config.views.breakdown) sel[config.views.breakdown.var] = config.vars[config.views.breakdown.var].totalValue;
        value = share(data.breakdown, sel);
      }
      return { label: s.label, color: s.color, year: latest, prevYear: prev, value: value, delta: delta };
    });

    /*
     * Kinnitatud kasutajaga 18.09.2026: KPI-silt näitab juba valitud Sugu-t (label ülal), aga
     * ETU tabelitel on peale Sugu ka teine filter (nt Vanuserühm) — kui see erineb vaikeväärtusest,
     * peab silt seda märkima, muidu jätab kaart mulje, et arv käib kogu populatsiooni, mitte
     * kitsama vanuserühma kohta (vt ka populationSuffix, mida kasutab callout sama eesmärgiga).
     * NB: eraldi cardLabel, mitte label ise — callout (allpool) kasutab sedasama k.label
     * "top kategooria" lauses ning ei tohi saada lisandit "valitud lõige" kaasa.
     */
    var narrowedIndicator = !!populationSuffix(config, state);
    kpis.forEach(function (k) { k.cardLabel = k.label + (narrowedIndicator ? ", valitud lõige" : ""); });

    var breakdown = null;
    // Rühmade võrdlusel (v.a sugu) tulpa ei näidata: see võrdleks sama asja mis jooned või tuleks rea kohta liiga palju tulpi
    var bd = series[0].cmpVar ? null : config.views.breakdown;
    if (bd && data.breakdown) {
      var bVar = config.vars[bd.var];
      var groups = bd.groups || [{
        label: null,
        values: bVar.values.filter(function (v) { return v !== bVar.totalValue; })
      }];
      var valueFor = function (s, code) {
        var sel = baseSelectionIndicator(config, state, s, latest);
        sel[bd.var] = code;
        return share(data.breakdown, sel);
      };
      breakdown = {
        title: bd.title,
        inPhrase: bd.inPhrase,
        varCode: bd.var,
        year: latest,
        selected: state[bd.var] != null && state[bd.var] !== bVar.totalValue ? state[bd.var] : null,
        series: series,
        totals: series.map(function (s) { return valueFor(s, bVar.totalValue); }),
        groups: groups.map(function (g) {
          return {
            label: g.label,
            items: g.values.map(function (code) {
              return {
                code: code,
                label: TAI.labelOf(config, bd.var, code),
                values: series.map(function (s) { return valueFor(s, code); })
              };
            })
          };
        })
      };
    }

    return { config: config, state: state, series: series, latest: latest, prev: prev, trend: trend, kpis: kpis, breakdown: breakdown };
  }

  // ---- callout (disain.md p. 4: ainult kirjeldav, toetub kuvatud numbritele) ----

  function populationSuffix(config, state) {
    var parts = [];
    (config.filters || []).forEach(function (code) {
      if (code === "Sugu") return;
      var v = config.vars[code];
      if (state[code] != null && state[code] !== v.totalValue) {
        parts.push(v.label.toLowerCase() + " „" + TAI.labelOf(config, code, state[code]) + "“");
      }
    });
    return parts.length ? " (" + parts.join(", ") + ")" : "";
  }

  function phrase(config, kes) { return config.indicator.phrase.replace("{kes}", kes); }

  /* Üle kahe rühma võrdluse lause osa: kõrgeim ja madalaim rühm. Ekraanil võrdse väärtusega rühmad nimetatakse kõik. */
  function compareExtremes(kpis, format, unit) {
    var valid = kpis.filter(function (x) { return x.value != null; });
    if (valid.length < 2) return "";
    var values = valid.map(function (x) { return x.value; });
    var max = Math.max.apply(null, values), min = Math.min.apply(null, values);
    if (format(max) === format(min)) return "kõigis rühmades sama (" + format(max) + unit + ")";
    function groupsAt(value) {
      var names = valid.filter(function (x) { return format(x.value) === format(value); }).map(function (x) { return "„" + x.label + "“"; });
      return names.length === 1 ? "rühmas " + names[0] : "rühmades " + names.slice(0, -1).join(", ") + " ja " + names[names.length - 1];
    }
    return "kõrgeim " + groupsAt(max) + " (" + format(max) + unit + ") ja madalaim " + groupsAt(min) + " (" + format(min) + unit + ")";
  }

  function calloutTextIndicator(model) {
    var config = model.config;
    var sentences = [];
    var suffix = populationSuffix(config, model.state);
    var k = model.kpis;

    var intro = model.latest + ". aastal" + suffix + " oli ";
    if (model.series[0].cmpVar) {
      var extremes = compareExtremes(k, fmt, "");
      if (extremes) sentences.push(intro + phrase(config, model.series[0].kes) + " " + extremes + ".");
    } else if (k.length === 1 && k[0].value != null) {
      var s = intro + phrase(config, model.series[0].kes) + " " + fmt(k[0].value);
      if (k[0].delta) {
        var d = k[0].delta;
        s += d.direction === "flat"
          ? ", mis on praktiliselt sama kui " + model.prev + ". aastal"
          : ", mis on " + fmt(Math.abs(d.diff)).replace("%", "") + " protsendipunkti " +
            (d.direction === "up" ? "rohkem" : "vähem") + " kui " + model.prev + ". aastal";
      }
      sentences.push(s + ".");
    } else if (k.length === 2 && k[0].value != null && k[1].value != null) {
      sentences.push(intro + phrase(config, "naiste") + " " + fmt(k[1].value) +
        " ja meeste osakaal " + fmt(k[0].value) + ".");
    }

    var b = model.breakdown;
    if (b) {
      var items = [];
      b.groups.forEach(function (g) { g.items.forEach(function (it) { items.push(it); }); });
      if (b.series.length === 1) {
        var valid = items.filter(function (it) { return it.values[0] != null; });
        if (valid.length > 1) {
          valid.sort(function (a, c) { return c.values[0] - a.values[0]; });
          var hi = valid[0], lo = valid[valid.length - 1];
          sentences.push(capitalize(b.inPhrase) + " oli osakaal kõrgeim rühmas „" + hi.label + "“ (" + fmt(hi.values[0]) +
            ") ja madalaim rühmas „" + lo.label + "“ (" + fmt(lo.values[0]) + ").");
        }
      } else {
        var pairs = items.filter(function (it) { return it.values[0] != null && it.values[1] != null; });
        if (pairs.length > 1) {
          var womenHigher = pairs.filter(function (it) { return it.values[1] > it.values[0]; }).length;
          var m = pairs.length;
          if (womenHigher === m) {
            sentences.push(capitalize(b.inPhrase) + " oli naiste osakaal meeste omast kõrgem kõigis " + m + " rühmas.");
          } else if (womenHigher === 0) {
            sentences.push(capitalize(b.inPhrase) + " oli meeste osakaal naiste omast kõrgem kõigis " + m + " rühmas.");
          } else {
            sentences.push(capitalize(b.inPhrase) + " oli naiste osakaal meeste omast kõrgem " + womenHigher + " rühmas " + m + "-st.");
          }
        }
      }
    }
    (config.calloutCaveats || []).forEach(function (c) {
      if (c.values.indexOf(model.state[c.var]) >= 0) sentences.push(c.text);
    });
    if (hasMissing(model)) sentences.push("Valitud lõike kohta osa andmeid puudub.");
    return sentences.join(" ");
  }

  function hasMissing(model) {
    var missing = model.kpis.some(function (k) { return k.value == null; });
    // connectGaps: uuringut ei tehta igal aastal, vahele jäänud aasta pole „puuduv andmestik“
    if (model.trend && !model.config.connectGaps) model.trend.forEach(function (s) { s.points.forEach(function (p) { if (p.value == null) missing = true; }); });
    if (model.breakdown) model.breakdown.groups.forEach(function (g) {
      g.items.forEach(function (it) { it.values.forEach(function (v) { if (v == null) missing = true; }); });
    });
    return missing;
  }

  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  // ---- valitud lõige (filtrilause) ---------------------------------------
  /*
   * Kasutaja otsus 05.11.2026 (ülevõetud M3-st, M2 kuju järgi; asendab 18.09.2026 reegli „vaikevalikul lõiget ei näidata“):
   * KPI kastis ning iga joonise ja andmetabeli pealkirja all on väiksemas, paksus kirjas alati näha, milliste valikute (ka
   * vaikevalik, nt „Sugu: Kokku“) alusel numbrid kuvatakse. Kuju „Filtri nimi: väärtus · Filtri nimi: väärtus“. Võrdlusrežiimis
   * on võrreldav filter nimetatud võrdlusena („Sugu: Mehed vrdl Naised“), sest see ON selle graafiku valik.
   * `config.sliceSkip` = filtrid, mida lõikes ei korrata, sest aeg on juba KPI sildil ja graafiku lõikes (nt Tervisekassa aastad).
   * Tulbale ei kehti tema enda võrdlustelje filter (tulbas on kõik rühmad), seepärast oma lause (TAI.breakdownSlice).
   */
  function sliceValueLabel(config, code, val) {
    if (code === "Sugu") {
      var o = TAI.SEX_OPTIONS.filter(function (x) { return x[0] === val; })[0];
      if (o) return o[1];
    }
    return TAI.labelOf(config, code, val);
  }

  TAI.sliceParts = function (config, state, exclude) {
    var skip = config.sliceSkip || [];
    return (config.filters || []).filter(function (code) { return code !== exclude && skip.indexOf(code) < 0; }).map(function (code) {
      var v = config.vars[code];
      var comp = TAI.activeComparisonFor(config, state, code);
      if (comp) return v.label + ": " + comp.label;
      var val = state[code] != null ? state[code] : v.defaultValue != null ? v.defaultValue : v.totalValue;
      return v.label + ": " + sliceValueLabel(config, code, val);
    });
  };

  TAI.trendSlice = function (model) {
    return TAI.sliceParts(model.config, model.state).join(" · ");
  };

  function sliceYearText(config, y) {
    var label = config.seriesVar ? TAI.yearLabel(config, y) : y;
    if (config.periodYears) return "Periood " + label;
    return /^\d{4}$/.test(label) ? label + ". aasta" : label;   // „2019. aasta“, aga „2026 (pooleli)“
  }

  TAI.breakdownSlice = function (model) {
    var config = model.config, b = model.breakdown, state = model.state;
    var codes = [];
    b.groups.forEach(function (g) { g.items.forEach(function (it) { codes.push(it.code); }); });
    var own = state[b.varCode];
    var ownInBars = own == null || own === config.vars[b.varCode].totalValue || codes.indexOf(own) >= 0;
    var parts = [sliceYearText(config, b.year) + (b.inPhrase ? ", " + b.inPhrase : "")]
      .concat(TAI.sliceParts(config, state, ownInBars ? b.varCode : null));
    if (b.selected && codes.indexOf(b.selected) >= 0) parts.push("esile tõstetud: " + TAI.labelOf(config, b.varCode, b.selected));
    return parts.join(" · ");
  };

  /** Lõike rida joonise või andmetabeli pealkirja alla (tühi, kui lõiget pole). */
  TAI.sliceHtml = function (text, cls) {
    return text ? '<p class="slice ' + (cls || "chart-slice") + '">' + esc(text) + "</p>" : "";
  };

  function captionSlice(text) {
    return text ? '<span class="slice data-table__slice"><span class="visually-hidden"> — </span>' + esc(text) + "</span>" : "";
  }

  // ---- HTML-osad -----------------------------------------------------

  function renderKpisIndicator(model, slice) {
    var higherIsWorse = model.config.indicator.higherIsWorse;
    var single = model.kpis.length === 1;
    return '<div class="kpi-row">' + model.kpis.map(function (k) {
      var deltaHtml = "";
      if (!k.delta && k.prevYear && k.value != null) {
        deltaHtml = '<p class="kpi__delta is-flat">Muutust ei saa arvutada: ' + esc(k.prevYear) + ". aasta andmed puuduvad</p>";
      }
      if (k.delta) {
        var cls = k.delta.direction === "flat" ? "is-flat"
          : (k.delta.direction === "up") === higherIsWorse ? "is-worse" : "is-better";
        deltaHtml = '<p class="kpi__delta ' + cls + '">' + esc(k.delta.text) +
          ' <span class="kpi__delta-ref">võrreldes ' + esc(k.prevYear) + ". aastaga</span></p>";
      }
      return '<div class="kpi">' +
        '<p class="kpi__label">' + esc(k.cardLabel) + " · " + esc(k.year) + "</p>" +
        (single && slice ? '<p class="slice kpi__slice">' + esc(slice) + "</p>" : "") +
        (k.value == null
          ? '<p class="kpi__value kpi__value--missing">Andmed puuduvad</p>'
          : '<p class="kpi__value">' + fmt(k.value) + "</p>") +
        deltaHtml +
        (!k.delta && model.config.kpiNote && k.value != null ? '<p class="kpi__note">' + esc(model.config.kpiNote) + "</p>" : "") +
      "</div>";
    }).join("") + "</div>";
  }

  TAI.renderLegend = function (series) {
    if (series.length < 2) return "";
    return '<ul class="legend">' + series.map(function (s) {
      // värv pannakse peale CSSOM-iga (app.js applySwatches), sest CSP ei luba style="…" atribuuti HTML-is
      return '<li><span class="legend__swatch" data-swatch="' + esc(s.color) + '"></span>' + esc(s.label) + "</li>";
    }).join("") + "</ul>";
  };

  function renderDataTablesIndicator(model) {
    var config = model.config;
    var html = "";
    var heads = model.series.map(function (s) { return '<th scope="col" class="num">' + esc(s.label) + "</th>"; }).join("");

    if (model.trend) {
      html += '<table class="data-table"><caption>' + esc(config.indicator.label) + " (%) aastate kaupa" + captionSlice(TAI.trendSlice(model)) + "</caption>" +
        '<thead><tr><th scope="col">Aasta</th>' + heads + "</tr></thead><tbody>" +
        config.years.map(function (y, i) {
          return '<tr><th scope="row">' + esc(y) + "</th>" + model.trend.map(function (s) {
            return '<td class="num">' + fmt(s.points[i].value) + "</td>";
          }).join("") + "</tr>";
        }).join("") + "</tbody></table>";
    }

    var b = model.breakdown;
    if (b) {
      var varLabel = config.vars[b.varCode].label;
      html += '<table class="data-table"><caption>' + esc(b.title) + ", " + esc(b.year) + " (%)" + captionSlice(TAI.breakdownSlice(model)) + "</caption>" +
        "<thead><tr>" + (b.groups[0].label ? '<th scope="col">Rühm</th>' : "") + '<th scope="col">' + esc(varLabel) + "</th>" + heads + "</tr></thead><tbody>" +
        '<tr class="is-total">' + (b.groups[0].label ? "<td></td>" : "") + '<th scope="row">Kokku</th>' +
          b.totals.map(function (v) { return '<td class="num">' + fmt(v) + "</td>"; }).join("") + "</tr>" +
        b.groups.map(function (g) {
          return g.items.map(function (it, i) {
            return "<tr>" + (g.label ? "<td>" + (i === 0 ? esc(g.label) : "") + "</td>" : "") +
              '<th scope="row">' + esc(it.label) + "</th>" +
              it.values.map(function (v) { return '<td class="num">' + fmt(v) + "</td>"; }).join("") + "</tr>";
          }).join("");
        }).join("") + "</tbody></table>";
    }

    html += '<p class="data-table__link">' + TAI.externalLink(TAI.pxwebUrl(config), "Vaata kogu tabelit TAI andmebaasis") + "</p>";
    return html;
  }

  // ---- SVG abi -------------------------------------------------------

  function el(name, attrs, text) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = text;
    return node;
  }

  var TICKS = 4;

  /** Telje maksimum, mis jagub TICKS sammuks täisarvuliste protsentidega (nt 4 → 8 → 12 → 16). */
  var NICE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000];
  /* capPct: protsenditelg ei lähe üle 100%, kui kõik väärtused on ≤ 100 (muidu 97,9% → telg 200%). Protsentide astmestik on
     endine; suuremad sammud on arvude jaoks, mis varem jooksid teljest üle (ülevõetud M3-st). */
  function niceMax(values, capPct) {
    var max = Math.max.apply(null, values.filter(function (v) { return v != null; }).concat([0]));
    var raw = (max * 1.15) / TICKS;
    var out = NICE_STEPS[NICE_STEPS.length - 1] * TICKS;
    for (var i = 0; i < NICE_STEPS.length; i++) if (NICE_STEPS[i] >= raw) { out = NICE_STEPS[i] * TICKS; break; }
    return capPct && max <= 100 && out > 100 ? 100 : out;
  }

  /*
   * Aastasildid trendigraafiku teljel (05.11.2026, M3 eeskujul): aegrea pikkus on lahtine (uued aastad lisanduvad ise),
   * seega kui kõik sildid ei mahu, näidatakse iga 2./3. jne aasta; esimene ja viimane on alati nähtaval. Punktid ja
   * vihjed jäävad kõigile aastatele. labelW = kõige laiema sildi hinnanguline laius pikslites.
   */
  function yearLabelStep(labelW, plotInnerW, count) {
    var gap = plotInnerW / Math.max(1, count - 1);
    return Math.max(1, Math.ceil(labelW / gap));
  }

  function yearLabelVisible(i, count, every) {
    var isLast = i === count - 1;
    if (i % every !== 0 && !isLast) return false;
    if (!isLast && every > 1 && count - 1 - i < every) return false;   // ära pane viimase kõrvale kokku
    return true;
  }

  /** Lihtne reamurdmine SVG-s: kuni 2 rida, hinnanguline tähelaius. */
  function wrapLabel(text, maxWidth, charWidth) {
    var maxChars = Math.max(6, Math.floor(maxWidth / charWidth));
    if (text.length <= maxChars) return [text];
    var words = text.split(" "), lines = [""];
    words.forEach(function (w) {
      var cur = lines[lines.length - 1];
      if ((cur + " " + w).trim().length <= maxChars || !cur) lines[lines.length - 1] = (cur + " " + w).trim();
      else lines.push(w);
    });
    if (lines.length > 2) lines = [lines[0], lines.slice(1).join(" ")];
    return lines;
  }

  /** format: tabeli enda väärtuse vormindaja; vaikimisi protsent (vana mudel). */
  function markAttrs(label, value, format) {
    var v = (format || fmt)(value);
    return { tabindex: "0", role: "img", "aria-label": label + ": " + v, "data-label": label, "data-value": v, class: "mark" };
  }

  // ---- trendijoonis --------------------------------------------------

  function drawTrendChartIndicator(svg, model, width) {
    var years = model.config.years;
    var narrow = width < 480;
    var W = Math.max(280, width), H = narrow ? 230 : 260;
    var padL = 44, padR = 16, padT = 24, padB = 34;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var inset = narrow ? 24 : 40;

    var all = [];
    model.trend.forEach(function (s) { s.points.forEach(function (p) { all.push(p.value); }); });
    var maxV = niceMax(all, true);

    function x(i) { return padL + inset + ((plotW - 2 * inset) * i) / Math.max(1, years.length - 1); }
    function y(v) { return padT + plotH - (plotH * v) / maxV; }

    svg.innerHTML = "";
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);

    for (var g = 0; g <= TICKS; g++) {
      var gv = (maxV * g) / TICKS;
      svg.appendChild(el("line", { class: g === 0 ? "baseline" : "gridline", x1: padL, x2: W - padR, y1: y(gv), y2: y(gv) }));
      svg.appendChild(el("text", { class: "axis-label", x: padL - 8, y: y(gv) + 4, "text-anchor": "end" }, Math.round(gv) + "%"));
    }
    var everyYear = yearLabelStep(String(years[0]).length * 6.8 + 8, plotW - 2 * inset, years.length);
    years.forEach(function (yr, i) {
      if (!yearLabelVisible(i, years.length, everyYear)) return;
      svg.appendChild(el("text", { class: "axis-label", x: x(i), y: H - padB + 22, "text-anchor": "middle" }, yr));
    });

    model.trend.forEach(function (s) {
      var pts = s.points.map(function (p, i) { return p.value == null ? null : [x(i), y(p.value)]; });
      var d = "", pen = false;
      pts.forEach(function (p) {
        if (!p) { pen = false; return; }
        d += (pen ? "L" : "M") + p[0] + "," + p[1] + " ";
        pen = true;
      });
      if (d) svg.appendChild(el("path", { class: "line-series", d: d.trim(), stroke: s.color }));
    });

    // punktid + sildid; mitme seeria korral kõrgem silt üles, madalam alla
    years.forEach(function (yr, i) {
      var entries = model.trend
        .map(function (s) { return { s: s, v: s.points[i].value }; })
        .filter(function (e) { return e.v != null; })
        .sort(function (a, b) { return b.v - a.v; });
      entries.forEach(function (e, rank) {
        var cx = x(i), cy = y(e.v);
        var below = entries.length > 1 && rank === entries.length - 1;
        // Üle kahe seeria kattuksid sildid: väärtused on KPI-kaartidel, vihjes ja andmetabelis
        if (model.trend.length <= 2) {
          svg.appendChild(el("text", {
            class: "mark-label", x: cx, y: below ? cy + 20 : cy - 11, "text-anchor": "middle"
          }, fmt(e.v)));
        }
        var dot = el("circle", Object.assign(markAttrs(e.s.label + " · " + yr, e.v), {
          cx: cx, cy: cy, r: 5, fill: e.s.color, class: "mark line-dot"
        }));
        svg.appendChild(dot);
      });
    });
  }

  // ---- tulpdiagramm --------------------------------------------------

  function drawBarChartIndicator(svg, model, width) {
    var b = model.breakdown;
    var nSeries = b.series.length;
    var W = Math.max(280, width);
    var narrow = W < 480;
    var labelW = Math.min(210, Math.round(W * (narrow ? 0.36 : 0.32)));
    var valueW = 52;
    var barX = labelW + 12;
    var plotW = W - barX - valueW;
    var barH = nSeries === 1 ? 20 : 13, barGap = 3, rowGap = 12;
    var rowH = nSeries * barH + (nSeries - 1) * barGap;
    var groupH = 30;
    var headH = 18 * nSeries + 8;

    var all = b.totals.slice();
    b.groups.forEach(function (g) { g.items.forEach(function (it) { all = all.concat(it.values); }); });
    var maxV = niceMax(all, true);
    function bx(v) { return barX + (plotW * v) / maxV; }

    // sildid murtakse enne, et kaherealine silt saaks kõrgema rea
    var charW = narrow ? 6.4 : 6.8;
    b.groups.forEach(function (g) {
      g.items.forEach(function (it) {
        it._lines = wrapLabel(it.label, labelW, charW);
        it._rowH = Math.max(rowH, it._lines.length * 14 + 2);
      });
    });

    var H = headH;
    b.groups.forEach(function (g) {
      if (g.label) H += groupH;
      g.items.forEach(function (it) { H += it._rowH + rowGap; });
    });
    H += 8;

    svg.innerHTML = "";
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);

    var cy = headH;
    var rowsLayer = el("g");
    b.groups.forEach(function (g) {
      if (g.label) {
        rowsLayer.appendChild(el("text", { class: "group-label", x: 0, y: cy + 20 }, g.label));
        cy += groupH;
      }
      g.items.forEach(function (it) {
        var selected = b.selected === it.code;
        var lines = it._lines;
        var rowTop = cy + (it._rowH - rowH) / 2;   // tulbad rea keskele
        var labelY = cy + it._rowH / 2 + 4 - (lines.length - 1) * 7;
        var t = el("text", { class: "bar-label" + (selected ? " is-selected" : ""), x: labelW, y: labelY, "text-anchor": "end" });
        lines.forEach(function (line, li) {
          t.appendChild(el("tspan", { x: labelW, dy: li === 0 ? 0 : 14 }, line));
        });
        rowsLayer.appendChild(t);

        it.values.forEach(function (v, si) {
          var s = b.series[si];
          var y0 = rowTop + si * (barH + barGap);
          if (v == null) {
            rowsLayer.appendChild(el("text", { class: "mark-label", x: barX + 4, y: y0 + barH / 2 + 4 }, "andmed puuduvad"));
            return;
          }
          var fill = nSeries === 1 ? (selected ? COLORS.selected : COLORS.bar) : s.color;
          rowsLayer.appendChild(el("rect", Object.assign(markAttrs(it.label + (nSeries > 1 ? " · " + s.label : ""), v), {
            x: barX, y: y0, width: Math.max(2, bx(v) - barX), height: barH, rx: 3, fill: fill, class: "mark bar"
          })));
          rowsLayer.appendChild(el("text", { class: "mark-label", x: bx(v) + 6, y: y0 + barH / 2 + 4 }, fmt(v)));
        });
        cy += it._rowH + rowGap;
      });
    });

    // Kokku võrdlusjooned (tulpade taha)
    var refLayer = el("g");
    b.totals.forEach(function (v, si) {
      if (v == null) return;
      var s = b.series[si];
      var rx = bx(v);
      refLayer.appendChild(el("line", {
        class: "ref-line", x1: rx, x2: rx, y1: 18 * si + 14, y2: H - 4,
        stroke: nSeries === 1 ? "var(--som-tumesinine)" : s.color
      }));
      var label = (nSeries > 1 ? s.label + " kokku " : "Kokku ") + fmt(v);
      var anchor = rx > W - 90 ? "end" : rx < barX + 60 ? "start" : "middle";
      refLayer.appendChild(el("text", { class: "ref-label", x: rx, y: 18 * si + 11, "text-anchor": anchor }, label));
    });

    svg.appendChild(refLayer);
    svg.appendChild(rowsLayer);
  }

  // =====================================================================
  // Uus, üldine andmemudel ja renderdus (config.seriesVar-iga tabelid) —
  // vt README.md "Kinnitatud API-struktuur"/"Arhitektuuri mõju" ja TASKS-ARHIIV.md "2. etapp".
  // Esimene kasutus: Eurostati riikide-võrdluse tabelid (js/tables/eurostat-*.js).
  // =====================================================================

  TAI.yearLabel = function (config, code) { return TAI.labelOf(config, config.yearVar, code); };
  var yl = TAI.yearLabel;

  /* „2025. aastal“ / „2024. aastaga“, või config.periodYears korral (kaheaastased perioodid, nt „2024/2025“) „perioodil …“ / „perioodiga …“. */
  TAI.inYear = function (config, code) {
    return config.periodYears ? "perioodil " + yl(config, code) : yl(config, code) + ". aastal";
  };
  TAI.vsYear = function (config, code) {
    return config.periodYears ? "perioodiga " + yl(config, code) : yl(config, code) + ". aastaga";
  };

  /** Väärtuse vormindaja: tabeli oma (config.formatValue, nt täisarvud), muidu ühiku ja komakohtadega arv (võivad sõltuda filtrist). */
  function valueFormat(config, state) { return TAI.formatterFor(config, state); }

  function isPct(config, state) { var u = TAI.unitOf(config, state); return u == null || u === "%"; }

  /** Telje ülempiir: fikseeritud arv või tabeli oma arvutus (config.axisMax), muidu niceMax. */
  function axisMaxOf(config, values, state) {
    if (typeof config.axisMax === "function") return config.axisMax(values);
    return config.axisMax || niceMax(values, isPct(config, state));
  }

  /*
   * Pikk tulp (config.views.breakdown.limit = N): joonisel N esimest (sort: "desc" korral N suurimat) + valitud rida, kui see
   * jääb välja. Sama „Näita kõiki“ nupp mis defaultValues-loendil; andmetabel ja kokkuvõtte lause kasutavad alati kõiki ridu.
   */
  TAI.barItemCount = function (b) {
    return b.groups.reduce(function (n, g) { return n + g.items.length; }, 0);
  };
  TAI.visibleBarGroups = function (b) {
    if (!b.limit || b.expanded || TAI.barItemCount(b) <= b.limit) return b.groups;
    var left = b.limit;
    return b.groups.map(function (g) {
      var items = g.items.filter(function (it, i) { return i < left || it.code === b.selected; });
      left = Math.max(0, left - g.items.length);
      return { label: g.label, items: items };
    }).filter(function (g) { return g.items.length; });
  };

  /* Ühik kokkuvõtte lauses: „%“ on juba numbris; muu ühik: üks sõna ilma sulgudeta („58,1 aastat“), pikem fraas sulgudes.
     config.calloutUnit: false jätab selle ära (nt kui skaala on juba graafiku all kirjas). */
  function unitPhrase(config, state) {
    if (config.calloutUnit === false || TAI.unitOf(config, state) !== "") return "";
    var label = config.unitLabel || "";
    if (!label) return "";
    return /\s/.test(label) ? " (" + label + ")" : " " + label;
  }

  /** Varutoonid seeriale, kui config.vars[seriesVar].colors puudub. */
  var DEFAULT_PALETTE = ["var(--series-1)", "var(--series-2)"];

  /*
   * Seeriad: config.seriesVar väärtused — vaikimisi KÕIK (nt Hinnang skaala 5 astet), aga kui
   * config.seriesValues on antud (alamhulk), kasutatakse ainult neid. Viimast on vaja, kui sama
   * muutuja (nt "geo") kannab kahte rolli: väike võrdlusseeria trendi/KPI jaoks (nt ainult Eesti)
   * JA suur loend breakdown-tulpade jaoks (nt kõik riigid) — vt js/tables/eurostat-ilc-pw01.js.
   */
  function seriesOfGeneral(config, state) {
    var v = config.vars[config.seriesVar];
    var codes = config.seriesValues || v.values;
    // Võrdlus: üks joon iga võrreldava rühma kohta (seeriamuutuja esimene väärtus, nt Eesti)
    var cmp = TAI.activeComparison(config, state);
    if (cmp) {
      var mi = v.values.indexOf(codes[0]);
      return cmp.values.map(function (val, i) {
        return {
          code: codes[0], cmpVar: cmp.filter, cmpCode: val,
          label: TAI.labelOf(config, cmp.filter, val),
          color: cmp.colors[i],
          valence: (v.valence && v.valence[mi]) || "neutral"
        };
      });
    }
    return codes.map(function (code) {
      var i = v.values.indexOf(code);
      return {
        code: code,
        label: v.labels[i],
        color: (v.colors && v.colors[i]) || DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
        valence: (v.valence && v.valence[i]) || "neutral"
      };
    });
  }

  function baseSelectionGeneral(config, state, year) {
    var sel = {};
    sel[config.yearVar] = year;
    Object.keys(config.vars).forEach(function (code) {
      if (code === config.yearVar || code === config.seriesVar) return;
      var v = config.vars[code];
      if (v.totalValue == null) return;
      sel[code] = state[code] != null ? state[code] : v.totalValue;
    });
    return sel;
  }

  /** Valik ühe seeria kohta: seeriamuutuja väärtus ja võrdlusel ka rühm. */
  function selectSeries(config, sel, s) {
    sel[config.seriesVar] = s.code;
    if (s.cmpVar) sel[s.cmpVar] = s.cmpCode;
    return sel;
  }

  function buildModelGeneral(config, data, state) {
    var series = seriesOfGeneral(config, state);
    var comparison = TAI.activeComparison(config, state);
    var years = config.years;
    var latest = years[years.length - 1];
    var prev = years.length > 1 ? years[years.length - 2] : null;

    function valueAt(reader, sel) {
      if (!reader) return null;
      var v = reader.get(sel);
      return v === undefined ? null : v;
    }

    var trend = null;
    if (config.views.trend && data.trend) {
      trend = series.map(function (s) {
        return Object.assign({}, s, {
          points: years.map(function (y) {
            var sel = selectSeries(config, baseSelectionGeneral(config, state, y), s);
            return { year: y, value: valueAt(data.trend, sel) };
          })
        });
      });
    }

    var deltaPhrase = TAI.deltaPhraseOf(config, state), decimals = TAI.decimalsOf(config, state);
    var kpis = series.map(function (s, i) {
      var value, delta = null, kYear = latest, kPrev = prev;
      if (trend) {
        var pts = trend[i].points;
        if (config.connectGaps) {
          // Uuringut ei tehta igal aastal: KPI = viimane olemasolev aasta, võrdlus = sellele eelnev olemasolev aasta.
          var have = pts.filter(function (p) { return p.value != null; });
          var lastP = have[have.length - 1], prevP = have[have.length - 2];
          value = lastP ? lastP.value : null;
          kYear = lastP ? lastP.year : latest;
          kPrev = prevP ? prevP.year : null;
          if (prevP) delta = TAI.delta(value, prevP.value, deltaPhrase, decimals);
        } else {
          value = pts[pts.length - 1].value;
          if (prev) delta = TAI.delta(value, pts[pts.length - 2].value, deltaPhrase, decimals);
        }
      } else {
        var sel = selectSeries(config, baseSelectionGeneral(config, state, latest), s);
        var bd0 = config.views.breakdown;
        if (bd0 && config.vars[bd0.var].totalValue != null) sel[bd0.var] = config.vars[bd0.var].totalValue;
        value = valueAt(data.breakdown, sel);
      }
      return { label: s.label, color: s.color, valence: s.valence, year: kYear, prevYear: kPrev, value: value, delta: delta };
    });

    /*
     * Kinnitatud kasutajaga 18.09.2026: kui KPI-kaart näitab üldist (mitte kategooriate vahel
     * võrdlevat) näitajat — nagu ilc_pw01, kus seeria on lihtsalt fikseeritud üks riik —, peab
     * silt igal juhul nimetama nii üksuse KUI valitud lõike, et kaarti saaks lugeda eraldiseisvana.
     * config.kpiSubject on üksuse nimi (nt "Eesti"); silt saab kas " kokku" (kõik filtrid
     * vaikeväärtusel) või ", valitud lõige" (mõni filter erineb — vt populationSuffixGeneral,
     * mida kasutab ka callout sama eesmärgiga). "Kokku" ja "valitud lõige" EI tohi kunagi koos
     * esineda, sest need väidaksid vastandlikku asja (kas kogu populatsioon või kitsam lõige).
     * Mitmeseerialistel kaartidel (nt kategooriad, ilma kpiSubject'ita) lisandub lisand samast
     * loogikast otse seeria enda nimele. Kõik läheb eraldi cardLabel väljale, MITTE label'isse —
     * callout (allpool) kasutab sedasama k.label "top kategooria" lauses ega tohi lisandit saada.
     */
    var narrowedGeneral = !!populationSuffixGeneral(config, state);
    if (config.kpiSubject && kpis.length === 1) {
      kpis[0].cardLabel = config.kpiSubject + (narrowedGeneral ? ", valitud lõige" : " kokku");
    } else {
      kpis.forEach(function (k) { k.cardLabel = k.label + (narrowedGeneral ? ", valitud lõige" : ""); });
    }

    /*
     * Valikuline väike võrdlusrida KPI-kaardil (nt "EL-27 keskmine: 7,3") — ei ole omaette KPI-kaart
     * ega täistelg, ainult üks lisaväärtus samast lugejast (config.kpiReference = { var, value, label }).
     * Kinnitatud kasutajaga 17.09.2026 (ilc_pw01): lihtne trend + kompaktne viide, mitte kaks tervet
     * paralleelset seeriat, sest sama "geo" muutuja täidab siin kahte eri rolli (vt seriesValues).
     * subjectLabel (kinnitatud 18.09.2026): võrdlusrea "kõrgem/madalam" peab ütlema, KELLE tulemus
     * see on (nt "Eesti tulemus"). Rida algab ka valitud aastaga (vt renderKpisGeneral), et see
     * oleks iseseisvalt loetav ega eeldaks, et lugeja seob selle kaardi pealkirja aastaga.
     */
    if (config.kpiReference && !comparison && kpis.length && kpis[0].value != null) {
      var kr = config.kpiReference;
      var refSel = baseSelectionGeneral(config, state, kpis[0].year);
      refSel[kr.var] = kr.value;
      var refValue = valueAt(data.trend || data.breakdown, refSel);
      if (refValue != null) {
        kpis[0].reference = {
          label: kr.label, value: refValue, subjectLabel: kr.subjectLabel,
          delta: TAI.delta(kpis[0].value, refValue, deltaPhrase, decimals)
        };
      }
    }

    var breakdown = null;
    var bd = config.views.breakdown;
    // Võrdlusel tulpa ei näidata, kui see võrdleks sama asja, mis jooned, või kui rea kohta tuleks üle kahe tulba
    if (comparison && bd && (comparison.filter === bd.var || comparison.values.length > 2)) bd = null;
    if (bd && data.breakdown) {
      var bVar = config.vars[bd.var];
      // showTotal: false või function(state): koondjoont ei näidata, kui koond on tulpade summa, mitte võrreldav tase (muidu venib telg)
      var showTotal = typeof bd.showTotal === "function" ? bd.showTotal(state) : bd.showTotal !== false;
      var hasTotal = bVar.totalValue != null && showTotal;
      // Kompaktne vaikimisi loend (nt riikide puhul), kui config seda määrab; "näita kõiki" lülitab
      // state[bd.expandFlag]-i abil täisloendile — vt app.js renderFilters/expand-nupp.
      var allValues = bVar.values.filter(function (v) { return v !== bVar.totalValue; });
      var expandFlag = bd.expandFlag || (bd.limit ? "showAllBars" : undefined);
      var showAll = !bd.defaultValues || (bd.expandFlag && state[bd.expandFlag]);
      var visibleValues = showAll ? allValues : bd.defaultValues.filter(function (v) { return allValues.indexOf(v) >= 0; });
      // groups: massiiv või function(state)
      var groups = (typeof bd.groups === "function" ? bd.groups(state) : bd.groups) || [{ label: null, values: visibleValues }];
      // connectGaps: tulbad samast viimasest olemasolevast aastast kui KPI, muidu oleksid need uuringuta aastal tühjad
      var barYear = config.connectGaps && kpis.length ? kpis[0].year : latest;
      var valueFor = function (s, code) {
        var sel = selectSeries(config, baseSelectionGeneral(config, state, barYear), s);
        sel[bd.var] = code;
        return valueAt(data.breakdown, sel);
      };
      breakdown = {
        title: bd.title,
        inPhrase: bd.inPhrase,
        varCode: bd.var,
        year: barYear,
        selected: (state[bd.var] != null && state[bd.var] !== bVar.totalValue) ? state[bd.var] : (bd.highlight || null),
        expandable: !!bd.defaultValues,
        expandFlag: expandFlag,
        expanded: showAll,
        totalCount: allValues.length,
        shownCount: visibleValues.length,
        limit: bd.limit || 0,
        series: series,
        totals: hasTotal ? series.map(function (s) { return valueFor(s, bVar.totalValue); }) : null,
        groups: groups.map(function (g) {
          var items = g.values.map(function (code) {
            return {
              code: code,
              label: TAI.labelOf(config, bd.var, code),
              values: series.map(function (s) { return valueFor(s, code); })
            };
          });
          // sort: "desc": suurimast väiksemani esimese seeria järgi, puuduvad lõppu
          if (bd.sort === "desc") {
            items.sort(function (a, c) {
              var av = a.values[0], cv = c.values[0];
              if (av == null) return cv == null ? 0 : 1;
              if (cv == null) return -1;
              return cv - av;
            });
          }
          return { label: g.label, items: items };
        })
      };
      // limit: kõik read on mudelis (tabel, lause), joonis näitab vähem (TAI.visibleBarGroups). defaultValues on ülimuslik.
      if (breakdown.limit && !bd.defaultValues) {
        breakdown.expanded = !!state[expandFlag];
        breakdown.totalCount = TAI.barItemCount(breakdown);
        breakdown.expandable = breakdown.totalCount > breakdown.limit;
      } else {
        breakdown.limit = 0;
      }
    }

    return { config: config, state: state, series: series, latest: latest, prev: prev, trend: trend, kpis: kpis, breakdown: breakdown, comparison: comparison };
  }

  function populationSuffixGeneral(config, state) {
    var parts = [];
    (config.filters || []).forEach(function (code) {
      if (code === config.seriesVar) return;
      var v = config.vars[code];
      if (state[code] != null && state[code] !== v.totalValue) {
        parts.push(v.label.toLowerCase() + " „" + TAI.labelOf(config, code, state[code]) + "“");
      }
    });
    return parts.length ? " (" + parts.join(", ") + ")" : "";
  }

  function judgment(direction, valence) {
    if (direction === "flat" || !valence || valence === "neutral") return null;
    return (direction === "up") === (valence === "negative") ? "worse" : "better";
  }

  function calloutTextGeneral(model) {
    var config = model.config;
    var fmt = valueFormat(config, model.state);
    var sentences = [];
    var suffix = populationSuffixGeneral(config, model.state);
    var k = model.kpis;

    var valid = k.filter(function (x) { return x.value != null; });
    if (model.comparison) {
      // Võrdluse lause: ainult kirjeldav, toetub KPI-kaartide arvudele; hinnangut ega uusi arve ei anta
      if (valid.length > 1) {
        var ranked = valid.slice().sort(function (a, c) { return c.value - a.value; });
        var top1 = ranked[0], low1 = ranked[ranked.length - 1], u = unitPhrase(config, model.state);
        var when = capitalize(TAI.inYear(config, valid[0].year)) + suffix + " oli " + config.measureLabel.toLowerCase();
        sentences.push(valid.length === 2
          ? when + " rühmas „" + top1.label + "“ " + fmt(top1.value) + u + " ja rühmas „" + low1.label + "“ " + fmt(low1.value) + u + "."
          : when + " " + compareExtremes(valid, fmt, u) + ".");
      }
    } else if (valid.length === 1) {
      var only = valid[0];
      // only.year / only.prevYear == model.latest / model.prev, v.a connectGaps-tabelitel (viimane olemasolev aasta)
      var s0 = capitalize(TAI.inYear(config, only.year)) + suffix + " oli " + config.measureLabel.toLowerCase() + " " + fmt(only.value) + unitPhrase(config, model.state);
      if (only.delta) {
        var d0 = only.delta;
        s0 += d0.direction === "flat"
          ? ", mis on praktiliselt sama kui " + TAI.inYear(config, only.prevYear)
          : ", mis on " + d0.text.replace(/^[▲▼→]\s*/, "") + " " +
            (d0.direction === "up" ? "rohkem" : "vähem") + " kui " + TAI.inYear(config, only.prevYear);
        var j0 = judgment(d0.direction, only.valence);
        // Hinnang käib näitaja, mitte inimeste olukorra kohta (kasutaja otsus 06.11.2026, sama reegel mis AI-juhises)
        if (j0) s0 += " — see on näitaja järgi " + (j0 === "better" ? "paranemine" : "halvenemine");
      }
      sentences.push(s0 + ".");
    } else if (valid.length > 1) {
      var top = valid.slice().sort(function (a, c) { return c.value - a.value; })[0];
      var s = capitalize(TAI.inYear(config, top.year)) + suffix + " oli enim vastuseid kategoorias „" + top.label + "“ (" + fmt(top.value) + ")";
      if (top.delta) {
        var d = top.delta;
        s += d.direction === "flat"
          ? ", mis on praktiliselt sama kui " + TAI.inYear(config, top.prevYear)
          : ", mis on " + d.text.replace(/^[▲▼→]\s*/, "") + " " +
            (d.direction === "up" ? "rohkem" : "vähem") + " kui " + TAI.inYear(config, top.prevYear);
        var j = judgment(d.direction, top.valence);
        if (j) s += " — see on näitaja järgi " + (j === "better" ? "paranemine" : "halvenemine");
      }
      sentences.push(s + ".");
    }

    // Võrdlusel seda lauset pole: esimene seeria on ainult üks võrreldavatest rühmadest
    var b = model.comparison ? null : model.breakdown;
    if (b) {
      var items = [];
      b.groups.forEach(function (g) { g.items.forEach(function (it) { items.push(it); }); });
      var valid2 = items.filter(function (it) { return it.values[0] != null; });
      if (valid2.length > 1) {
        valid2.sort(function (a, c) { return c.values[0] - a.values[0]; });
        var hi = valid2[0], lo = valid2[valid2.length - 1];
        sentences.push(capitalize(b.inPhrase) + " oli " + config.measureLabel.toLowerCase() + " kõrgeim „" + hi.label +
          "“ (" + fmt(hi.values[0]) + ") ja madalaim „" + lo.label + "“ (" + fmt(lo.values[0]) + ").");
      }
    }
    // config.calloutExtra(model, fmt) → lause või null: tabeli oma lisalause, peab tuginema ainult ekraanil olevatele arvudele
    if (typeof config.calloutExtra === "function" && !model.comparison) {
      var extra = config.calloutExtra(model, fmt);
      if (extra) sentences.push(extra);
    }
    (config.calloutCaveats || []).forEach(function (c) {
      if (c.values.indexOf(model.state[c.var]) >= 0) sentences.push(c.text);
    });
    if (hasMissing(model)) sentences.push("Valitud lõike kohta osa andmeid puudub.");
    return sentences.join(" ");
  }

  function renderKpisGeneral(model, slice) {
    var config = model.config;
    var fmt = valueFormat(config, model.state);
    var single = model.kpis.length === 1;
    return '<div class="kpi-row">' + model.kpis.map(function (k) {
      var deltaHtml = "";
      if (!k.delta && k.prevYear && k.value != null) {
        deltaHtml = '<p class="kpi__delta is-flat">Muutust ei saa arvutada: ' +
          esc(config.periodYears ? "perioodi " + yl(config, k.prevYear) : yl(config, k.prevYear) + ". aasta") + " andmed puuduvad</p>";
      }
      if (k.delta) {
        var j = judgment(k.delta.direction, k.valence);
        var cls = j === "worse" ? "is-worse" : j === "better" ? "is-better" : "is-flat";
        deltaHtml = '<p class="kpi__delta ' + cls + '">' + esc(k.delta.text) +
          ' <span class="kpi__delta-ref">' + esc(k.deltaRef || "võrreldes " + TAI.vsYear(config, k.prevYear)) + "</span></p>";
      }
      return '<div class="kpi">' +
        '<p class="kpi__label">' + esc(k.cardLabel) + " · " + esc(yl(config, k.year)) + "</p>" +
        (single && slice ? '<p class="slice kpi__slice">' + esc(slice) + "</p>" : "") +
        (k.value == null
          ? '<p class="kpi__value kpi__value--missing">' + esc(k.missingText || "Andmed puuduvad") + "</p>"
          : '<p class="kpi__value">' + fmt(k.value) + "</p>") +
        deltaHtml +
        (k.note ? '<p class="kpi__note">' + esc(k.note) + "</p>" : "") +
        (!k.delta && config.kpiNote && k.value != null ? '<p class="kpi__note">' + esc(config.kpiNote) + "</p>" : "") +
        (k.reference ? '<p class="kpi__reference">' + esc(yl(config, k.year) + ". a " + k.reference.label) + ": " + fmt(k.reference.value) +
          (k.reference.delta && k.reference.delta.direction !== "flat"
            ? " (" + esc((k.reference.subjectLabel || "Tulemus") + " " + k.reference.delta.text.replace(/^[▲▼]\s*/, "") +
              (k.reference.delta.direction === "up" ? " kõrgem" : " madalam")) + ")"
            : k.reference.delta ? " (sama)" : "") + "</p>" : "") +
      "</div>";
    }).join("") + "</div>";
  }

  function renderDataTablesGeneral(model) {
    var config = model.config;
    var fmt = valueFormat(config, model.state);
    var ut = TAI.unitText(config, model.state);
    var unitSuffix = ut ? " (" + ut + ")" : "";
    var html = "";
    var heads = model.series.map(function (s) { return '<th scope="col" class="num">' + esc(s.label) + "</th>"; }).join("");

    if (model.trend) {
      html += '<table class="data-table"><caption>' + esc(config.measureLabel) + unitSuffix + " aastate kaupa" + captionSlice(TAI.trendSlice(model)) + "</caption>" +
        '<thead><tr><th scope="col">' + (config.periodYears ? "Periood" : "Aasta") + "</th>" + heads + "</tr></thead><tbody>" +
        config.years.map(function (y, i) {
          return '<tr><th scope="row">' + esc(yl(config, y)) + "</th>" + model.trend.map(function (s) {
            return '<td class="num">' + fmt(s.points[i].value) + "</td>";
          }).join("") + "</tr>";
        }).join("") + "</tbody></table>";
    }

    var b = model.breakdown;
    if (b) {
      var varLabel = config.vars[b.varCode].label;
      // tableTotals: koondrida ainult tabelis, ilma graafiku võrdlusjooneta (nt arvude puhul, kus koond on rühmade summa)
      var rowTotals = b.totals || b.tableTotals;
      html += '<table class="data-table"><caption>' + esc(b.title) + ", " + esc(yl(config, b.year)) + unitSuffix + captionSlice(TAI.breakdownSlice(model)) + "</caption>" +
        "<thead><tr>" + (b.groups[0].label ? '<th scope="col">Rühm</th>' : "") + '<th scope="col">' + esc(varLabel) + "</th>" + heads + "</tr></thead><tbody>" +
        (rowTotals ? '<tr class="is-total">' + (b.groups[0].label ? "<td></td>" : "") + '<th scope="row">Kokku</th>' +
          rowTotals.map(function (v) { return '<td class="num">' + fmt(v) + "</td>"; }).join("") + "</tr>" : "") +
        b.groups.map(function (g) {
          return g.items.map(function (it, i) {
            return "<tr>" + (g.label ? "<td>" + (i === 0 ? esc(g.label) : "") + "</td>" : "") +
              '<th scope="row">' + esc(it.label) + "</th>" +
              it.values.map(function (v) { return '<td class="num">' + fmt(v) + "</td>"; }).join("") + "</tr>";
          }).join("");
        }).join("") + "</tbody></table>";
    }

    html += '<p class="data-table__link">' + TAI.externalLink(TAI.sourceUrl(config),
      (config.source && config.source.tableLinkText) || "Vaata kogu tabelit " + TAI.sourceLabel(config) + " andmebaasis") + "</p>";
    return html;
  }

  function drawTrendChartGeneral(svg, model, width) {
    var config = model.config;
    var fmt = valueFormat(config, model.state);
    var unitNow = TAI.unitOf(config, model.state);
    var axisUnit = unitNow != null ? unitNow : "%";
    var years = config.years;
    var narrow = width < 480;
    // Pooleliolevad aastad (config.provisionalYears): katkendjoon ja seest tühi punkt.
    function isProvisional(i) { return (config.provisionalYears || []).indexOf(years[i]) >= 0; }
    // Aasta silt võib olla kaherealine, nt "2026 (pooleli)"; ühesõnalised sildid jäävad endiseks.
    var yearLines = years.map(function (yr) { return yl(config, yr).split(" "); });
    var extraLines = Math.max.apply(null, yearLines.map(function (l) { return l.length; })) - 1;
    var W = Math.max(280, width), H = (narrow ? 230 : 260) + extraLines * 14;
    var padL = 44, padR = 16, padT = 24, padB = 34 + extraLines * 14;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var inset = narrow ? 24 : 40;

    var all = [];
    model.trend.forEach(function (s) { s.points.forEach(function (p) { all.push(p.value); }); });
    // config.axisMax: fikseeritud ülempiiriga skaalade jaoks (nt hindamisskaala 0–10) — niceMax()
    // astmestik (5/10/20/…) on mõeldud lahtise suurusjärguga arvudele (protsendid, suremuskordajad)
    // ja venitab kitsa, teadaoleva vahemikuga skaala teljed ebamõistlikult suureks.
    var maxV = axisMaxOf(config, all, model.state);

    function x(i) { return padL + inset + ((plotW - 2 * inset) * i) / Math.max(1, years.length - 1); }
    function y(v) { return padT + plotH - (plotH * v) / maxV; }

    svg.innerHTML = "";
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);

    var axisTicks = config.axisMax ? 5 : TICKS; // fikseeritud skaala: 5 sammu (nt 0-10 puhul 0,2,4,6,8,10)
    for (var g = 0; g <= axisTicks; g++) {
      var gv = (maxV * g) / axisTicks;
      svg.appendChild(el("line", { class: g === 0 ? "baseline" : "gridline", x1: padL, x2: W - padR, y1: y(gv), y2: y(gv) }));
      svg.appendChild(el("text", { class: "axis-label", x: padL - 8, y: y(gv) + 4, "text-anchor": "end" },
        config.formatValue ? fmt(gv) : Math.round(gv) + axisUnit));
    }
    var widestPiece = Math.max.apply(null, yearLines.map(function (l) { return Math.max.apply(null, l.map(function (s) { return s.length; })); }));
    var everyYear = yearLabelStep(widestPiece * 6.8 + 8, plotW - 2 * inset, years.length);
    years.forEach(function (yr, i) {
      if (!yearLabelVisible(i, years.length, everyYear)) return;
      var label = el("text", { class: "axis-label", x: x(i), y: H - padB + 22, "text-anchor": "middle" });
      yearLines[i].forEach(function (line, li) {
        label.appendChild(el("tspan", { x: x(i), dy: li === 0 ? 0 : 14 }, line));
      });
      svg.appendChild(label);
    });

    model.trend.forEach(function (s) {
      var pts = s.points.map(function (p, i) { return p.value == null ? null : [x(i), y(p.value)]; });
      var d = "", dashed = "", pen = false, last = null;
      pts.forEach(function (p, i) {
        if (!p) { if (!config.connectGaps) { pen = false; last = null; } return; }   // connectGaps: joon üle uuringu vaheaastate
        if (isProvisional(i)) {
          if (last) dashed += "M" + last[0] + "," + last[1] + " L" + p[0] + "," + p[1] + " ";
          pen = false;
        } else {
          d += (pen ? "L" : "M") + p[0] + "," + p[1] + " ";
          pen = true;
        }
        last = p;
      });
      if (d) svg.appendChild(el("path", { class: "line-series", d: d.trim(), stroke: s.color }));
      if (dashed) svg.appendChild(el("path", { class: "line-series", d: dashed.trim(), stroke: s.color, "stroke-dasharray": "6 5" }));
    });

    // Sildid ainult algus-, lõpp- ja tippaastal (pika ajarea puhul muidu loetamatu).
    var labelYears = model.trend.map(function (s) {
      var idx = {};
      idx[0] = true;
      idx[years.length - 1] = true;
      var peak = -1, peakV = null;
      s.points.forEach(function (p, i) {
        if (p.value != null && (peakV == null || p.value > peakV)) { peakV = p.value; peak = i; }
      });
      if (peak >= 0) idx[peak] = true;
      return idx;
    });

    // Üle kahe seeria on punktisildid loetamatud (kattuvad), seega neid ei joonistata: väärtused on KPI-kaartidel,
    // hõljutamisel (tooltip) ja andmetabelis.
    var showLabels = model.trend.length <= 2;

    years.forEach(function (yr, i) {
      var entries = model.trend
        .map(function (s, si) { return { s: s, si: si, v: s.points[i].value }; })
        .filter(function (e) { return e.v != null; })
        .sort(function (a, b) { return b.v - a.v; });
      entries.forEach(function (e, rank) {
        var cx = x(i), cy = y(e.v);
        var below = entries.length > 1 && rank === entries.length - 1;
        if (showLabels && labelYears[e.si][i]) {
          svg.appendChild(el("text", {
            class: "mark-label", x: cx, y: below ? cy + 20 : cy - 11, "text-anchor": "middle"
          }, fmt(e.v)));
        }
        var dot = el("circle", Object.assign(markAttrs(e.s.label + " · " + yl(config, yr), e.v, fmt), {
          cx: cx, cy: cy, r: 5, fill: e.s.color, class: "mark line-dot"
        }));
        // CSSOM (mitte setAttribute("style")): CSP ei luba style-atribuuti
        if (isProvisional(i)) { dot.style.fill = "var(--taust)"; dot.style.stroke = e.s.color; }
        svg.appendChild(dot);
      });
    });
  }

  function drawBarChartGeneral(svg, model, width) {
    var config = model.config;
    var fmt = valueFormat(config, model.state);
    var b = Object.assign({}, model.breakdown, { groups: TAI.visibleBarGroups(model.breakdown) });
    var nSeries = b.series.length;
    var W = Math.max(280, width);
    var narrow = W < 480;
    var labelW = Math.min(210, Math.round(W * (narrow ? 0.36 : 0.32)));
    var valueW = 52;
    var barX = labelW + 12;
    var plotW = W - barX - valueW;
    var barH = nSeries === 1 ? 20 : 13, barGap = 3, rowGap = 12;
    var rowH = nSeries * barH + (nSeries - 1) * barGap;
    var groupH = 30;
    var headH = b.totals ? 18 * nSeries + 8 : 8;

    var all = (b.totals || []).slice();
    b.groups.forEach(function (g) { g.items.forEach(function (it) { all = all.concat(it.values); }); });
    var maxV = axisMaxOf(config, all, model.state);
    function bx(v) { return barX + (plotW * v) / maxV; }

    var charW = narrow ? 6.4 : 6.8;
    b.groups.forEach(function (g) {
      g.items.forEach(function (it) {
        it._lines = wrapLabel(it.label, labelW, charW);
        it._rowH = Math.max(rowH, it._lines.length * 14 + 2);
      });
    });

    var H = headH;
    b.groups.forEach(function (g) {
      if (g.label) H += groupH;
      g.items.forEach(function (it) { H += it._rowH + rowGap; });
    });
    H += 8;

    svg.innerHTML = "";
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);

    var cy = headH;
    var rowsLayer = el("g");
    b.groups.forEach(function (g) {
      if (g.label) {
        rowsLayer.appendChild(el("text", { class: "group-label", x: 0, y: cy + 20 }, g.label));
        cy += groupH;
      }
      g.items.forEach(function (it) {
        var selected = b.selected === it.code;
        var lines = it._lines;
        var rowTop = cy + (it._rowH - rowH) / 2;
        var labelY = cy + it._rowH / 2 + 4 - (lines.length - 1) * 7;
        var t = el("text", { class: "bar-label" + (selected ? " is-selected" : ""), x: labelW, y: labelY, "text-anchor": "end" });
        lines.forEach(function (line, li) {
          t.appendChild(el("tspan", { x: labelW, dy: li === 0 ? 0 : 14 }, line));
        });
        rowsLayer.appendChild(t);

        it.values.forEach(function (v, si) {
          var s = b.series[si];
          var y0 = rowTop + si * (barH + barGap);
          if (v == null) {
            rowsLayer.appendChild(el("text", { class: "mark-label", x: barX + 4, y: y0 + barH / 2 + 4 }, "andmed puuduvad"));
            return;
          }
          var fill = nSeries === 1 ? (selected ? COLORS.selected : COLORS.bar) : s.color;
          rowsLayer.appendChild(el("rect", Object.assign(markAttrs(it.label + (nSeries > 1 ? " · " + s.label : ""), v, fmt), {
            x: barX, y: y0, width: Math.max(2, bx(v) - barX), height: barH, rx: 3, fill: fill, class: "mark bar"
          })));
          rowsLayer.appendChild(el("text", { class: "mark-label", x: bx(v) + 6, y: y0 + barH / 2 + 4 }, fmt(v)));
        });
        cy += it._rowH + rowGap;
      });
    });

    var refLayer = el("g");
    (b.totals || []).forEach(function (v, si) {
      if (v == null) return;
      var s = b.series[si];
      var rx = bx(v);
      refLayer.appendChild(el("line", {
        class: "ref-line", x1: rx, x2: rx, y1: 18 * si + 14, y2: H - 4,
        stroke: nSeries === 1 ? "var(--som-tumesinine)" : s.color
      }));
      var label = (nSeries > 1 ? s.label + " kokku " : "Kokku ") + fmt(v);
      var anchor = rx > W - 90 ? "end" : rx < barX + 60 ? "start" : "middle";
      refLayer.appendChild(el("text", { class: "ref-label", x: rx, y: 18 * si + 11, "text-anchor": anchor }, label));
    });

    svg.appendChild(refLayer);
    svg.appendChild(rowsLayer);
  }

  // ---- avalik liides: dispatch config.seriesVar olemasolu järgi --------

  // Aruanne võib anda oma andmemudeli ja callouti (config.buildModel, config.calloutText), nt Tervisekassa:
  // kuvamine (KPI-d, graafikud, tabel) tuleb ikka ühisest üldmudeli renderdusest.
  TAI.buildModel = function (config, data, state) {
    if (config.buildModel) return config.buildModel(config, data, state);
    return config.seriesVar ? buildModelGeneral(config, data, state) : buildModelIndicator(config, data, state);
  };
  TAI.calloutText = function (model) {
    if (model.config.calloutText) return model.config.calloutText(model);
    return model.config.seriesVar ? calloutTextGeneral(model) : calloutTextIndicator(model);
  };
  // Valitud lõige KPI kastis: ühe kaardi puhul kaardi sees sildi all, mitme kaardi puhul üks kord kogu rea kasti ülaosas.
  TAI.renderKpis = function (model) {
    var slice = TAI.sliceParts(model.config, model.state).join(" · ");
    var row = model.config.seriesVar ? renderKpisGeneral(model, slice) : renderKpisIndicator(model, slice);
    if (model.kpis.length === 1 || !slice) return row;
    return '<div class="kpi-block"><p class="slice kpi-block__slice">' + esc(slice) + "</p>" + row + "</div>";
  };
  TAI.renderDataTables = function (model) {
    return model.config.seriesVar ? renderDataTablesGeneral(model) : renderDataTablesIndicator(model);
  };
  TAI.drawTrendChart = function (svg, model, width) {
    return model.config.seriesVar ? drawTrendChartGeneral(svg, model, width) : drawTrendChartIndicator(svg, model, width);
  };
  TAI.drawBarChart = function (svg, model, width) {
    return model.config.seriesVar ? drawBarChartGeneral(svg, model, width) : drawBarChartIndicator(svg, model, width);
  };

})(window.TAI);
