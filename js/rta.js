/*
 * Rahvastiku tervise arengukava (RTA) vastavus menüüs (19.11.2026, sama kuju mis M3 js/rta.js).
 *
 * Menüüreal on RTA märk ainult siis, kui aruanne on TÄPSELT sama näitaja kui RTA põhidokumendi näitaja või programmi
 * 2026–2029 mõõdik („RTA · <programm>, <periood>“). Lähedased seosed (nt SD21 enesetappude arv, programmis on määr
 * 100 000 kohta) menüüsse ei lähe.
 *
 * Allikad (loetud 19.11.2026): Rahvastiku tervise arengukava 2020–2030 (näitajad 1–9) ja Sotsiaalministeeriumi heaolu ja
 * tervise tulemusvaldkonna programmid 2026–2029 (kinnitatud 15.01.2026, lisad 4–6). Programmid uuenevad igal aastal:
 * vaata see fail üle kord aastas ja muuda PERIOD ning mõõdikud. Võti on menüürea (peamise õe) kood.
 */
(function (TAI) {
  "use strict";

  var PERIOD = "2026–2029";
  var PROGRAMS = {
    V: { short: "Tervist toetavad valikud", full: "Tervist toetavate valikute programm " + PERIOD },
    K: { short: "Tervist toetav keskkond", full: "Tervist toetava keskkonna programm " + PERIOD },
    T: { short: "Inimkeskne tervishoid", full: "Inimkeskse tervishoiu programm " + PERIOD },
    Y: { short: "üldeesmärk", full: "Rahvastiku tervise arengukava 2020–2030 üldeesmärk" }
  };

  var TABLES = {
    "ilc_pw01": { p: "V", m: "tegevus 2 „Vaimse tervise edendamine“, mõõdik „Täiskasvanute (16+) üldine eluga rahulolu (skaalal 0–10)“ (EU-SILC)" }
  };

  /** { short, hint } või null. hint = hiirevihje rida. */
  TAI.rtaOf = function (code) {
    var r = TABLES[code];
    if (!r) return null;
    var prog = PROGRAMS[r.p];
    return { short: prog.short, hint: "RTA: " + prog.full + " — " + r.m + "." };
  };
})(window.TAI);
