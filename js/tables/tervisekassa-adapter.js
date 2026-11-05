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
      statusNote: "Eksporditud " + isoToEt(meta.valjavotte_kuupaev) + " · Allika uuendus " + isoToEt(meta.allika_uuendus)
    };
  }

  var loading = null;

  /** Laeb failid ühe korra; ebaõnnestunud laadimist saab uuesti proovida. */
  function load() {
    if (!loading) {
      var base = TAI.tervisekassa.DATA_BASE;
      loading = Promise.all([
        TAI.fetchJson(base + "yldstat_detail.json"),
        TAI.fetchJson(base + "yldstat_koond.json"),
        TAI.fetchJson(base + "yldstat_meta.json")
      ]).then(function (r) {
        return createStore(r[0], r[1], r[2]);
      }).catch(function (err) {
        loading = null;
        throw err;
      });
    }
    return loading;
  }

  TAI.tervisekassa = {
    DATA_BASE: "data/tervisekassa/",
    UNSUPPORTED_MESSAGE: UNSUPPORTED_MESSAGE,
    createStore: createStore,
    load: load,
    isoToEt: isoToEt
  };
})(window.TAI);
