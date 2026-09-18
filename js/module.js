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

  /** Seeriad olekust: võrdlusel mehed + naised, muidu valitud sugu. */
  function seriesOfIndicator(config, state) {
    if (state.compareSexes) {
      return [
        { code: "1", label: "Mehed", kes: "meeste", color: COLORS.series1 },
        { code: "2", label: "Naised", kes: "naiste", color: COLORS.series2 }
      ];
    }
    var code = state.Sugu || "0";
    return [{
      code: code,
      label: TAI.labelOf(config, "Sugu", code),
      kes: code === "1" ? "meeste" : code === "2" ? "naiste" : "inimeste",
      color: COLORS.series1
    }];
  }

  /**
   * Täielik valik lugeja jaoks: kõik filtrimuutujad (koondkategooria "0", kui valimata).
   * Lugeja ignoreerib võtmeid, mida vastuses pole — nii sobib sama valik nii API vastusele
   * kui ka üleslaaditud täistabelile.
   */
  function baseSelectionIndicator(config, state, sexCode, year) {
    var sel = {};
    sel[config.yearVar] = year;
    Object.keys(config.vars).forEach(function (code) {
      if (code === config.yearVar || code === config.indicator.var) return;
      var v = config.vars[code];
      if (v.totalValue == null) return;
      sel[code] = state[code] != null ? state[code] : v.totalValue;
    });
    sel.Sugu = sexCode;
    return sel;
  }

  function buildModelIndicator(config, data, state) {
    var series = seriesOfIndicator(config, state);
    var years = config.years;
    var latest = years[years.length - 1];
    var prev = years.length > 1 ? years[years.length - 2] : null;

    function share(reader, sel) { return reader ? TAI.indicatorShare(reader, config, sel) : null; }

    var trend = null;
    if (config.views.trend && data.trend) {
      trend = series.map(function (s) {
        return Object.assign({}, s, {
          points: years.map(function (y) {
            return { year: y, value: share(data.trend, baseSelectionIndicator(config, state, s.code, y)) };
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
        var sel = baseSelectionIndicator(config, state, s.code, latest);
        if (config.views.breakdown) sel[config.views.breakdown.var] = config.vars[config.views.breakdown.var].totalValue;
        value = share(data.breakdown, sel);
      }
      return { label: s.label, color: s.color, year: latest, prevYear: prev, value: value, delta: delta };
    });

    var breakdown = null;
    var bd = config.views.breakdown;
    if (bd && data.breakdown) {
      var bVar = config.vars[bd.var];
      var groups = bd.groups || [{
        label: null,
        values: bVar.values.filter(function (v) { return v !== bVar.totalValue; })
      }];
      var valueFor = function (s, code) {
        var sel = baseSelectionIndicator(config, state, s.code, latest);
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

  function calloutTextIndicator(model) {
    var config = model.config;
    var sentences = [];
    var suffix = populationSuffix(config, model.state);
    var k = model.kpis;

    var intro = model.latest + ". aastal" + suffix + " oli ";
    if (k.length === 1 && k[0].value != null) {
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
    if (model.trend) model.trend.forEach(function (s) { s.points.forEach(function (p) { if (p.value == null) missing = true; }); });
    if (model.breakdown) model.breakdown.groups.forEach(function (g) {
      g.items.forEach(function (it) { it.values.forEach(function (v) { if (v == null) missing = true; }); });
    });
    return missing;
  }

  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  // ---- HTML-osad -----------------------------------------------------

  function renderKpisIndicator(model) {
    var higherIsWorse = model.config.indicator.higherIsWorse;
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
        '<p class="kpi__label">' + esc(k.label) + " · " + esc(k.year) + "</p>" +
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
      return '<li><span class="legend__swatch" style="background:' + s.color + '"></span>' + esc(s.label) + "</li>";
    }).join("") + "</ul>";
  };

  function renderDataTablesIndicator(model) {
    var config = model.config;
    var html = "";
    var heads = model.series.map(function (s) { return '<th scope="col" class="num">' + esc(s.label) + "</th>"; }).join("");

    if (model.trend) {
      html += '<table class="data-table"><caption>' + esc(config.indicator.label) + " (%) aastate kaupa</caption>" +
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
      html += '<table class="data-table"><caption>' + esc(b.title) + ", " + esc(b.year) + " (%)</caption>" +
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
  function niceMax(values) {
    var max = Math.max.apply(null, values.filter(function (v) { return v != null; }).concat([0]));
    var raw = (max * 1.15) / TICKS;
    var steps = [1, 2, 5, 10, 20, 25];
    for (var i = 0; i < steps.length; i++) if (steps[i] >= raw) return steps[i] * TICKS;
    return 25 * TICKS;
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

  function markAttrs(label, value) {
    var v = fmt(value);
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
    var maxV = niceMax(all);

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
    years.forEach(function (yr, i) {
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
        svg.appendChild(el("text", {
          class: "mark-label", x: cx, y: below ? cy + 20 : cy - 11, "text-anchor": "middle"
        }, fmt(e.v)));
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
    var maxV = niceMax(all);
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
  // vt README.md "Kinnitatud API-struktuur"/"Arhitektuuri mõju" ja TASKS.md "2. etapp".
  // Esimene kasutus: Eurostati riikide-võrdluse tabelid (js/tables/eurostat-*.js).
  // =====================================================================

  TAI.yearLabel = function (config, code) { return TAI.labelOf(config, config.yearVar, code); };
  var yl = TAI.yearLabel;

  /** Varutoonid seeriale, kui config.vars[seriesVar].colors puudub. */
  var DEFAULT_PALETTE = ["var(--series-1)", "var(--series-2)"];

  /*
   * Seeriad: config.seriesVar väärtused — vaikimisi KÕIK (nt Hinnang skaala 5 astet), aga kui
   * config.seriesValues on antud (alamhulk), kasutatakse ainult neid. Viimast on vaja, kui sama
   * muutuja (nt "geo") kannab kahte rolli: väike võrdlusseeria trendi/KPI jaoks (nt ainult Eesti)
   * JA suur loend breakdown-tulpade jaoks (nt kõik riigid) — vt js/tables/eurostat-ilc-pw01.js.
   */
  function seriesOfGeneral(config) {
    var v = config.vars[config.seriesVar];
    var codes = config.seriesValues || v.values;
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

  function buildModelGeneral(config, data, state) {
    var series = seriesOfGeneral(config);
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
            var sel = baseSelectionGeneral(config, state, y);
            sel[config.seriesVar] = s.code;
            return { year: y, value: valueAt(data.trend, sel) };
          })
        });
      });
    }

    var kpis = series.map(function (s, i) {
      var value, delta = null;
      if (trend) {
        var pts = trend[i].points;
        value = pts[pts.length - 1].value;
        if (prev) delta = TAI.delta(value, pts[pts.length - 2].value, config.deltaPhrase);
      } else {
        var sel = baseSelectionGeneral(config, state, latest);
        sel[config.seriesVar] = s.code;
        var bd0 = config.views.breakdown;
        if (bd0 && config.vars[bd0.var].totalValue != null) sel[bd0.var] = config.vars[bd0.var].totalValue;
        value = valueAt(data.breakdown, sel);
      }
      return { label: s.label, color: s.color, valence: s.valence, year: latest, prevYear: prev, value: value, delta: delta };
    });

    /*
     * Kinnitatud kasutajaga 18.09.2026: kui KPI-kaart näitab üldist (mitte kategooriate vahel
     * võrdlevat) näitajat — nagu ilc_pw01, kus seeria on lihtsalt fikseeritud üks riik —, peab
     * silt igal juhul nimetama nii üksuse KUI valitud lõike ("EESTI KOKKU"), et lauset/kaarti
     * saaks lugeda eraldiseisvana, ilma et peaks lehe muust kontekstist üksust ise tuletama.
     * config.kpiLabel annab selle täpse sildi (rakendub ainult ühe seeriaga kaartidele, et
     * mitmeseerialistes tabelites, nt tulevastes riikidevahelistes võrdlustes, jääks ikka iga
     * seeria enda nimi nähtavaks, mitte üks ühine silt).
     */
    if (config.kpiLabel && kpis.length === 1) kpis[0].label = config.kpiLabel;

    /*
     * Valikuline väike võrdlusrida KPI-kaardil (nt "EL-27 keskmine: 7,3") — ei ole omaette KPI-kaart
     * ega täistelg, ainult üks lisaväärtus samast lugejast (config.kpiReference = { var, value, label }).
     * Kinnitatud kasutajaga 17.09.2026 (ilc_pw01): lihtne trend + kompaktne viide, mitte kaks tervet
     * paralleelset seeriat, sest sama "geo" muutuja täidab siin kahte eri rolli (vt seriesValues).
     * subjectLabel (kinnitatud 18.09.2026): võrdlusrea "kõrgem/madalam" peab ütlema, KELLE tulemus
     * see on (nt "Eesti tulemus"). Rida algab ka valitud aastaga (vt renderKpisGeneral), et see
     * oleks iseseisvalt loetav ega eeldaks, et lugeja seob selle kaardi pealkirja aastaga.
     */
    if (config.kpiReference && kpis.length && kpis[0].value != null) {
      var kr = config.kpiReference;
      var refSel = baseSelectionGeneral(config, state, latest);
      refSel[kr.var] = kr.value;
      var refValue = valueAt(data.trend || data.breakdown, refSel);
      if (refValue != null) {
        kpis[0].reference = {
          label: kr.label, value: refValue, subjectLabel: kr.subjectLabel,
          delta: TAI.delta(kpis[0].value, refValue, config.deltaPhrase)
        };
      }
    }

    var breakdown = null;
    var bd = config.views.breakdown;
    if (bd && data.breakdown) {
      var bVar = config.vars[bd.var];
      var hasTotal = bVar.totalValue != null;
      // Kompaktne vaikimisi loend (nt riikide puhul), kui config seda määrab; "näita kõiki" lülitab
      // state[bd.expandFlag]-i abil täisloendile — vt app.js renderFilters/expand-nupp.
      var allValues = bVar.values.filter(function (v) { return v !== bVar.totalValue; });
      var showAll = !bd.defaultValues || (bd.expandFlag && state[bd.expandFlag]);
      var visibleValues = showAll ? allValues : bd.defaultValues.filter(function (v) { return allValues.indexOf(v) >= 0; });
      var groups = bd.groups || [{ label: null, values: visibleValues }];
      var valueFor = function (s, code) {
        var sel = baseSelectionGeneral(config, state, latest);
        sel[config.seriesVar] = s.code;
        sel[bd.var] = code;
        return valueAt(data.breakdown, sel);
      };
      breakdown = {
        title: bd.title,
        inPhrase: bd.inPhrase,
        varCode: bd.var,
        year: latest,
        selected: (state[bd.var] != null && state[bd.var] !== bVar.totalValue) ? state[bd.var] : (bd.highlight || null),
        expandable: !!bd.defaultValues,
        expandFlag: bd.expandFlag,
        expanded: showAll,
        totalCount: allValues.length,
        shownCount: visibleValues.length,
        series: series,
        totals: hasTotal ? series.map(function (s) { return valueFor(s, bVar.totalValue); }) : null,
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
    var fmt = function (v) { return TAI.formatValue(v, config.unit); };
    var sentences = [];
    var suffix = populationSuffixGeneral(config, model.state);
    var k = model.kpis;

    var valid = k.filter(function (x) { return x.value != null; });
    if (valid.length === 1) {
      var only = valid[0];
      var s0 = yl(config, model.latest) + ". aastal" + suffix + " oli " + config.measureLabel.toLowerCase() + " " + fmt(only.value);
      if (only.delta) {
        var d0 = only.delta;
        s0 += d0.direction === "flat"
          ? ", mis on praktiliselt sama kui " + yl(config, model.prev) + ". aastal"
          : ", mis on " + d0.text.replace(/^[▲▼→]\s*/, "") + " " +
            (d0.direction === "up" ? "rohkem" : "vähem") + " kui " + yl(config, model.prev) + ". aastal";
        var j0 = judgment(d0.direction, only.valence);
        if (j0) s0 += " — see näitab olukorra " + (j0 === "better" ? "paranemist" : "halvenemist");
      }
      sentences.push(s0 + ".");
    } else if (valid.length > 1) {
      var top = valid.slice().sort(function (a, c) { return c.value - a.value; })[0];
      var s = yl(config, model.latest) + ". aastal" + suffix + " oli enim vastuseid kategoorias „" + top.label + "“ (" + fmt(top.value) + ")";
      if (top.delta) {
        var d = top.delta;
        s += d.direction === "flat"
          ? ", mis on praktiliselt sama kui " + yl(config, model.prev) + ". aastal"
          : ", mis on " + d.text.replace(/^[▲▼→]\s*/, "") + " " +
            (d.direction === "up" ? "rohkem" : "vähem") + " kui " + yl(config, model.prev) + ". aastal";
        var j = judgment(d.direction, top.valence);
        if (j) s += " — see näitab olukorra " + (j === "better" ? "paranemist" : "halvenemist");
      }
      sentences.push(s + ".");
    }

    var b = model.breakdown;
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
    (config.calloutCaveats || []).forEach(function (c) {
      if (c.values.indexOf(model.state[c.var]) >= 0) sentences.push(c.text);
    });
    if (hasMissing(model)) sentences.push("Valitud lõike kohta osa andmeid puudub.");
    return sentences.join(" ");
  }

  function renderKpisGeneral(model) {
    var config = model.config;
    var fmt = function (v) { return TAI.formatValue(v, config.unit); };
    return '<div class="kpi-row">' + model.kpis.map(function (k) {
      var deltaHtml = "";
      if (!k.delta && k.prevYear && k.value != null) {
        deltaHtml = '<p class="kpi__delta is-flat">Muutust ei saa arvutada: ' + esc(yl(config, k.prevYear)) + ". aasta andmed puuduvad</p>";
      }
      if (k.delta) {
        var j = judgment(k.delta.direction, k.valence);
        var cls = j === "worse" ? "is-worse" : j === "better" ? "is-better" : "is-flat";
        deltaHtml = '<p class="kpi__delta ' + cls + '">' + esc(k.delta.text) +
          ' <span class="kpi__delta-ref">võrreldes ' + esc(yl(config, k.prevYear)) + ". aastaga</span></p>";
      }
      return '<div class="kpi">' +
        '<p class="kpi__label">' + esc(k.label) + " · " + esc(yl(config, k.year)) + "</p>" +
        (k.value == null
          ? '<p class="kpi__value kpi__value--missing">Andmed puuduvad</p>'
          : '<p class="kpi__value">' + fmt(k.value) + "</p>") +
        deltaHtml +
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
    var fmt = function (v) { return TAI.formatValue(v, config.unit); };
    var ut = TAI.unitText(config);
    var unitSuffix = ut ? " (" + ut + ")" : "";
    var html = "";
    var heads = model.series.map(function (s) { return '<th scope="col" class="num">' + esc(s.label) + "</th>"; }).join("");

    if (model.trend) {
      html += '<table class="data-table"><caption>' + esc(config.measureLabel) + unitSuffix + " aastate kaupa</caption>" +
        '<thead><tr><th scope="col">Aasta</th>' + heads + "</tr></thead><tbody>" +
        config.years.map(function (y, i) {
          return '<tr><th scope="row">' + esc(yl(config, y)) + "</th>" + model.trend.map(function (s) {
            return '<td class="num">' + fmt(s.points[i].value) + "</td>";
          }).join("") + "</tr>";
        }).join("") + "</tbody></table>";
    }

    var b = model.breakdown;
    if (b) {
      var varLabel = config.vars[b.varCode].label;
      html += '<table class="data-table"><caption>' + esc(b.title) + ", " + esc(yl(config, b.year)) + unitSuffix + "</caption>" +
        "<thead><tr>" + (b.groups[0].label ? '<th scope="col">Rühm</th>' : "") + '<th scope="col">' + esc(varLabel) + "</th>" + heads + "</tr></thead><tbody>" +
        (b.totals ? '<tr class="is-total">' + (b.groups[0].label ? "<td></td>" : "") + '<th scope="row">Kokku</th>' +
          b.totals.map(function (v) { return '<td class="num">' + fmt(v) + "</td>"; }).join("") + "</tr>" : "") +
        b.groups.map(function (g) {
          return g.items.map(function (it, i) {
            return "<tr>" + (g.label ? "<td>" + (i === 0 ? esc(g.label) : "") + "</td>" : "") +
              '<th scope="row">' + esc(it.label) + "</th>" +
              it.values.map(function (v) { return '<td class="num">' + fmt(v) + "</td>"; }).join("") + "</tr>";
          }).join("");
        }).join("") + "</tbody></table>";
    }

    html += '<p class="data-table__link">' + TAI.externalLink(TAI.sourceUrl(config), "Vaata kogu tabelit " + TAI.sourceLabel(config) + " andmebaasis") + "</p>";
    return html;
  }

  function drawTrendChartGeneral(svg, model, width) {
    var config = model.config;
    var fmt = function (v) { return TAI.formatValue(v, config.unit); };
    var axisUnit = config.unit != null ? config.unit : "%";
    var years = config.years;
    var narrow = width < 480;
    var W = Math.max(280, width), H = narrow ? 230 : 260;
    var padL = 44, padR = 16, padT = 24, padB = 34;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var inset = narrow ? 24 : 40;

    var all = [];
    model.trend.forEach(function (s) { s.points.forEach(function (p) { all.push(p.value); }); });
    // config.axisMax: fikseeritud ülempiiriga skaalade jaoks (nt hindamisskaala 0–10) — niceMax()
    // astmestik (5/10/20/…) on mõeldud lahtise suurusjärguga arvudele (protsendid, suremuskordajad)
    // ja venitab kitsa, teadaoleva vahemikuga skaala teljed ebamõistlikult suureks.
    var maxV = config.axisMax || niceMax(all);

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
      svg.appendChild(el("text", { class: "axis-label", x: padL - 8, y: y(gv) + 4, "text-anchor": "end" }, Math.round(gv) + axisUnit));
    }
    years.forEach(function (yr, i) {
      svg.appendChild(el("text", { class: "axis-label", x: x(i), y: H - padB + 22, "text-anchor": "middle" }, yl(config, yr)));
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

    years.forEach(function (yr, i) {
      var entries = model.trend
        .map(function (s, si) { return { s: s, si: si, v: s.points[i].value }; })
        .filter(function (e) { return e.v != null; })
        .sort(function (a, b) { return b.v - a.v; });
      entries.forEach(function (e, rank) {
        var cx = x(i), cy = y(e.v);
        var below = entries.length > 1 && rank === entries.length - 1;
        if (labelYears[e.si][i]) {
          svg.appendChild(el("text", {
            class: "mark-label", x: cx, y: below ? cy + 20 : cy - 11, "text-anchor": "middle"
          }, fmt(e.v)));
        }
        var dot = el("circle", Object.assign(markAttrs(e.s.label + " · " + yl(config, yr), e.v, config.unit), {
          cx: cx, cy: cy, r: 5, fill: e.s.color, class: "mark line-dot"
        }));
        svg.appendChild(dot);
      });
    });
  }

  function drawBarChartGeneral(svg, model, width) {
    var config = model.config;
    var fmt = function (v) { return TAI.formatValue(v, config.unit); };
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
    var headH = b.totals ? 18 * nSeries + 8 : 8;

    var all = (b.totals || []).slice();
    b.groups.forEach(function (g) { g.items.forEach(function (it) { all = all.concat(it.values); }); });
    var maxV = config.axisMax || niceMax(all);
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
          rowsLayer.appendChild(el("rect", Object.assign(markAttrs(it.label + (nSeries > 1 ? " · " + s.label : ""), v, config.unit), {
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

  TAI.buildModel = function (config, data, state) {
    return config.seriesVar ? buildModelGeneral(config, data, state) : buildModelIndicator(config, data, state);
  };
  TAI.calloutText = function (model) {
    return model.config.seriesVar ? calloutTextGeneral(model) : calloutTextIndicator(model);
  };
  TAI.renderKpis = function (model) {
    return model.config.seriesVar ? renderKpisGeneral(model) : renderKpisIndicator(model);
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
