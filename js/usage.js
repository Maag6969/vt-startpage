/*
 * Kasutusstatistika (Abacus, https://abacus.jasoncameron.dev) — disain.md p. 2 „Kasutusstatistika“.
 *
 * Loendurid (nimeruum maag6969.github.io):
 *   vt-startpage                     avalehe avamised (iga avamine)
 *   ds-<KOOD>                        andmestiku avamine (andmed laaditud edukalt)
 *   f-<KOOD>-<filter>-<väärtus>      filtri valik kasutaja poolt (nt f-ETU41-sugu-vordlus)
 *   a-<KOOD>-<tegevus>               lisategevus: andmetabel | allikas | prindi | fail
 *
 * Sama sündmus loetakse ühes brauseriseansis üks kord (sessionStorage); avalehe avamine iga kord.
 * Arvu suurendatakse ainult avaldatud lehel; mujal (arendus) ainult loetakse.
 * Kui teenus ei vasta, ei mõjuta see lehe tööd.
 */
(function (TAI) {
  "use strict";

  var API = "https://abacus.jasoncameron.dev/";
  var NAMESPACE = "maag6969.github.io";
  var LIVE_HOST = "maag6969.github.io";
  var SESSION_PREFIX = "tai-usage:";

  var isLive = location.hostname === LIVE_HOST;

  // Filtrite parameetrinimed — samad mis aadressis (#ETU41?taustatunnus=3&vanus=2&sugu=vordlus)
  var PARAM_NAMES = { Taustatunnus: "taustatunnus", "Vanuserühm": "vanus", Sugu: "sugu" };
  var SEX_VALUES = { "0": "kokku", "1": "mehed", "2": "naised", compare: "vordlus" };
  var ACTIONS = ["andmetabel", "allikas", "prindi", "fail"];

  function seenThisSession(key) {
    try {
      if (sessionStorage.getItem(SESSION_PREFIX + key)) return true;
      sessionStorage.setItem(SESSION_PREFIX + key, "1");
    } catch (e) { /* privaatne režiim vms — loeme ilma korduste kontrollita */ }
    return false;
  }

  function request(action, key) {
    if (typeof fetch !== "function") return Promise.resolve(null);
    return fetch(API + action + "/" + NAMESPACE + "/" + key)
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) { return data && typeof data.value === "number" ? data.value : null; })
      .catch(function () { return null; });
  }

  var usage = {
    isLive: isLive,
    PARAM_NAMES: PARAM_NAMES,
    SEX_VALUES: SEX_VALUES,
    ACTIONS: ACTIONS,

    /** Loenduri väärtus ilma suurendamata → Promise<number|null>. */
    get: function (key) { return request("get", key); },

    /**
     * Loeb sündmuse. opts.everyTime = true → ilma seansi korduste kontrollita.
     * → Promise<number|null>: uus väärtus; kui ei loetud (kordus/arendus), praegune väärtus.
     */
    track: function (key, opts) {
      opts = opts || {};
      if (!usage.isLive) return request("get", key);
      if (!opts.everyTime && seenThisSession(key)) return request("get", key);
      return request("hit", key);
    },

    keyDataset: function (code) { return "ds-" + code; },
    keyAction: function (code, action) { return "a-" + code + "-" + action; },
    keyFilter: function (code, varCode, value) {
      var name = PARAM_NAMES[varCode] || varCode.toLowerCase();
      var val = varCode === "Sugu" ? SEX_VALUES[value] : value;
      return "f-" + code + "-" + name + "-" + val;
    },

    /** Kõik loendurid koos inimloetava kirjeldusega (statistikalehe ja loendurite loomise jaoks). */
    allKeys: function () {
      var list = [{ key: "vt-startpage", group: "Avaleht", label: "Avalehe avamised" }];
      TAI.getTables().forEach(function (t) {
        list.push({ key: usage.keyDataset(t.code), group: "Andmestikud", table: t.code, label: t.code + " · " + t.title });
      });
      TAI.getTables().forEach(function (t) {
        (t.filters || []).forEach(function (varCode) {
          var v = t.vars[varCode];
          var values = varCode === "Sugu" ? Object.keys(SEX_VALUES).filter(function (k) { return k !== "compare" || t.canCompareSexes; }) : v.values;
          values.forEach(function (val) {
            var label = varCode === "Sugu"
              ? (val === "compare" ? "Mehed vrdl Naised" : TAI.labelOf(t, "Sugu", val))
              : TAI.labelOf(t, varCode, val);
            list.push({ key: usage.keyFilter(t.code, varCode, val), group: "Filtrid", table: t.code, label: t.code + " · " + v.label + ": " + label });
          });
        });
      });
      TAI.getTables().forEach(function (t) {
        var names = { andmetabel: "andmetabeli avamine", allikas: "TAI allikalingi klõps", prindi: "printimine", fail: "faili üleslaadimine" };
        ACTIONS.forEach(function (a) {
          list.push({ key: usage.keyAction(t.code, a), group: "Lisategevused", table: t.code, label: t.code + " · " + names[a] });
        });
      });
      return list;
    }
  };

  TAI.usage = usage;
})(window.TAI);
