/*
 * Basit yerelleştirme (Loc.cs portu): varsayılan İngilizce, Türkçe seçenek.
 * Oyun/regex terimleri (stat adları, modifier adları, CORRUPT vb.) her dilde orijinal kalır.
 */
(function (global) {
  "use strict";
  global.Loc = {
    turkish: false,
    T: function (en, tr) { return this.turkish ? tr : en; },
  };
})(window);
