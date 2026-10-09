/* =====================================================================
   Hounds — Aba: Configurações da Campanha
   - Cadastro de Usuários & Permissões
   - Importar & Exportar Banco de Dados
   - Log do Sistema & Depuração de Erros
   - Status de Sincronização em Tempo Real
   ===================================================================== */

(function () {
  'use strict';

  var activeTab = 'usuarios'; // 'usuarios' | 'banco' | 'logs'
  var logFilter = 'ALL';

  function renderConfiguracoesPage() {
    var pageRoot = $('pageRoot');
    if (!pageRoot) return;

    var u = window.hubUser;
    var isMaster = typeof isMestre === 'function' ? isMestre() : (u && u.role === 'mestre');

    var head = '<div class="head-row"><div>' +
      '<span class="badge">' + svg(ICON.settings, 12, 2.4) + 'Configurações</span>' +
      '<h1>Configurações da Campanha</h1>' +
      '<p class="lede">Gerencie permissões de usuários, faça backup/restauração do banco e consulte logs para depuração.</p>' +
      '</div></div>';

    // Tabs de navegação interna de configurações
    var navTabs = '<div class="cfg-tabs" role="tablist">' +
      '<button type="button" class="cfg-tab-btn' + (activeTab === 'usuarios' ? ' active' : '') + '" data-cfg="usuarios">' +
        svg(ICON.users, 16) + '<span>Usuários & Permissões</span>' +
      '</button>' +
      '<button type="button" class="cfg-tab-btn' + (activeTab === 'banco' ? ' active' : '') + '" data-cfg="banco">' +
        svg(ICON.download, 16) + '<span>Importar / Exportar Banco</span>' +
      '</button>' +
      '<button type="button" class="cfg-tab-btn' + (activeTab === 'logs' ? ' active' : '') + '" data-cfg="logs">' +
        svg(ICON.terminal, 16) + '<span>Logs do Sistema</span>' +
      '</button>' +
    '</div>';

    var content = '';
    if (activeTab === 'usuarios') {
      content = renderUsuariosSection(isMaster);
    } else if (activeTab === 'banco') {
      content = renderBancoSection(isMaster);
    } else if (activeTab === 'logs') {
      content = renderLogsSection();
    }

    pageRoot.innerHTML = head + navTabs + '<div class="cfg-content-wrap" id="cfgContent">' + content + '</div>';

    // Eventos de clique nas abas internas
    pageRoot.querySelectorAll('[data-cfg]').forEach(function (btn) {
      btn.onclick = function () {
        activeTab = btn.getAttribute('data-cfg');
        renderConfiguracoesPage();
      };
    });

    bindConfigEvents(isMaster);
  }

  /* ---------------------------------------------------------------------
     Seção 1: Usuários e Permissões
     --------------------------------------------------------------------- */
  function renderUsuariosSection(isMaster) {
    var list = (window.hubUsers && window.hubUsers()) || (window.W && window.W.users) || [];
    if (!list.length) {
      list = [
        { id: 'user-leandro', name: 'Leandro', role: 'mestre' },
        { id: 'user-jorio', name: 'Jorio', role: 'mestre' },
        { id: 'user-jogador', name: 'Jogador', role: 'jogador' },
        { id: 'user-espectador', name: 'Espectador', role: 'visualizador' }
      ];
    }

    var roleLabel = {
      mestre: { name: 'Mestre', desc: 'Acesso total. Edita campanha, gerencia combates, NPCs e usuários.', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
      jogador: { name: 'Jogador', desc: 'Participa do jogo. Controla seu personagem e visualiza itens públicos.', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.3)' },
      visualizador: { name: 'Espectador', desc: 'Apenas leitura. Visualiza a mesa de combate e itens públicos.', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)' }
    };

    var topBar = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
      '<div><h2 class="sec-title" style="margin:0 0 4px 0">Cadastro de Usuários</h2>' +
      '<p class="meta" style="font-size:13px;color:var(--muted)">Defina quem pode acessar a mesa e controle as permissões de Mestre, Jogador e Espectador.</p></div>' +
      (isMaster ? '<button class="btn primary" type="button" id="cfgAddUserBtn">' + svg(ICON.plus, 16, 2.4) + 'Novo Usuário</button>' : '') +
      '</div>';

    var usersGrid = '<div class="map-grid">' + list.map(function (u) {
      var r = roleLabel[u.role] || roleLabel.jogador;
      return '<div class="map-card" style="cursor:default;display:flex;flex-direction:column;justify-content:space-between;">' +
        '<div class="map-card-body">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
              '<div style="width:36px;height:36px;border-radius:10px;background:var(--accent);color:var(--accent-ink);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;">' +
                esc(typeof ini === 'function' ? ini(u.name) : u.name.slice(0, 2).toUpperCase()) +
              '</div>' +
              '<div><strong style="font-size:15px;display:block;">' + esc(u.name) + '</strong>' +
              (window.hubUser && window.hubUser.id === u.id ? '<span style="font-size:11px;color:var(--accent);font-weight:600;">(Você atualmente)</span>' : '') +
              '</div>' +
            '</div>' +
            '<span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;background:' + r.bg + ';color:' + r.color + ';border:1px solid ' + r.border + ';">' +
              esc(r.name) +
            '</span>' +
          '</div>' +
          '<p class="meta" style="font-size:12px;color:var(--muted);line-height:1.4;margin:6px 0 12px 0;">' + esc(r.desc) + '</p>' +
          (isMaster ? '<div class="btn-row" style="margin-top:auto;padding-top:10px;border-top:1px solid var(--line);">' +
            '<button class="btn" type="button" data-edit-user="' + esc(u.id) + '">' + svg(ICON.edit, 13) + 'Editar Permissão</button>' +
            (list.length > 1 ? '<button class="btn danger" type="button" data-del-user="' + esc(u.id) + '">' + svg(ICON.trash, 13) + 'Excluir</button>' : '') +
          '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('') + '</div>';

    return topBar + usersGrid;
  }

  /* ---------------------------------------------------------------------
     Seção 2: Importar / Exportar Banco
     --------------------------------------------------------------------- */
  function renderBancoSection(isMaster) {
    var storeKind = (window.W && window.W.store && window.W.store.kind) || 'local';
    var isSupabase = storeKind === 'supabase';

    return '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:20px;">' +
      // Card Exportar Banco
      '<div class="box" style="display:flex;flex-direction:column;justify-content:space-between;">' +
        '<div>' +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">' +
            '<div style="width:40px;height:40px;border-radius:10px;background:rgba(52,211,153,0.15);color:#34d399;display:flex;align-items:center;justify-content:center;">' +
              svg(ICON.download, 22) +
            '</div>' +
            '<div>' +
              '<h3 style="margin:0;font-size:17px;font-weight:700;">Exportar Banco Completo</h3>' +
              '<span class="meta" style="font-size:12px;color:var(--muted)">Download em formato JSON (.json)</span>' +
            '</div>' +
          '</div>' +
          '<p style="font-size:14px;color:var(--muted);line-height:1.5;margin-bottom:16px;">' +
            'Gera um arquivo de backup completo com todos os dados da campanha: personagens, locais, mapas, anotações, combates, logs e usuários cadastrados.' +
          '</p>' +
          '<div class="notice" style="margin-bottom:16px;font-size:13px;">' +
            'Ideal para salvar backups antes de sessões ou transferir para outros mestres.' +
          '</div>' +
        '</div>' +
        '<button class="btn primary solid" type="button" id="btnExportarBanco" style="width:100%;justify-content:center;padding:12px;">' +
          svg(ICON.download, 16) + '<span>Fazer Download do Banco (JSON)</span>' +
        '</button>' +
      '</div>' +

      // Card Importar Banco
      '<div class="box" style="display:flex;flex-direction:column;justify-content:space-between;">' +
        '<div>' +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">' +
            '<div style="width:40px;height:40px;border-radius:10px;background:rgba(245,158,11,0.15);color:#f59e0b;display:flex;align-items:center;justify-content:center;">' +
              svg(ICON.upload, 22) +
            '</div>' +
            '<div>' +
              '<h3 style="margin:0;font-size:17px;font-weight:700;">Importar Banco de Dados</h3>' +
              '<span class="meta" style="font-size:12px;color:var(--muted)">Restaurar backup JSON</span>' +
            '</div>' +
          '</div>' +
          '<p style="font-size:14px;color:var(--muted);line-height:1.5;margin-bottom:16px;">' +
            'Carrega um arquivo JSON de backup e sincroniza os dados no banco compartilhado e na mesa de combate.' +
          '</p>' +
          '<div class="notice" style="margin-bottom:16px;font-size:13px;border-color:rgba(245,158,11,0.3);background:rgba(245,158,11,0.08);">' +
            'Os novos dados serão sincronizados em tempo real com todos os jogadores conectados.' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<input type="file" id="inputImportarBanco" accept=".json,application/json" style="display:none">' +
          '<button class="btn primary" type="button" id="btnSelecionarArquivoImportar" style="width:100%;justify-content:center;padding:12px;">' +
            svg(ICON.upload, 16) + '<span>Selecionar Arquivo JSON</span>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Status de Sincronização em Tempo Real
    '<div class="box" style="margin-top:24px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
          '<div style="width:12px;height:12px;border-radius:50%;background:#10b981;box-shadow:0 0 10px #10b981;"></div>' +
          '<div>' +
            '<strong style="font-size:15px;display:block;">Sincronização em Tempo Real: ' + (isSupabase ? 'Supabase Nuvem Ativo' : 'Banco Local + BroadcastChannel Ativo') + '</strong>' +
            '<span class="meta" style="font-size:12px;color:var(--muted)">Todas as alterações feitas por você ou outros usuários são refletidas instantaneamente.</span>' +
          '</div>' +
        '</div>' +
        '<button class="btn" type="button" id="btnForcarSync">' + svg(ICON.refresh, 14) + '<span>Forçar Sincronização</span></button>' +
      '</div>' +
    '</div>';
  }

  /* ---------------------------------------------------------------------
     Seção 3: Logs do Sistema (Debug Log)
     --------------------------------------------------------------------- */
  function renderLogsSection() {
    var logs = window.AppLogger ? window.AppLogger.getLogs() : [];
    if (logFilter !== 'ALL') {
      logs = logs.filter(function (l) { return l.level === logFilter; });
    }

    var badgeStyles = {
      INFO: 'background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.3)',
      WARN: 'background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3)',
      ERROR: 'background:rgba(248,113,113,0.15);color:#f87171;border:1px solid rgba(248,113,113,0.3)',
      SYNC: 'background:rgba(52,211,153,0.15);color:#34d399;border:1px solid rgba(52,211,153,0.3)'
    };

    var topBar = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">' +
      '<div>' +
        '<h2 class="sec-title" style="margin:0 0 4px 0">Log do Sistema & Depuração</h2>' +
        '<p class="meta" style="font-size:13px;color:var(--muted)">Monitore eventos de sincronização, ações de usuários e eventuais erros em tempo real.</p>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button class="btn" type="button" id="btnCopiarLogs">' + svg(ICON.copy, 14) + 'Copiar Logs</button>' +
        '<button class="btn danger" type="button" id="btnLimparLogs">' + svg(ICON.trash, 14) + 'Limpar Logs</button>' +
        '<button class="btn" type="button" id="btnLogTeste">' + svg(ICON.terminal, 14) + 'Criar Log de Teste</button>' +
      '</div>' +
    '</div>';

    var filters = '<div style="display:flex;gap:8px;margin-bottom:14px;overflow-x:auto;">' +
      ['ALL', 'ERROR', 'SYNC', 'INFO', 'WARN'].map(function (f) {
        var label = f === 'ALL' ? 'Todos os Logs' : f;
        var active = logFilter === f;
        return '<button type="button" class="btn' + (active ? ' primary' : ' ghost') + '" style="font-size:12px;padding:4px 12px;" data-log-filter="' + f + '">' +
          label +
        '</button>';
      }).join('') +
    '</div>';

    var logsHtml = '<div style="background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px;max-height:450px;overflow-y:auto;font-family:monospace;font-size:12px;line-height:1.6;">';
    if (!logs.length) {
      logsHtml += '<div style="text-align:center;padding:40px;color:var(--muted);font-family:sans-serif;">Nenhum log registrado até o momento.</div>';
    } else {
      logsHtml += logs.map(function (l) {
        var d = new Date(l.timestamp);
        var timeStr = d.toLocaleTimeString('pt-BR') + '.' + String(d.getMilliseconds()).padStart(3, '0');
        var bStyle = badgeStyles[l.level] || badgeStyles.INFO;
        return '<div style="padding:8px 10px;border-bottom:1px solid var(--line);display:flex;gap:10px;align-items:flex-start;">' +
          '<span style="color:var(--muted);white-space:nowrap;">' + timeStr + '</span>' +
          '<span style="padding:1px 6px;border-radius:4px;font-weight:bold;font-size:10px;' + bStyle + '">' + l.level + '</span>' +
          '<span style="color:var(--accent);font-weight:600;">[' + esc(l.category) + ']</span>' +
          '<span style="flex:1;word-break:break-word;">' + esc(l.message) +
            (l.details ? '<pre style="margin:4px 0 0 0;padding:6px;background:var(--ground);border-radius:6px;font-size:11px;overflow-x:auto;">' + esc(l.details) + '</pre>' : '') +
          '</span>' +
          '<span style="color:var(--muted);font-size:11px;">' + esc(l.user || '') + '</span>' +
        '</div>';
      }).join('');
    }
    logsHtml += '</div>';

    return topBar + filters + logsHtml;
  }

  /* ---------------------------------------------------------------------
     Eventos de Formulários e Interações
     --------------------------------------------------------------------- */
  function bindConfigEvents(isMaster) {
    // 1. Usuários
    var addBtn = $('cfgAddUserBtn');
    if (addBtn) {
      addBtn.onclick = function () {
        if (window.openUserForm) window.openUserForm(null);
      };
    }

    document.querySelectorAll('[data-edit-user]').forEach(function (btn) {
      btn.onclick = function () {
        var uid = btn.getAttribute('data-edit-user');
        var list = (window.hubUsers && window.hubUsers()) || (window.W && window.W.users) || [];
        var u = list.find(function (x) { return x.id === uid; });
        if (u && window.openUserForm) window.openUserForm(u);
      };
    });

    document.querySelectorAll('[data-del-user]').forEach(function (btn) {
      btn.onclick = function () {
        var uid = btn.getAttribute('data-del-user');
        var list = (window.hubUsers && window.hubUsers()) || (window.W && window.W.users) || [];
        var u = list.find(function (x) { return x.id === uid; });
        if (!u) return;
        if (confirm('Tem certeza que deseja excluir o usuário "' + u.name + '"?')) {
          if (window.Ops && window.Ops.deleteUser) {
            window.Ops.deleteUser(u.id).then(function () {
              if (window.AppLogger) window.AppLogger.info('USUARIOS', 'Usuário excluído: ' + u.name);
              toast('Usuário removido.');
              renderConfiguracoesPage();
            }, function (er) { toast(errorText(er), true); });
          }
        }
      };
    });

    // 2. Exportar / Importar
    var btnExp = $('btnExportarBanco');
    if (btnExp) {
      btnExp.onclick = function () {
        try {
          if (window.exportDatabase) {
            window.exportDatabase();
            toast('Backup gerado e baixado com sucesso!');
          }
        } catch (e) {
          toast('Erro ao exportar banco: ' + e.message, true);
        }
      };
    }

    var btnPick = $('btnSelecionarArquivoImportar');
    var inputImp = $('inputImportarBanco');
    if (btnPick && inputImp) {
      btnPick.onclick = function () { inputImp.click(); };
      inputImp.onchange = function () {
        if (inputImp.files && inputImp.files[0]) {
          var file = inputImp.files[0];
          var reader = new FileReader();
          reader.onload = function (ev) {
            var content = ev.target.result;
            btnPick.disabled = true;
            btnPick.querySelector('span').textContent = 'Importando dados...';
            if (window.importDatabase) {
              window.importDatabase(content).then(function () {
                toast('Banco de dados importado e sincronizado com sucesso!');
                btnPick.disabled = false;
                btnPick.querySelector('span').textContent = 'Selecionar Arquivo JSON';
                renderConfiguracoesPage();
              }).catch(function (err) {
                btnPick.disabled = false;
                btnPick.querySelector('span').textContent = 'Selecionar Arquivo JSON';
                toast('Erro na importação: ' + err.message, true);
              });
            }
          };
          reader.readAsText(file);
        }
      };
    }

    var btnSync = $('btnForcarSync');
    if (btnSync) {
      btnSync.onclick = function () {
        btnSync.disabled = true;
        if (window.AppLogger) window.AppLogger.sync('MANUAL_SYNC', 'Forçando re-sincronização de todos os canais');
        if (typeof BroadcastChannel !== 'undefined') {
          try {
            var bc = new BroadcastChannel('hounds_world_realtime_sync');
            bc.postMessage({ col: 'all', timestamp: Date.now() });
          } catch (e) {}
        }
        try { localStorage.setItem('hounds_sync_ping_v1', 'all:' + Date.now()); } catch (e) {}
        setTimeout(function () {
          btnSync.disabled = false;
          toast('Dados sincronizados em tempo real!');
        }, 500);
      };
    }

    // 3. Logs
    document.querySelectorAll('[data-log-filter]').forEach(function (btn) {
      btn.onclick = function () {
        logFilter = btn.getAttribute('data-log-filter');
        renderConfiguracoesPage();
      };
    });

    var btnCopy = $('btnCopiarLogs');
    if (btnCopy) {
      btnCopy.onclick = function () {
        var logs = window.AppLogger ? window.AppLogger.getLogs() : [];
        navigator.clipboard.writeText(JSON.stringify(logs, null, 2)).then(function () {
          toast('Logs copiados para a área de transferência!');
        });
      };
    }

    var btnClear = $('btnLimparLogs');
    if (btnClear) {
      btnClear.onclick = function () {
        if (confirm('Deseja limpar todos os registros de log?')) {
          if (window.AppLogger) window.AppLogger.clearLogs();
          toast('Logs limpos.');
          renderConfiguracoesPage();
        }
      };
    }

    var btnTeste = $('btnLogTeste');
    if (btnTeste) {
      btnTeste.onclick = function () {
        if (window.AppLogger) {
          window.AppLogger.info('TESTE_DEBUG', 'Teste de log manual executado com sucesso', { userAgent: navigator.userAgent });
          renderConfiguracoesPage();
        }
      };
    }
  }

  window.renderConfiguracoesPage = renderConfiguracoesPage;
})();
