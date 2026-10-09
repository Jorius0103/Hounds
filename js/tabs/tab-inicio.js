/* =====================================================================
   Hounds — Aba: Início / Tela Inicial da Campanha
   - Usuário Logado & Opção de Sair
   - Acesso Rápido às 4 Abas (Mesa de Combate, Personagens, Locais, Anotações)
   - Opções de Configurações (Usuários/Permissões, Importar/Exportar, Logs)
   - Itens Atualizados Recentemente
   ===================================================================== */

(function () {
  'use strict';

  function renderHomePage() {
    var pageRoot = $('pageRoot');
    if (!pageRoot) return;

    var u = window.hubUser;
    var isMaster = typeof isMestre === 'function' ? isMestre() : (u && u.role === 'mestre');

    var count = function (kind, n, one, many) {
      return (window.W && window.W.loaded && window.W.loaded[kind]) ? (n ? plural(n, one, many) : 'Nenhum ainda') : 'Carregando…';
    };

    var roleTitle = {
      mestre: 'Mestre',
      jogador: 'Jogador',
      visualizador: 'Espectador'
    };

    var uRole = u ? (roleTitle[u.role] || u.role) : 'Visitante';
    var uInitials = u ? (typeof ini === 'function' ? ini(u.name) : u.name.slice(0, 2).toUpperCase()) : '?';

    // 1. Cabeçalho & Card de Identificação do Usuário com Botão Sair
    var BRAND_SVG = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>';

    var userCard = '<div class="box" style="margin-bottom:24px;border:1px solid var(--line-2);background:linear-gradient(135deg, var(--surface) 0%, rgba(245,158,11,0.06) 100%);padding:18px 22px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">' +
        '<div style="display:flex;align-items:center;gap:16px;">' +
          '<div style="width:52px;height:52px;border-radius:14px;background:var(--accent);color:var(--accent-ink);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;box-shadow:0 4px 12px rgba(245,158,11,0.3);">' +
            esc(uInitials) +
          '</div>' +
          '<div>' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">' +
              '<h2 style="margin:0;font-size:20px;font-weight:700;">' + (u ? 'Olá, ' + esc(u.name) : 'Bem-vindo ao Hounds') + '</h2>' +
              '<span class="badge" style="font-size:11px;padding:2px 8px;border-radius:6px;background:rgba(245,158,11,0.15);color:var(--accent);border:1px solid rgba(245,158,11,0.3);">' + esc(uRole) + '</span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);">' +
              '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 6px #10b981;"></span>' +
              '<span>Sincronização em tempo real ativa</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="btn-row">' +
          '<a class="btn" href="#configuracoes">' + svg(ICON.settings, 15) + '<span>Configurações</span></a>' +
          '<button class="btn danger" type="button" id="homeLogoutBtn" title="Encerrar sessão ou trocar de usuário">' +
            svg(ICON.x, 15) + '<span>Sair</span>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';

    // 2. As 4 Abas Principais da Aplicação
    var cardHelper = function (href, icon, title, desc, meta, isFeature) {
      return '<a class="nb-card' + (isFeature ? ' feature' : '') + '" href="' + href + '" style="display:flex;flex-direction:column;justify-content:space-between;min-height:140px;">' +
        '<div>' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
            '<span class="ico">' + svg(icon, 22) + '</span>' +
            '<span style="font-size:12px;color:var(--accent);font-weight:600;">' + esc(meta) + '</span>' +
          '</div>' +
          '<div class="txt">' +
            '<strong style="font-size:16px;margin-bottom:4px;">' + esc(title) + '</strong>' +
            '<span style="font-size:13px;color:var(--muted);line-height:1.4;">' + esc(desc) + '</span>' +
          '</div>' +
        '</div>' +
        '<div style="margin-top:12px;font-size:12px;font-weight:600;color:var(--accent);display:flex;align-items:center;gap:4px;">' +
          '<span>Acessar aba</span> ' + svg(ICON.arrow, 12) +
        '</div>' +
      '</a>';
    };

    var charsCount = count('characters', (W.characters || []).length, 'personagem', 'personagens');
    var locsCount = count('locations', (W.locations || []).length, 'local', 'locais');
    var notesCount = !W.loaded.notebooks ? 'Carregando…' : (W.notebooks || []).length ? plural(W.notebooks.length, 'caderno', 'cadernos') + ' · ' + plural((W.notes || []).length, 'anotação', 'anotações') : 'Nenhuma anotação';

    var cardsGrid = '<div class="nb-grid" style="grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:16px;margin-bottom:28px;">' +
      cardHelper('#mesa', ICON.mesa, 'Mesa de Combate', 'Nosso sistema de combate adaptado: fichas completas, rolagem de dados, PV, Fadiga e log de rounds em tempo real.', 'Combate Ativo', true) +
      cardHelper('#personagens', ICON.user, 'Personagens', 'Dossiês de heróis, aliados e NPCs da campanha com vínculos e detalhes.', charsCount, false) +
      cardHelper('#locais', ICON.pin, 'Locais', 'Explore cidades, pontos de interesse, tavernas e territórios da campanha.', locsCount, false) +
      cardHelper('#anotacoes', ICON.notes, 'Anotações', 'Cadernos de anotações, diários de sessão, regras da casa e pistas.', notesCount, false) +
    '</div>';

    // 3. Painel de Configurações (Usuários, Importar/Exportar, Logs)
    var configSection = '<div class="box" style="margin-bottom:28px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--line);">' +
        '<div>' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span style="color:var(--accent);">' + svg(ICON.settings, 20) + '</span>' +
            '<h2 class="sec-title" style="margin:0;">Configurações & Administração</h2>' +
          '</div>' +
          '<p class="meta" style="font-size:13px;color:var(--muted);margin-top:2px;">Controle de usuários e permissões, backup do banco e logs de depuração do sistema.</p>' +
        '</div>' +
        '<a class="btn primary" href="#configuracoes">Abrir Painel Completo</a>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(250px, 1fr));gap:14px;">' +
        // Card Usuários & Permissões
        '<div style="background:var(--ground);padding:14px;border-radius:12px;border:1px solid var(--line);display:flex;flex-direction:column;justify-content:space-between;">' +
          '<div>' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
              '<span style="color:#f59e0b;">' + svg(ICON.users, 16) + '</span>' +
              '<strong style="font-size:14px;">Usuários & Permissões</strong>' +
            '</div>' +
            '<p style="font-size:12px;color:var(--muted);line-height:1.4;margin:0 0 10px 0;">Cadastre participantes e defina acessos de Mestre, Jogador ou Espectador.</p>' +
          '</div>' +
          '<a class="btn" href="#configuracoes" style="font-size:12px;padding:6px 12px;justify-content:center;">Gerenciar Usuários</a>' +
        '</div>' +

        // Card Importar / Exportar Banco
        '<div style="background:var(--ground);padding:14px;border-radius:12px;border:1px solid var(--line);display:flex;flex-direction:column;justify-content:space-between;">' +
          '<div>' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
              '<span style="color:#10b981;">' + svg(ICON.download, 16) + '</span>' +
              '<strong style="font-size:14px;">Importar / Exportar Banco</strong>' +
            '</div>' +
            '<p style="font-size:12px;color:var(--muted);line-height:1.4;margin:0 0 10px 0;">Backup completo de fichas, combates, locais e notas em formato JSON.</p>' +
          '</div>' +
          '<div style="display:flex;gap:6px;">' +
            '<button class="btn" type="button" id="homeQuickExportBtn" style="font-size:12px;padding:6px 10px;flex:1;justify-content:center;">Exportar</button>' +
            '<button class="btn" type="button" id="homeQuickImportBtn" style="font-size:12px;padding:6px 10px;flex:1;justify-content:center;">Importar</button>' +
          '</div>' +
        '</div>' +

        // Card Logs do Sistema
        '<div style="background:var(--ground);padding:14px;border-radius:12px;border:1px solid var(--line);display:flex;flex-direction:column;justify-content:space-between;">' +
          '<div>' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
              '<span style="color:#38bdf8;">' + svg(ICON.terminal, 16) + '</span>' +
              '<strong style="font-size:14px;">Log do Sistema (Debug)</strong>' +
            '</div>' +
            '<p style="font-size:12px;color:var(--muted);line-height:1.4;margin:0 0 10px 0;">Acompanhe erros, eventos de sincronização e ações para facilitar depuração.</p>' +
          '</div>' +
          '<a class="btn" href="#configuracoes" style="font-size:12px;padding:6px 12px;justify-content:center;">Ver Logs</a>' +
        '</div>' +
      '</div>' +
    '</div>';

    // 4. Seção de Itens Atualizados Recentemente
    var recent = [].concat(
      (W.characters || []).map(function (c) { return { t: c.updatedAt || c.createdAt, href: charHref(c.id), icon: ICON.user, name: c.name, kind: 'Personagem' }; }),
      (W.locations || []).map(function (l) { return { t: l.updatedAt || l.createdAt, href: locHref(l.id), icon: ICON.pin, name: l.name, kind: 'Local' }; }),
      (W.notes || []).map(function (n) { return { t: n.updatedAt || n.createdAt, href: hrefFor('note:' + n.id), icon: ICON.note, name: n.title, kind: 'Anotação' }; })
    ).sort(function (a, b) { return (b.t || 0) - (a.t || 0); }).slice(0, 5);

    var recentHtml = recent.length ? '<div class="note-list">' + recent.map(function (x) {
      return '<a class="note-row" href="' + x.href + '">' +
        '<span class="ico">' + svg(x.icon, 18) + '</span>' +
        '<span class="txt"><strong>' + esc(x.name || 'Sem título') + '</strong>' +
        '<span class="meta">' + esc(x.kind) + (x.t ? ' · atualizado em ' + esc(fmtDate(x.t)) : '') + '</span></span>' +
      '</a>';
    }).join('') + '</div>' : '<div class="empty-state">' + svg(ICON.notes, 34, 1.6) + '<strong>Nenhum item recente</strong><span>Itens criados aparecerão aqui automaticamente.</span></div>';

    var recentSection = '<section><h2 class="sec-title">Atualizados Recentemente</h2>' + recentHtml + '</section>';

    pageRoot.innerHTML = userCard + cardsGrid + configSection + recentSection;

    // Eventos
    var btnLogout = $('homeLogoutBtn');
    if (btnLogout) {
      btnLogout.onclick = function () {
        if (window.hubSwitchUser) window.hubSwitchUser();
        else if (window.openGate) window.openGate();
      };
    }

    var btnQExport = $('homeQuickExportBtn');
    if (btnQExport) {
      btnQExport.onclick = function () {
        if (window.exportDatabase) {
          window.exportDatabase();
          toast('Backup do banco exportado com sucesso!');
        }
      };
    }

    var btnQImport = $('homeQuickImportBtn');
    if (btnQImport) {
      btnQImport.onclick = function () {
        if (window.go) window.go('#configuracoes');
      };
    }
  }

  window.renderHomePage = renderHomePage;
})();
