/*
 * RegexBuilder + SearchQuery — RegexBuilder.cs / SearchQuery.cs'in birebir JS portu.
 * Oyunda test edilmiş kalıpları üretir; sayı kalıbı mantığı C# ile aynı.
 */
(function (global) {
  "use strict";

  function D(x, y) {
    return x === y ? String(x) : "[" + x + "-" + y + "]";
  }

  // İki haneli [a,b] aralığı için kalıp parçaları (C# TwoDigit).
  function twoDigit(a, b /*, leadingZero */) {
    const out = [];
    if (a > b) return out;
    const ta = Math.floor(a / 10), oa = a % 10;
    const tb = Math.floor(b / 10), ob = b % 10;

    if (ta === tb) {
      out.push(String(ta) + D(oa, ob));
      return out;
    }

    let midLo = ta, midHi = tb;
    if (oa > 0) { out.push(String(ta) + D(oa, 9)); midLo = ta + 1; }
    if (ob < 9) midHi = tb - 1;
    if (midLo <= midHi) out.push(D(midLo, midHi) + ".");
    if (ob < 9) out.push(String(tb) + D(0, ob));
    return out;
  }

  // "En az N%" koşulunu sağlayan sayı regex'i (C# MinNumberPattern).
  function minNumberPattern(min) {
    if (min <= 0) return "\\d+";

    const parts = [];
    if (min >= 200) return "([2-9]..)";

    if (min >= 100) {
      const rem = min - 100;
      const tens = Math.floor(rem / 10), ones = rem % 10;
      if (ones === 0) parts.push("1[" + tens + "-9].");
      else {
        parts.push("1" + tens + "[" + ones + "-9]");
        if (tens < 9) parts.push("1[" + (tens + 1) + "-9].");
      }
      parts.push("[2-9].."); // 200% ve üzeri
    } else {
      if (min < 10) {
        parts.push("[" + min + "-9]");
        parts.push("[1-9].");
      } else {
        const tens = Math.floor(min / 10), ones = min % 10;
        if (ones === 0) parts.push("[" + tens + "-9].");
        else {
          parts.push(tens + "[" + ones + "-9]");
          if (tens < 9) parts.push("[" + (tens + 1) + "-9].");
        }
      }
      parts.push("1.."); // 100% ve üzeri
    }
    return "(" + parts.join("|") + ")";
  }

  // min–max (0–199) aralığını kapsayan sayı kalıbı (C# RangeNumberPattern).
  function rangeNumberPattern(min, max) {
    const parts = [];

    if (min <= 9) parts.push(D(min, Math.min(max, 9)));
    if (max >= 10 && min <= 99)
      twoDigit(Math.max(min, 10), Math.min(max, 99), false).forEach((p) => parts.push(p));
    if (max >= 100)
      twoDigit(Math.max(min, 100) - 100, max - 100, true).forEach((p) => parts.push("1" + p));

    return (parts.length === 1 && parts[0].indexOf("|") < 0)
      ? "(" + parts[0] + ")"
      : "(" + parts.join("|") + ")";
  }

  // Stat öneki için tam arama terimi (C# StatTerm).
  function statTerm(prefix, min, max) {
    max = max || 0;
    const num = (max > 0 && max >= min)
      ? rangeNumberPattern(min, Math.min(max, 199))
      : minNumberPattern(min);
    return '"' + prefix + "\\+" + num + '%"';
  }

  // Negasyon terimi: tırnaksız, boşluklar '.' olur (C# NegTerm).
  function negTerm(pattern) {
    return "!" + pattern.replace(/\s+$/, "").replace(/ /g, ".");
  }

  /*
   * PoE2 stash arama kutusu semantiği (C# SearchQuery.Parse):
   * boşluk terimleri ayırır, "tırnak" tek terim, '!' negasyon.
   * Her terim case-insensitive regex olarak doğrulanır.
   */
  function parse(query) {
    const terms = [];
    let i = 0;
    while (i < query.length) {
      if (/\s/.test(query[i])) { i++; continue; }

      let negated = false;
      if (query[i] === "!") { negated = true; i++; }
      if (i >= query.length) break;

      let pattern, quoted = false;
      if (query[i] === '"') {
        quoted = true;
        const end = query.indexOf('"', i + 1);
        if (end < 0) { pattern = query.slice(i + 1); i = query.length; }
        else { pattern = query.slice(i + 1, end); i = end + 1; }
      } else {
        const start = i;
        while (i < query.length && !/\s/.test(query[i])) i++;
        pattern = query.slice(start, i);
      }

      if (pattern.length === 0) continue;

      let error = null;
      try { new RegExp(pattern, "i"); }
      catch (ex) { error = ex.message; }

      terms.push({ pattern: pattern, negated: negated, quoted: quoted, error: error });
    }
    return terms;
  }

  global.WSRegex = {
    minNumberPattern: minNumberPattern,
    rangeNumberPattern: rangeNumberPattern,
    statTerm: statTerm,
    negTerm: negTerm,
    parse: parse,
  };
})(window);
