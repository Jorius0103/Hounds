/* =====================================================================
   Hounds — Aba: Mesa de Combate (Dash RPG / Ficha de Combate)
   ===================================================================== */

(function () {
  var mesaFor = null;

  function mesaSource() {
    // Carrega de mesa.html
    return 'mesa.html';
  }

  function syncMesa() {
    var frame = $('mesaFrame');
    if (!frame) return;

    if (!window.hubUser || location.hash !== '#mesa') return;

    if (mesaFor === window.hubUser.id) {
      try {
        var fw = frame.contentWindow;
        if (fw && fw.__mesaOpenPicker) fw.__mesaOpenPicker();
      } catch (e) {}
      return;
    }

    var who = mesaFor = window.hubUser.id;
    var go = function () {
      if (mesaFor === who) {
        if (!frame.src || frame.src.indexOf('mesa.html') < 0) {
          frame.src = mesaSource();
        }
      }
    };

    if (window.hubMesaPrepare) window.hubMesaPrepare().then(go, go);
    else go();
  }

  function renderMesaCombate() {
    var vMesa = $('view-mesa');
    if (!vMesa) return;

    vMesa.hidden = false;
    syncMesa();
  }

  window.addEventListener('hashchange', syncMesa);

  window.renderMesaCombate = renderMesaCombate;
  window.syncMesa = syncMesa;
})();
