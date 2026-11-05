/*
 * Tervisekassa andmeadapter: loeb importskripti tehtud JSON-failid (data/tervisekassa/) ja tagastab
 * väärtuse TÄPSE filtrivõtme järgi. Lähteülesanne ja reeglid: TERVISEKASSA.md.
 *
 * Adapter ei liida ega lahuta midagi. Ühise valiku F32F33 väärtus tuleb alati ühisfailist ning
 * toetamata kombinatsioon (nt F32 + Mehed) tagastab staatuse "toetamata", mitte hinnangu.
 *
 * Staatused: olemas | null (tegelik 0) | puudub | varjatud | toetamata.
 */
(function (TAI) {
  "use strict";

  var UNSUPPORTED_MESSAGE = "Selle kombinatsiooni koondandmed puuduvad";

  function keyOf(q) {
    return [q.diagnoos, q.sugu, q.aasta, q.vanuseryhm, q.naitaja].join("|");
  }

  function isoToEt(iso) {
    var p = String(iso).split("-");
    return p[2] + "." + p[1] + "." + p[0];
  }

  /** Andmehoidla valmis kirjetest. Eraldi funktsioon, et seda saaks testida ka ilma failideta. */
  function createStore(detail, koond, meta) {
    if (!Array.isArray(detail) || !Array.isArray(koond) || !meta || !Array.isArray(meta.toetatud_kombinatsioonid)) {
      throw new TAI.DataError("Tervisekassa andmefailide struktuur ei vasta oodatule.");
    }
    var index = {};
    detail.concat(koond).forEach(function (r) {
      index[[r.diagnoos_id, r.sugu, r.aasta, r.vanuseryhm, r.naitaja].join("|")] = r;
    });

    function isSupported(diagnoos, sugu) {
      return meta.toetatud_kombinatsioonid.indexOf(diagnoos + "|" + sugu) >= 0;
    }

    /** q: { diagnoos, sugu, aasta, vanuseryhm ("kokku" = aasta koond), naitaja } → { staatus, vaartus, kirje, teade? } */
    function get(q) {
      var kirje = isSupported(q.diagnoos, q.sugu) ? index[keyOf(q)] : null;
      if (!kirje) return { staatus: "toetamata", vaartus: null, kirje: null, teade: UNSUPPORTED_MESSAGE };
      return { staatus: kirje.staatus, vaartus: kirje.vaartus, kirje: kirje };
    }

    return {
      meta: meta,
      get: get,
      isSupported: isSupported,
      statusNote: isoToEt(meta.valjavotte_kuupaev) + " (andmed seisuga " + isoToEt(meta.allika_uuendus) + ")"
    };
  }

  /*
   * Varuvariant: leht avatud failina (file://), kus brauser ei luba JSON-faile fetch-iga lugeda.
   * Importskript kirjutab sama sisu ka tavalise skriptifailina (yldstat.js), mille <script> laadimine töötab.
   * Seda faili ei laeta, kui JSON-ide lugemine õnnestub.
   */
  function loadFallbackScript() {
    return new Promise(function (resolve, reject) {
      if (window.TAI_TERVISEKASSA) { resolve(window.TAI_TERVISEKASSA); return; }
      var s = document.createElement("script");
      s.src = TAI.tervisekassa.DATA_BASE + "yldstat.js";
      s.onload = function () {
        window.TAI_TERVISEKASSA ? resolve(window.TAI_TERVISEKASSA) : reject(new Error("yldstat.js ei sisalda andmeid"));
      };
      s.onerror = function () { reject(new Error("yldstat.js laadimine ebaõnnestus")); };
      document.head.appendChild(s);
    });
  }

  var loading = null;

  /** Laeb failid ühe korra; ebaõnnestunud laadimist saab uuesti proovida. opts.force = laadi uuesti. */
  function load(opts) {
    if (opts && opts.force) loading = null;
    if (!loading) {
      var base = TAI.tervisekassa.DATA_BASE;
      loading = Promise.all([
        TAI.fetchJson(base + "yldstat_detail.json"),
        TAI.fetchJson(base + "yldstat_koond.json"),
        TAI.fetchJson(base + "yldstat_meta.json")
      ]).catch(function (err) {
        // Ainult võrgu- ja HTTP-vead lähevad varuvariandile; vigane sisu (DataError) on päris viga.
        if (err instanceof TAI.DataError) throw err;
        return loadFallbackScript().then(function (d) { return [d.detail, d.koond, d.meta]; }, function () { throw err; });
      }).then(function (r) {
        return createStore(r[0], r[1], r[2]);
      }).catch(function (err) {
        loading = null;
        throw err;
      });
    }
    return loading;
  }

  var metaLoading = null;

  /*
   * Ainult meta-fail (aastad, pooleliolev aasta, vaikeaastad): väike päring, mida aruanne vajab enne oma filtrite ja oleku
   * loomist. Failina avades (kus JSON-e lugeda ei saa) laeb sama varufaili mis load().
   */
  function loadMeta(opts) {
    if (opts && opts.force) metaLoading = null;
    if (!metaLoading) {
      metaLoading = TAI.fetchJson(TAI.tervisekassa.DATA_BASE + "yldstat_meta.json").catch(function (err) {
        if (err instanceof TAI.DataError) throw err;
        return loadFallbackScript().then(function (d) { return d.meta; }, function () { throw err; });
      }).catch(function (err) {
        metaLoading = null;
        throw err;
      });
    }
    return metaLoading;
  }

  TAI.tervisekassa = {
    DATA_BASE: "data/tervisekassa/",
    UNSUPPORTED_MESSAGE: UNSUPPORTED_MESSAGE,
    createStore: createStore,
    load: load,
    loadMeta: loadMeta,
    isoToEt: isoToEt
  };
})(window.TAI);
