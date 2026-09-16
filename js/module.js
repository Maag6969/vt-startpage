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

  // ---- andmemudel ---------------------------------------------------

  /** Seeriad olekust: võrdlusel mehed + naised, muidu valitud sugu. */
  function seriesOf(config, state) {
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
  function baseSelection(config, state, sexCode, year) {
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

  TAI.buildModel = function (config, data, state) {
    var series = seriesOf(config, state);
    var years = config.years;
    var latest = years[years.length - 1];
    var prev = years.length > 1 ? years[years.length - 2] : null;

    function share(reader, sel) { return reader ? TAI.indicatorShare(reader, config, sel) : null; }

    var trend = null;
    if (config.views.trend && data.trend) {
      trend = series.map(function (s) {
        return Object.assign({}, s, {
          points: years.map(function (y) {
            return { year: y, value: share(data.trend, baseSelection(config, state, s.code, y)) };
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
        var sel = baseSelection(config, state, s.code, latest);
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
        var sel = baseSelection(config, state, s.code, latest);
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
  };

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

  TAI.calloutText = function (model) {
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
  };

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

  TAI.renderKpis = function (model) {
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
  };

  TAI.renderLegend = function (series) {
    if (series.length < 2) return "";
    return '<ul class="legend">' + series.map(function (s) {
      return '<li><span class="legend__swatch" style="background:' + s.color + '"></span>' + esc(s.label) + "</li>";
    }).join("") + "</ul>";
  };

  TAI.renderDataTables = function (model) {
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
  };

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

  TAI.drawTrendChart = function (svg, model, width) {
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
  };

  // ---- tulpdiagramm --------------------------------------------------

  TAI.drawBarChart = function (svg, model, width) {
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
  };

})(window.TAI);
