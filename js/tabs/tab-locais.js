/* =====================================================================
   Hounds — Aba: Localização (Mundo › Localização)
   ===================================================================== */

(function () {
  function locHref(id) {
    return '#loc~' + encodeURIComponent(id);
  }
  window.locHref = locHref;

  function renderLocaisPage() {
    var pageRoot = $('pageRoot');
    if (!pageRoot) return;

    var can = isMestre();
    var qVal = (window.S && window.S.ui && window.S.ui.locQ) || '';

    pageRoot.innerHTML =
      '<div class="head-row"><div>' + crumbsHtml('locais') + '<h1>Localização</h1>' +
      '<p class="lede">Os locais do mundo: cidades, castelos, florestas, vilas. Cada local pode ficar num mapa e ter personagens ligados a ele.</p></div>' +
      (can ? '<button class="btn primary" type="button" id="newLocBtn">' + svg(ICON.plus, 16, 2.4) + 'Novo local</button>' : '') +
      '</div>' + notice() +
      (W.locations.length ? '<div class="toolbar"><input class="search" id="locSearch" type="search" placeholder="Buscar por nome, mapa ou personagem…" autocomplete="off" value="' + esc(qVal) + '"><span class="meta" id="locCount"></span></div>' : '') +
      '<div id="locList"></div>';

    var b = $('newLocBtn');
    if (b) b.onclick = function () { openLocationForm(null); };

    var s = $('locSearch');
    if (s) {
      s.addEventListener('input', function () {
        if (!window.S) window.S = { ui: {} };
        window.S.ui.locQ = s.value;
        renderLocList();
      });
    }

    renderLocList();
  }

  function renderLocList() {
    var el = $('locList');
    if (!el) return;

    if (!W.loaded.locations) {
      el.innerHTML = '<p class="lede">Carregando locais…</p>';
      return;
    }
    if (!W.locations.length) {
      el.innerHTML = '<div class="empty-state">' + svg(ICON.pin, 34, 1.6) +
        '<strong>Nenhum local cadastrado</strong><span>' + (isMestre() ? 'Crie o primeiro com <b>Novo local</b>.' : 'Os locais criados vão aparecer aqui.') + '</span></div>';
      return;
    }

    var q = norm((window.S && window.S.ui && window.S.ui.locQ) || '');
    var list = W.locations.filter(function (l) {
      if (!isMestre() && isSecret(l)) return false;
      if (!q) return true;
      var nm = norm(l.name), desc = norm(l.description || '');
      var m = mapById(l.mapId), mnm = m ? norm(m.name) : '';
      var ch = charLocations(l.id).some(function (c) { return norm(c.name).indexOf(q) >= 0; });
      return nm.indexOf(q) >= 0 || desc.indexOf(q) >= 0 || mnm.indexOf(q) >= 0 || ch;
    }).sort(byName);

    var cnt = $('locCount');
    if (cnt) cnt.textContent = String(list.length);

    if (!list.length) {
      el.innerHTML = '<p class="lede">Nenhum local encontrado para essa busca.</p>';
      return;
    }

    el.innerHTML = '<div class="map-grid">' + list.map(function (l) {
      var m = mapById(l.mapId);
      var chars = (l.characterIds || []).length;
      var meta = [m ? esc(m.name) : 'Sem mapa', chars ? plural(chars, 'personagem', 'personagens') : ''].filter(Boolean).join(' · ');
      return '<a class="map-card" href="' + locHref(l.id) + '">' +
        '<div class="map-card-thumb">' + thumbSlot(l.image && l.image.ref, ICON.pin) + '</div>' +
        '<div class="map-card-body"><strong>' + esc(l.name) + (isSecret(l) ? ' ' + secretTag() : '') + '</strong>' +
        '<span class="meta">' + meta + '</span></div></a>';
    }).join('') + '</div>';

    fillImages(el);
  }

  function renderLocalPage() {
    var pageRoot = $('pageRoot');
    if (!pageRoot) return;

    var r = window.S ? window.S.route : null;
    var l = r ? locById(r.locId) : null;
    var ui = (window.S && window.S.ui) || {};

    if (!l) {
      pageRoot.innerHTML = crumbsHtml('locais') + (W.loaded.locations ? '<h1>Local não encontrado</h1><p class="lede">Esse local foi excluído ou o link está incompleto.</p><div><a class="btn" href="#locais">Voltar para Localização</a></div>' : '<p class="lede">Carregando local…</p>');
      return;
    }

    var can = isMestre();
    var m = mapById(l.mapId);
    var chars = (l.characterIds || []).map(charById).filter(Boolean);

    var head = crumbsHtml('loc:' + l.id) +
      '<div class="head-row"><div><span class="badge">' + svg(ICON.pin, 12, 2.4) + 'Local</span><h1>' + esc(l.name) + (isSecret(l) ? ' ' + secretTag() : '') + '</h1>' +
      (m ? '<p class="lede">No mapa <a class="inline" href="' + mapHref(m.id) + '">' + esc(m.name) + '</a>.</p>' : '<p class="lede">Sem mapa associado.</p>') +
      '</div>' +
      (can ? '<div class="btn-row"><button class="btn" type="button" id="editLocBtn">' + svg(ICON.edit, 15) + 'Editar local</button><button class="btn danger" type="button" id="delLocBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') +
      '</div>' +
      (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir <b>' + esc(l.name) + '</b>? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delLocYes">Excluir local</button><button class="btn ghost" type="button" id="delLocNo">Cancelar</button></div></div>' : '');

    var main = (l.image ? '<div class="loc-hero" id="locHero">' + svg(ICON.pin, 32, 1.6) + '</div>' : '') +
      '<section><h2 class="sec-title">Descrição</h2>' +
      (l.description ? '<p class="long">' + esc(l.description) + '</p>' : '<p class="long none">Sem descrição cadastrada.</p>') +
      '</section>';

    var side = '<div class="box"><h2 class="sec-title" style="margin:0">Personagens no local</h2>' +
      (chars.length ? '<div class="people">' + chars.map(personChip).join('') + '</div>' : '<p class="lede" style="font-size:13px">Nenhum personagem associado.</p>') +
      '</div>' +
      (m ? '<div class="box"><h2 class="sec-title" style="margin:0">Mapa</h2>' +
        '<a class="row-link" href="' + mapHref(m.id) + '">' + thumbSlot(m.image && m.image.ref, ICON.map) + '<span class="mtext"><b>' + esc(m.name) + '</b></span></a>' +
        '<div style="margin-top:8px;"><a class="btn primary" href="#map~' + encodeURIComponent(m.id) + '~explorar">' + svg(ICON.explore, 15) + 'Explorar no mapa</a></div></div>' : '');

    pageRoot.innerHTML = head + '<div class="loc-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';

    if (l.image) {
      W.store.imageUrl(l.image.ref).then(function (u) {
        var h = $('locHero');
        if (h && u) h.innerHTML = '<img src="' + esc(u) + '" alt="' + esc(l.name) + '">';
      });
    }
    fillImages(pageRoot);

    var e1 = $('editLocBtn');
    if (e1) e1.onclick = function () { openLocationForm(l); };

    var d1 = $('delLocBtn');
    if (d1) d1.onclick = function () { ui.confirmDelete = true; renderLocalPage(); };

    var dn = $('delLocNo');
    if (dn) dn.onclick = function () { ui.confirmDelete = false; renderLocalPage(); };

    var dy = $('delLocYes');
    if (dy) dy.onclick = function () {
      dy.disabled = true;
      Ops.deleteLocation(l).then(function () {
        toast('Local excluído.');
        if (window.go) window.go('#locais', true);
      }, function (er) {
        dy.disabled = false;
        toast(errorText(er), true);
      });
    };
  }

  function openLocationForm(l, presetMapId) {
    var editing = !!l;
    var mapOpts = '<option value="">Nenhum mapa</option>' + (W.maps || []).map(function (m) {
      var sel = (l && l.mapId === m.id) || (!l && presetMapId === m.id);
      return '<option value="' + esc(m.id) + '"' + (sel ? ' selected' : '') + '>' + esc(m.name) + '</option>';
    }).join('');

    var html = '<form id="locForm" novalidate><h2 id="lfTitle">' + (editing ? 'Editar local' : 'Novo local') + '</h2>' +
      '<div class="field" id="f_lname"><label for="lname">Nome do local</label><input type="text" id="lname" maxlength="100" autocomplete="off" placeholder="Ex.: Aldeia de Tagmar, Ruínas de Karkas" value="' + esc(editing ? l.name : '') + '"><div class="err" id="err_lname"></div></div>' +
      imageFieldHtml('limg', 'Imagem do local', 'Foto, brasão ou ilustração (opcional, até 20 MB).') +
      '<div class="field"><label for="ldesc">Descrição</label><textarea id="ldesc" rows="5" maxlength="20000" placeholder="História, habitantes, perigos e anotações do local…">' + esc(editing ? l.description || '' : '') + '</textarea></div>' +
      '<div class="field"><label for="lmap">Mapa associado</label><select id="lmap">' + mapOpts + '</select></div>' +
      flagHtml('lvis', l) +
      '<div class="form-err" id="lfErr" role="alert"></div>' +
      '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="lfCancel">Cancelar</button><button class="btn primary" type="submit" id="lfSave">' + (editing ? 'Salvar alterações' : 'Criar local') + '</button></div></form>';

    showModal(html);

    var f = $('locForm'), n = $('lname'), cancel = $('lfCancel');
    if (cancel) cancel.onclick = closeModal;

    var file = null;
    var fileInput = $('limg_file'), btnPick = $('limg_btn');
    if (btnPick && fileInput) {
      btnPick.onclick = function () { fileInput.click(); };
      fileInput.onchange = function () {
        if (fileInput.files && fileInput.files[0]) {
          file = fileInput.files[0];
          btnPick.querySelector('span').textContent = file.name;
        }
      };
    }

    f.onsubmit = function (e) {
      e.preventDefault();
      var name = n.value.trim();
      if (!name) {
        $('err_lname').textContent = 'Dê um nome ao local.';
        $('f_lname').classList.add('invalid');
        n.focus();
        return;
      }

      var mapId = $('lmap').value || null;
      var desc = $('ldesc').value.trim();
      var visible = flagVal('lvis', l);
      var btn = $('lfSave');
      btn.disabled = true;
      btn.textContent = 'Salvando…';

      var p = editing
        ? Ops.updateLocation(l, name, desc, mapId, l.characterIds || [], file, false, visible)
        : Ops.createLocation(name, desc, mapId, [], file, visible);

      p.then(function (id) {
        closeModal();
        toast(editing ? 'Local atualizado.' : 'Local criado.');
        if (window.go) window.go(locHref(editing ? l.id : id));
      }, function (err) {
        btn.disabled = false;
        btn.textContent = editing ? 'Salvar alterações' : 'Criar local';
        $('lfErr').textContent = errorText(err);
      });
    };
  }

  window.renderLocaisPage = renderLocaisPage;
  window.renderLocList = renderLocList;
  window.renderLocalPage = renderLocalPage;
  window.openLocationForm = openLocationForm;
})();
