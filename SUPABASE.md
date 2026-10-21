# Banco de dados no Supabase

Com o Supabase configurado, o Hounds guarda mapas, marcadores, locais, personagens, fichas, organizações, eventos, anotações, usuários, os catálogos de GURPS e a Mesa de Combate em **tabelas relacionais do PostgreSQL**. As imagens ficam no **Supabase Storage**, e as mudanças da Mesa de Combate e dos Tabuleiros chegam aos outros navegadores pelo **Realtime**.

A estrutura do banco está nas migrations versionadas de [supabase/migrations/](supabase/migrations/), que são executadas em ordem.

---

## 1. Estrutura

### Tabelas principais

| Tabela | O que guarda | Vínculos |
|---|---|---|
| `usuarios` | Contas do hub (`papel`: mestre, jogador ou visualizador). | `ficha_id` → `fichas` (a ficha da conta, uma só; nula quando a ficha é excluída). |
| `mapas` | Mapas e a referência da imagem no Storage (`imagem_ref`). | `mapa_pai_id` → `mapas`: hierarquia sem limite de níveis, com bloqueio de ciclo. |
| `marcadores` | Marcadores sobre a imagem de um mapa (`x`, `y` de 0 a 1). | `mapa_id` → `mapas` (exclusão em cascata), `local_id` → `locais`, `mapa_vinculado_id` → `mapas`. |
| `locais` | Locais, com até duas imagens. | `mapa_id` → `mapas`, `local_pai_id` → `locais` (hierarquia, sem ciclo). |
| `personagens` | Personagens. | `ficha_id` → `fichas`, **UNIQUE**: no máximo uma ficha por personagem e cada ficha em um personagem só. |
| `fichas` | Fichas de GURPS: atributos e defesas em colunas. `tipo` é `principal` ou `aliado`: um aliado é uma ficha completa, mostrada numa aba da ficha principal, com o nome da aba em `aliado_nome`. | Perícias, culturas, vantagens, desvantagens, peculiaridades, reações, pontos, estilos, itens de combate e armas em `ficha_*`. `ficha_principal_id` → `fichas` (só nos aliados, exclusão em cascata): o vínculo não muda depois de criado, não existe aliado de aliado e a ficha de um aliado não é vinculada a personagem. |
| `organizacoes` | Organizações. | — |
| `eventos` | Eventos. A data é `data_texto` (texto livre, no calendário da campanha). | `local_id` → `locais`. |
| `cadernos`, `anotacoes` | Títulos e anotações (do menu Anotações ou, com `ficha_id`, da aba Anotações de uma ficha). | `anotacoes.caderno_id` → `cadernos` e `cadernos.ficha_id` → `fichas` (exclusão em cascata). |
| `magias`, `vantagens`, `desvantagens`, `pericias`, `tecnicas`, `estilos`, `armas`, `armaduras`, `itens`, `melhoramentos` | O que o Mestre criou ou mudou nos catálogos (os livros continuam em `dados/*.json`). | Os ataques de cada arma em `arma_ataque`. |
| `armadura_localizacoes` | Dados de referência de Criar Armadura (GURPS Low-Tech, pp. 100-101): as localizações com o percentual do tronco, as subdivisões e as partes do corpo. Vêm da migration; só o Mestre pode mudá-las. | `pai` → `armadura_localizacoes`; as peças apontam para a localização. |
| `tabuleiros` | Tabuleiros (mapas de batalha): a imagem, a grade, as opções de luz e névoa, as paredes e portas (`paredes`, JSONB), as áreas reveladas pelo Mestre (`nevoa_areas`, JSONB) e as áreas já vistas pelos jogadores (`explorado`, bits em base64, com `explorado_versao`). | Contas que veem um tabuleiro oculto em `tabuleiro_compartilhamento`. |
| `tabuleiro_tokens` | Os tokens de cada tabuleiro, uma linha por token (cada movimento grava só o token que andou): posição, direção (graus), tamanho, camada (`map`, `tokens`, `gm` ou `fore`, o primeiro plano), imagem, PV, PF, marcadores de estado (`marcadores`, JSONB), visão e luz. | `tabuleiro_id` → `tabuleiros` (exclusão em cascata), `personagem_id` → `personagens`; as contas que controlam o token em `tabuleiro_token_dono`. |
| `tabuleiro_desenhos` | Os desenhos e textos de cada tabuleiro (ferramentas Desenhar e Texto), um por linha: tipo, camada, pontos, cores, espessura e, nos textos, o texto, a fonte e o tamanho. | `tabuleiro_id` → `tabuleiros` (exclusão em cascata). |
| `tabuleiro_turnos` | A ordem de turno de cada tabuleiro (o id é o do tabuleiro): os itens na ordem de agir (`itens`, JSONB: token ou item avulso e o valor), o item da vez (`vez`), a rodada e se o Mestre a abriu (`aberto`). | `id` → `tabuleiros` (exclusão em cascata). |
| `tabuleiro_arte` | A biblioteca de arte do Mestre: imagens para tokens e cenários, com nome e pasta. | — |
| `tabuleiro_campanha` | Uma linha só (`mesa`): o tabuleiro dos jogadores (a fita, `pagina_jogadores`), quem está num tabuleiro diferente do grupo (`paginas_jogador`, JSONB) e a ordem das páginas (`ordem_paginas`). | `pagina_jogadores` → `tabuleiros` (vira nulo se o tabuleiro for excluído). |
| `chat_mensagens` | O chat da mesa (um para todos os tabuleiros): tipo (fala, ação, descrição, rolagem), texto, o nome com que aparece, o personagem, o tabuleiro de onde saiu, os destinatários do sussurro (`para`, TEXT[]), se é só para o Mestre (`so_mestre`) ou secreta, e as rolagens (`rolagem` e `rolagens_texto`, JSONB) que o próprio banco rola (`rolar_dados`). Uma mensagem não muda depois de gravada. | `autor_id` → `usuarios`, `personagem_id` → `personagens`, `tabuleiro_id` → `tabuleiros` (viram nulos se o item for excluído). |
| `mesa_estado`, `mesa_partes` | Estado da Mesa de Combate: o registro da revisão e o estado em partes (veja a seção 6). | — |

### Tabelas de vínculo

Todas têm chave primária composta, que impede vínculo repetido, e chaves estrangeiras com `ON DELETE CASCADE`.

| Tabela | Relação |
|---|---|
| `personagem_organizacao` | Personagem ↔ organização, com o `cargo`. Um personagem em várias organizações. |
| `organizacao_local` | Organização ↔ locais. |
| `organizacao_mapa` | Organização ↔ mapas. |
| `evento_personagem` | Evento ↔ personagens que participaram. |
| `local_personagem` | Local ↔ personagens que vivem ou costumam estar nele. |
| `personagem_mapa` | Personagem ↔ mapas onde aparece. |
| `personagem_relacao` | Personagem ↔ personagem, com o `tipo` (não pode ser consigo mesmo). |
| `<entidade>_compartilhamento` | Contas que veem um item oculto (`visivel = false`). |
| `ficha_pericia`, `ficha_cultura`, `ficha_vantagem`, `ficha_vantagem_pericia`, `ficha_desvantagem`, `ficha_peculiaridade`, `ficha_estilo`, `ficha_item_combate`, `ficha_arma`, `ficha_equipamento` | Seções da ficha, na ordem em que aparecem. |
| `ficha_corpo`, `ficha_corpo_item` | Configurações de corpo da ficha (no máximo uma `em_uso`, por índice único) e o que cada uma tem em cada parte do corpo. |
| `ficha_mochila`, `ficha_mochila_item` | Mochilas da ficha (no máximo uma `em_uso`, por índice único), a linha da lista que é a própria mochila e o que cada uma leva, com a quantidade. |
| `ficha_casa`, `ficha_casa_item` | Casas da ficha (o que o personagem guarda e não leva; nunca entra na carga) e o que cada uma guarda, com a quantidade. Somando as casas e as mochilas, não mais do que a lista tem. |
| `ficha_armadura`, `ficha_armadura_mod`, `ficha_armadura_peca` | Conjuntos de armadura modular da ficha (Criar Armadura): o modelo base como era ao criar, os ajustes livres (texto ou magia, com o que somam na RD, no custo e no peso) e as peças calculadas, cada uma ligada à linha da lista de equipamentos que ela é. |
| `ficha_arma_criada`, `ficha_arma_criada_ataque`, `ficha_arma_criada_mod` | Armas de Criar Arma da ficha: a arma do livro como era ao criar, os ataques (dano do livro e ajustado), os ajustes e a linha da lista de equipamentos que é a arma. |
| `ficha_escudo`, `ficha_escudo_mod` | Escudos de Criar Escudo da ficha: o escudo como era ao criar, os ajustes, o resultado (BD, RD, PV, custo, peso) e a linha da lista de equipamentos que é o escudo. |
| `arma_ataque` | Ataques de uma arma do catálogo (uma linha da tabela do livro cada), na ordem. Sem nenhum, os ataques seguem o livro. |

### Leitura e gravação

- **Leitura:** cada tabela principal tem uma view `<tabela>_doc` que junta a tabela e os vínculos dela e devolve o item já montado, no formato que as páginas usam. Assim os componentes do site continuam iguais.
- **Gravação:** só pelas funções `hounds_put`, `hounds_patch`, `hounds_remove`, `hounds_remove_many` e `hounds_trocar_imagem_mapa`. Cada chamada roda numa transação: a tabela principal e todos os vínculos mudam juntos, ou nada muda. As funções:
  - validam os campos com as mesmas regras do site;
  - ignoram ids de itens que não existem mais;
  - nas exclusões, seguem as regras de cada entidade. Os submapas e locais de um mapa excluído sobem para o mapa pai. Os sublocais de um local excluído sobem. Um personagem excluído sai das organizações, locais e eventos. A troca da imagem de um mapa exclui os marcadores dele e, se houver marcadores, só acontece com confirmação.
- **Imagens:** ficam no bucket `hounds-images` do Storage. A tabela guarda só o caminho (`imagem_ref`) e os dados da imagem.

---

## 2. Aplicar as migrations

| Ordem | Arquivo | O que faz |
|---|---|---|
| 1 | `20261014120000_base_hounds_docs.sql` | Tabela antiga `hounds_docs` e bucket de imagens (o antigo `supabase-setup.sql`). |
| 2 | `20261014120100_tabelas_relacionais.sql` | Tabelas, chaves, restrições, índices, triggers e Realtime. |
| 3 | `20261014120200_visoes_documentos.sql` | Views `<tabela>_doc`. |
| 4 | `20261014120300_funcoes_gravacao.sql` | Funções de gravação (RPC). |
| 5 | `20261014120400_seguranca_rls.sql` | RLS e permissões. |
| 6 | `20261014120500_migrar_dados.sql` | Deixa o `hounds_docs` só leitura, copia os dados e mostra a validação. |
| 7 | `20261015120000_autenticacao.sql` | Login com email e senha e permissões de Mestre e Jogador no banco (seção 4). |
| 8 | `20261016120000_contas_pelo_site.sql` | Apoio à Edge Function `contas`, com que o Mestre cria contas e define senhas pelo site (seção 4). |
| 9 | `20261017120000_perfil_admin.sql` | Perfil Admin: um Jogador que também gerencia os usuários (seção 4). |
| 10 | `20261018120000_ficha_equipamentos.sql` | Seção Equipamentos da ficha: tabela `ficha_equipamento`, view `fichas_doc` e função `salvar_ficha` com a lista nova. |
| 11 | `20261019120000_notas_bonus.sql` | Motivo dos bônus da ficha (perícias, itens de combate e defesas), que antes se perdia ao salvar. |
| 12 | `20261020120000_armas_armaduras.sql` | Catálogos de armas e armaduras: tabelas `armas`, `arma_ataque` e `armaduras`, views e gravação. **Rode antes de publicar** a versão do site com as abas Armas e Armaduras, que lê essas tabelas. |
| 13 | `20261021120000_desvantagens.sql` | Catálogo de desvantagens: tabela `desvantagens`, view e gravação. **Rode antes de publicar** a versão do site com a aba Desvantagens, que lê essa tabela. |
| 14 | `20261022120000_itens.sql` | Catálogo de itens (equipamentos): tabela `itens`, view e gravação. **Rode antes de publicar** a versão do site com a aba Itens, que lê essa tabela. |
| 15 | `20261023120000_ficha_corpo_mochilas.sql` | Aba Equip. da ficha: a lista de equipamentos ganha id, tipo (item, armadura, arma) e a entrada do catálogo; tabelas de Corpo e Mochilas, com chaves estrangeiras `(ficha_id, equipamento_id)` para a lista da própria ficha, uma configuração em uso no máximo e a conferência das quantidades em `salvar_ficha`. O que estava marcado como Carregado vira a mochila em uso "Itens carregados" (a carga não muda) e a coluna `carregado` sai. **Rode antes de publicar** a versão do site com a aba nova. |
| 16 | `20261024120000_armaduras_modulares.sql` | Criar Armadura: tabela de referência (localizações e percentuais) e as dos conjuntos e peças da ficha; `salvar_ficha` recusa localizações sobrepostas no mesmo conjunto, cobertura frontal onde não cabe e peça cuja linha na lista não tem o peso e o custo calculados. **Rode antes de publicar** a versão do site com Criar Armadura. |
| 17 | `20261025120000_armaduras_ajustes_livres.sql` | Criar Armadura com ajustes livres (texto ou magia, somando ou tirando RD, custo e peso) no lugar da lista fixa de modificadores. Converte um banco que rodou a primeira versão da 16 (cada modificador vira um ajuste com os valores que ele dava; as peças não mudam) e tira a tabela `armadura_modificadores`. Num banco com a 16 atual, só regrava as funções, sem efeito. |
| 18 | `20261026120000_armaduras_ajuste_peso_pct.sql` | O peso dos ajustes de Criar Armadura passa a ser % do peso da peça (coluna `peso_pct`); os valores gravados em lbs são convertidos e as peças não mudam. Pode rodar de novo sem efeito. |
| 19 | `20261027120000_ficha_criar_arma.sql` | Criar Arma: tabelas `ficha_arma_criada` (a arma do livro como era ao criar, custo e peso calculados e a linha da lista que é a arma), `ficha_arma_criada_ataque` (os ataques, com o dano do livro e o ajustado) e `ficha_arma_criada_mod` (os ajustes: dano, custo em $ e peso em %). **Rode antes de publicar** a versão do site com Criar Arma. |
| 20 | `20261028120000_criar_arma_nh.sql` | Criar Arma: os ajustes ganham o NH (coluna `nh` em `ficha_arma_criada_mod`), somado ao NH da perícia do ataque. Pode rodar de novo sem efeito. |
| 21 | `20261029120000_corpo_oito_partes.sql` | Corpo com 8 partes (Cabeça, Pescoço, Tronco, Virilha, Braços, Mãos, Pernas, Pés) só para armaduras, e armas, escudos e itens fora das partes (`carry`). Converte o que já está no corpo e as localizações de Criar Armadura. Pode rodar de novo sem efeito. |
| 22 | `20261030120000_ficha_criar_escudo.sql` | Criar Escudo: tabelas `ficha_escudo` (o escudo do livro ou digitado como era ao criar, o resultado e a linha da lista que é o escudo) e `ficha_escudo_mod` (os ajustes: BD, RD, NH, custo em $ e peso em %). **Rode antes de publicar** a versão do site com Criar Escudo. |
| 23 | `20261031120000_mochila_uma_em_uso.sql` | Mochilas: só uma em uso por ficha (índice único, como o Corpo). Numa ficha que já tem mais de uma em uso, fica a primeira; as outras passam a guardadas. **Rode antes de publicar** a versão do site com as abas de Mochilas. |
| 26 | `20261103120000_melhoramentos.sql` | Catálogo de melhoramentos (modificadores de armas, escudos, armaduras, roupas e equipamentos: Balanced, Fine, Dwarven, Ornate...): tabela `melhoramentos`, view e gravação. **Rode antes de publicar** a versão do site com a aba Melhoramentos, que lê essa tabela. |
| 27 | `20261104120000_ficha_casas.sql` | Aba Equip. › Casa: tabelas `ficha_casa` e `ficha_casa_item` (como as mochilas, sem a própria e sem em uso), view `fichas_doc` e `salvar_ficha` com as casas; somando mochilas e casas, ninguém guarda mais do que a lista tem. **Rode antes de publicar** a versão do site com a Casa. |
| 28 | `20261105120000_ajustes_melhoramentos.sql` | Ajustes de Criar Armadura, Arma e Escudo com melhoramentos: colunas `cf` (fator de custo, B274), `melhoramento_id` e, nas armas, `so_corte_perf` (dano só nos ataques de corte e perfuração); view `fichas_doc` e `salvar_ficha` com elas. Os ajustes gravados antes ficam com CF 0 e o resultado não muda. **Rode antes de publicar** a versão do site com os melhoramentos nos ajustes. |

| 29 | `20261106120000_ficha_aliados.sql` | Aliados da ficha (botão **Criar Aliado**): colunas `tipo`, `ficha_principal_id` e `aliado_nome` em `fichas`, com as restrições e os triggers do vínculo; view `fichas_doc` (com `allyOf` e `allyName`; um aliado tem a visibilidade, o compartilhamento e o dono da ficha principal, e as permissões seguem as dela) e `salvar_ficha` (criar um aliado exige poder ver a ficha principal). As fichas que já existem ficam como principais. Excluir uma ficha principal exclui os aliados dela. **Rode antes de publicar** a versão do site com os aliados. |
| 30 | `20261107120000_realtime_so_mesa.sql` | Realtime só da Mesa: tira da publicação `supabase_realtime` todas as tabelas menos `mesa_estado` (veja a seção 5). **Rode depois de publicar** a versão do site que só sincroniza a Mesa; antes disso, quem estiver com a versão anterior aberta deixa de ver na hora as mudanças dos outros fora da Mesa. Pode rodar de novo sem efeito. |
| 31 | `20261108120000_ficha_desvantagens.sql` | Aba Ficha › Desvantagens: tabela `ficha_desvantagem` (como `ficha_vantagem`, sem talentos; o custo é 0 ou negativo), view `fichas_doc` e `salvar_ficha` com as desvantagens. **Rode antes de publicar** a versão do site com as desvantagens na ficha; sem ela, o banco não guarda as desvantagens salvas. |
| 32 | `20261109120000_ficha_peculiaridades.sql` | Aba Ficha › Peculiaridades: tabela `ficha_peculiaridade` (nome e observações, na ordem; os pontos, −1 cada e só 5 contando, são calculados pelo site), view `fichas_doc` e `salvar_ficha` com as peculiaridades. Rode depois da 31. **Rode antes de publicar** a versão do site com as peculiaridades na ficha; sem ela, o banco não guarda as peculiaridades salvas. |
| 33 | `20261110120000_tabuleiros.sql` | Aba Tabuleiros: tabelas `tabuleiros`, `tabuleiro_compartilhamento`, `tabuleiro_tokens`, `tabuleiro_token_dono` e `tabuleiro_desenhos`, views, gravação e as permissões (só o Mestre cria, muda e exclui tabuleiros e tokens; o Jogador só move, gira e muda os PV dos tokens que controla, soma as áreas exploradas e desenha na camada dos tokens, mudando e apagando só os próprios desenhos). Põe `tabuleiros`, `tabuleiro_tokens` e `tabuleiro_desenhos` na publicação do Realtime (seção 5). **Rode antes de publicar** a versão do site com os tabuleiros. Depois dela, não rode a 30 de novo: a 30 tira estas três tabelas da publicação (o último bloco da 33 as põe de volta). Pode rodar de novo: num banco em que uma versão anterior dela rodou (sem a direção dos tokens e sem os desenhos), põe só o que falta e troca as views e as funções, sem mexer no que já está gravado. |
| 34 | `20261111120000_tabuleiro_mesa_virtual.sql` | A mesa virtual dos Tabuleiros, no jeito do Roll20: tabelas `chat_mensagens` (com a regra de leitura própria: sussurros, só para o Mestre e rolagens secretas; e a view `chat_mensagens_doc` com as 500 mensagens mais novas que cada um lê), `tabuleiro_turnos`, `tabuleiro_arte` e `tabuleiro_campanha`; nos tokens, PF, marcadores e a camada `fore` (também nos desenhos); a função `rolar_dados`, que rola os dados do chat no banco, e `hounds_limpar_chat`, para o Mestre apagar o chat inteiro. Põe `chat_mensagens`, `tabuleiro_turnos` e `tabuleiro_campanha` na publicação do Realtime. Rode depois da 33. **Rode antes de publicar** a versão do site com o chat, a ordem de turno e a barra lateral. Como na 33, não rode a 30 de novo depois dela (o último bloco da 34 põe as tabelas de volta na publicação). |
| 35 | `20261112120000_ficha_anotacoes.sql` | Aba Anotações da ficha: coluna `ficha_id` em `cadernos` (→ `fichas`, exclusão em cascata), view `cadernos_doc` (com `sheetId`) e `salvar_caderno`. Um título com ficha fica na aba da ficha, fora do menu Anotações, e sai junto com a ficha. **Rode antes de publicar** a versão do site com a aba; sem ela, o banco não guarda a ficha do título e os títulos criados na aba vão parar no menu Anotações. Pode rodar de novo sem efeito. |
| 36 | `20261113120000_conta_ficha.sql` | Conta vinculada à ficha (botão **Vincular conta** e campo **Conta vinculada** no formulário da ficha, só para o Mestre): coluna `ficha_id` em `usuarios` (→ `fichas`, única: uma ficha por conta e uma conta por ficha; some quando a ficha é excluída), view `usuarios_doc` (com `sheetId`) e `salvar_usuario` (recusa aliado e ficha de outra conta; sem o campo `sheetId`, a conta fica com a ficha que tinha). **Rode antes de publicar** a versão do site com o vínculo; sem ela, o banco não guarda a conta da ficha. Pode rodar de novo sem efeito. |
| 37 | `20261114120000_ficha_reacoes.sql` | Ficha › Atributos › Reações: tabela `ficha_reacao` (reação, modificador de −99 a +99 e observações, na ordem), view `fichas_doc` e `salvar_ficha` com as reações. Rode depois da 32. **Rode antes de publicar** a versão do site com a tabela Reações; sem ela, o banco não guarda as reações salvas. Pode rodar de novo sem efeito. |
| 38 | `20261115120000_ficha_pontos.sql` | Ficha › Pontos (abaixo de Personagem): tabela `ficha_pontos` (ajuste livre, raça, pontos da raça e XP, digitados; uma linha por ficha), view `fichas_doc` e `salvar_ficha` com os pontos. O total gasto e o total são calculados pelo site. Rode depois da 37. **Rode antes de publicar** a versão do site com a tabela de pontos; sem ela, o banco não guarda o que for digitado. Pode rodar de novo sem efeito. |
| 39 | `20261116120000_tabela_search_path.sql` | Corrige o aviso "Function Search Path Mutable" do Security Advisor: recria `hounds_interno.tabela` (a mesma lista de coleções da 33) com `SET search_path = ''`, como as outras funções. Ao acrescentar coleções nela, parta desta versão. Pode rodar a qualquer momento, e de novo sem efeito. |
| 40 | `20261117120000_ficha_cor_aliado.sql` | Cor do aliado (escolhida em **Criar Aliado** e em **Renomear**): coluna `aliado_cor` em `fichas` (só nos aliados: violeta, azul, verde, vermelho, oliva ou cinza; nula é violeta), view `fichas_doc` e `salvar_ficha` com a cor. Rode depois da 38. **Rode antes de publicar** a versão do site com a escolha de cor; sem ela, o banco não guarda a cor e todo aliado fica violeta. Pode rodar de novo sem efeito. |
| 41 | `20261118120000_ficha_sem_cf.sql` | Tira o CF (fator de custo) dos ajustes de Criar Armadura, Criar Arma e Criar Escudo: view `fichas_doc` e `salvar_ficha` sem ele e **apaga a coluna `cf`** de `ficha_armadura_mod`, `ficha_arma_criada_mod` e `ficha_escudo_mod`, com os valores gravados (não dá para desfazer). Os custos já calculados ficam até o item ser editado e salvo de novo. Rode depois da 40. Pode rodar de novo sem efeito. |
| 42 | `20261119120000_ficha_ajuste_peso_lbs.sql` | O peso dos ajustes de Criar Armadura, Arma e Escudo em % ou em lbs: coluna `peso_lbs` em `ficha_armadura_mod`, `ficha_arma_criada_mod` e `ficha_escudo_mod`, view `fichas_doc` e `salvar_ficha` com ela. Rode depois da 41. **Rode antes de publicar** a versão do site com a unidade do peso; sem ela, o banco não guarda o peso em lbs. Pode rodar de novo sem efeito. |
| 43 | `20261120120000_partes_corpo_ingles.sql` | As partes do corpo de Criar Armadura (`armadura_localizacoes`) com os nomes do GURPS Low-Tech em inglês (Head, Skull, Face, Neck, Torso...). Só muda o nome; ids e percentuais ficam. Pode rodar a qualquer momento, e de novo sem efeito. |

**Pelo SQL Editor:** abra o [SQL Editor do Supabase](https://supabase.com/dashboard/project/cjjhlorfnjspikjhsanx/sql). Para cada arquivo, na ordem, clique em **New query**, cole o conteúdo e clique em **Run**. No banco atual, a 1 já foi executada (era o `supabase-setup.sql`), mas rodar de novo não muda nada.

**Pela Supabase CLI:** `supabase link --project-ref cjjhlorfnjspikjhsanx` e depois `supabase db push`.

---

## 3. Migrar o banco atual

O banco de produção já tem os dados em `hounds_docs`. A troca é feita assim:

1. **Escolha um momento em que ninguém esteja usando o site.** A migration 6 deixa o `hounds_docs` só para leitura. A partir daí, a versão antiga do site não consegue mais salvar, mas também não perde nada.
2. **Rode as migrations 2 a 6**, nessa ordem. A 6 termina mostrando:
   - os documentos que não puderam ser copiados (`hounds_interno.migracao_erros`), que deve vir vazio;
   - a validação, uma linha por verificação, com `ok = true` em todas: quantidade de itens por coleção, vínculos (membros, locais, mapas, personagens de eventos, compartilhamentos), referências (mapa pai, ficha do personagem...) e as seções das fichas.

   Para consultar a validação de novo: `SELECT * FROM hounds_interno.validar_migracao();`
3. **Compare campo a campo:** `cd tools` e `node validar-migracao.mjs` (depois da migration 7, com a chave `service_role`; veja o início do script). O script lê cada documento de `hounds_docs` e o item correspondente nas views, e lista qualquer diferença. Os avisos são diferenças esperadas: ids de itens que já não existiam, contas excluídas.
4. **Publique o site:** faça o merge desta versão na `main`, que o GitHub Pages publica. Peça a quem estava com o site aberto que recarregue a página.

**Nada é apagado.** O `hounds_docs` continua no banco como cópia, só para leitura.

**Para voltar ao site antigo** (antes de apagar o `hounds_docs`), rode no SQL Editor e publique a versão anterior do site:
```sql
GRANT INSERT, UPDATE, DELETE ON public.hounds_docs TO anon, authenticated;
CREATE POLICY "Acesso público hounds_docs" ON public.hounds_docs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT EXECUTE ON FUNCTION public.patch_hounds_doc(TEXT, TEXT, JSONB) TO anon, authenticated;
```

**Apagar o `hounds_docs`** só depois de usar o site novo por um tempo e confirmar que está tudo certo:
```sql
DROP TABLE public.hounds_docs;
DROP FUNCTION public.patch_hounds_doc(TEXT, TEXT, JSONB);
```

### Importar os arquivos de `dados/`

Para enviar os JSON (`dados/maps.json`, `dados/characters.json`...) e as imagens locais (`imagens/`) a um banco **vazio**, já com as migrations:
```bash
cd tools
node importar-supabase.mjs
```
O script grava pelas mesmas funções do site.

---

## 4. Login e permissões

Cada pessoa entra com **email e senha** (Supabase Auth, provedor Email). O Mestre cria as contas pela aba **Usuários** do site, com a Edge Function `contas` ([supabase/functions/contas/index.ts](supabase/functions/contas/index.ts)). Cada conta é ligada ao usuário do Hounds pelo email. A estrutura está nas migrations `20261015120000_autenticacao.sql` (7) e `20261016120000_contas_pelo_site.sql` (8).

### Ligar o login (uma vez)

1. **Bloqueie o cadastro aberto:** em [Authentication › Sign In / Providers](https://supabase.com/dashboard/project/cjjhlorfnjspikjhsanx/auth/providers), desligue **Allow new users to sign up** e deixe o provedor **Email** ligado. Assim só existem as contas que o Mestre criar.
2. **Endereço do site:** em [Authentication › URL Configuration](https://supabase.com/dashboard/project/cjjhlorfnjspikjhsanx/auth/url-configuration), ponha `https://jorius0103.github.io/Hounds/` em **Site URL** e adicione `https://jorius0103.github.io/Hounds/**` em **Redirect URLs**. O padrão é `http://localhost:3000`, e é para lá que iriam os links dos emails do Supabase.
3. **Rode as migrations 7 e 8** no SQL Editor. A partir da 7, o site antigo (sem login) para de funcionar, então siga direto para os passos 4 a 7.
4. **Crie a conta do Mestre** em [Authentication › Users](https://supabase.com/dashboard/project/cjjhlorfnjspikjhsanx/auth/users), com **Add user › Create new user**. Informe o email e a senha e marque **Auto Confirm User**.
5. **Ligue a conta do Mestre**, no SQL Editor, com o email dela:
   ```sql
   INSERT INTO public.usuario_email (usuario_id, email) VALUES ('user-leandro', 'email-do-mestre@exemplo.com');
   ```
   O email não fica no código: o repositório é público.
6. **Publique a função `contas`:**
   1. Em [Edge Functions](https://supabase.com/dashboard/project/cjjhlorfnjspikjhsanx/functions), clique em **Deploy a new function › Via Editor**.
   2. Dê o nome `contas`, apague o código de exemplo e cole o conteúdo de [supabase/functions/contas/index.ts](supabase/functions/contas/index.ts).
   3. Clique em **Deploy function**. Deixe ligada a opção **Verify JWT**, que é o padrão.

   Pela Supabase CLI, o mesmo é `supabase functions deploy contas`. A função recebe sozinha as chaves do projeto. Não configure nenhuma chave nela.
7. **Publique o site** (merge na `main`), entre como Mestre e, na aba **Usuários**, crie ou ligue a conta de cada jogador. Avise o grupo para recarregar a página (Ctrl + Shift + R) e entrar com email e senha.

### No dia a dia (aba Usuários, como Mestre ou Admin)

- **Pessoa nova:** clique em **Novo usuário** e preencha nome, email, **senha** e perfil (Mestre, Admin ou Jogador). A conta de login é criada junto, já confirmada e sem enviar email. Passe o email e a senha para a pessoa.
- **Conta que já existe no painel:** crie o usuário com o mesmo email e a senha em branco. Ele fica ligado à conta existente.
- **Esqueceu a senha:** clique na chave (**Definir senha**) ao lado do usuário e defina uma nova. O site não usa a recuperação por email, porque o servidor de email padrão do Supabase envia só uns 2 emails por hora e só para a equipe do projeto.
- **Mudar o perfil:** clique no lápis e troque o perfil. O banco não deixa rebaixar o último Mestre.
- **Admin:** faz tudo isso, com limites nos Mestres: ele não cria Mestre, não dá o perfil de Mestre a ninguém e não edita nem exclui um Mestre. Ele pode definir a senha de um Mestre (por isso, na prática, consegue entrar como Mestre: dê esse perfil só a quem merece essa confiança). Nas linhas dos Mestres, aparece para ele só a chave.
- **Tirar alguém:** clique na lixeira. Com **Excluir também a conta de login** marcado, a conta do Supabase sai junto.

Sem a função `contas` publicada, a aba Usuários avisa e o resto continua funcionando. Nesse caso, as contas são criadas no painel (passo 4) e ligadas pelo email. Para definir uma senha sem a função, use o SQL Editor:

```sql
UPDATE auth.users SET encrypted_password = extensions.crypt('SenhaNova123', extensions.gen_salt('bf')), updated_at = now()
WHERE email = 'email-da-pessoa@exemplo.com';
```

### O que o banco garante

- **Leitura:** só contas ligadas a um usuário leem. A chave pública sozinha não lê nada, nem o `hounds_docs`.
- **Mestre:** tudo. Gerencia usuários e emails (só ele vê os emails), os catálogos de GURPS, a visibilidade e o compartilhamento de qualquer item.
- **Admin:** igual ao Jogador em tudo, e também gerencia os usuários: cria, edita e exclui usuários e contas de login, define senhas (inclusive a de um Mestre) e vê os emails. Não cria Mestre, não promove ninguém a Mestre e não edita nem exclui um Mestre. Na Mesa de Combate, é Jogador.
- **Jogador:**
  - cria e altera os itens que vê: mapas, locais, personagens, fichas, organizações, eventos, marcadores, anotações e a Mesa;
  - muda a visibilidade só do que ele criou;
  - não altera usuários, catálogos nem com quem um item é compartilhado;
  - não altera nem exclui um item oculto que não foi compartilhado com ele.
- **Dono:** quem criou um item é sempre a conta que gravou, e isso não muda depois.
- **Mestre sempre existe:** o banco recusa rebaixar ou excluir o último Mestre.
- **Gravação:** só pelas funções `hounds_*`, que validam os dados e respeitam as chaves estrangeiras. RLS ligado em todas as tabelas e nenhuma escrita direta.
- **Imagens:** enviar, trocar e apagar só com login. Quem tem o endereço de uma imagem a abre, mas os endereços são aleatórios.
- **Mesa:** as mensagens diretas vão por um canal privado (`hounds-mesa`), só para contas ligadas.
- **Tabuleiros:** só o Mestre cria, muda e exclui tabuleiros e tokens. O Jogador, num tabuleiro que vê, só soma as áreas exploradas (e só na versão atual delas: depois que o Mestre as apaga, uma gravação antiga não as põe de volta); num token que controla, só muda a posição, a direção, os PV, os PF e os marcadores; desenha e escreve só na camada dos tokens e muda ou apaga só os próprios desenhos. Na ordem de turno, o Jogador só põe, muda o valor e tira os tokens que controla (os outros itens, a vez, a rodada e se ela está aberta ficam como estão no banco). A biblioteca de arte e a campanha (a fita dos jogadores) são do Mestre. Os tokens da camada Mestre ainda chegam ao navegador dos jogadores, e o site os esconde, como os outros itens ocultos.
- **Chat:** cada um escreve sempre como a própria conta (o banco põe o autor e, para o Jogador, o nome com que aparece: o dele ou o do personagem escolhido); só o Mestre usa `/desc` e apaga mensagens, e nenhuma mensagem muda depois de gravada. O banco rola os dados das rolagens: o resultado que o navegador mandar não vale. A leitura tem regra própria (RLS): quem escreveu (menos numa rolagem secreta), o Mestre nas mensagens só para o Mestre e nas secretas, todos nas públicas e os destinatários nos sussurros. Um sussurro entre dois jogadores o Mestre não lê. Os avisos do Realtime seguem a mesma regra. Quem faz uma rolagem secreta recebe o resultado na resposta da gravação, e o site não o mostra.
- **Contas de login:** só o Mestre e o Admin criam, trocam a senha ou excluem, pela função `contas`. Ela confere quem pediu (e, para o Admin, que não está criando nem excluindo um Mestre) antes de usar a chave `service_role`.
- **Chaves:** a `service_role` (que ignora as regras) nunca vai para o site. O `supabase-config.js` só tem a `anon`, e a função `contas` recebe a `service_role` do próprio Supabase. Os scripts de `tools/` usam a `service_role` pela variável de ambiente `SUPABASE_SERVICE_ROLE_KEY`, só no seu computador.

Itens ocultos ainda chegam ao navegador dos jogadores logados, e o site os esconde, como antes. Esconder no próprio banco é um passo seguinte.

---

## 5. Sincronização entre navegadores

Só a Mesa de Combate (veja a seção 6) e os Tabuleiros (com o chat, a ordem de turno e a fita dos jogadores) ficam sincronizados entre os navegadores.

- **Mapas, locais, personagens, fichas e o resto:** são carregados quando o site abre. Quem altera vê na hora, e a resposta do banco substitui essa cópia. O que outra pessoa alterar aparece ao recarregar a página; a página não pede avisos do Realtime dessas tabelas.
- **Tabuleiros:** cada gravação (um token que andou, uma porta aberta, uma área revelada, um desenho, uma mensagem do chat, um turno passado, a fita levada para outro tabuleiro) gera um aviso do Realtime, e os outros navegadores baixam só aquela linha. Os tokens e os desenhos só são assinados enquanto um tabuleiro está aberto; o chat e a ordem de turno, enquanto a pessoa está nos tabuleiros; a campanha, sempre (quem está com um tabuleiro aberto vai para onde o Mestre leva o grupo). O sinal de **Apontar**, a régua de quem mede, quem está na mesa (a cada 15 s) e o **Mostrar a todos** do Diário e da Arte não passam pelo banco: vão pelo canal `hounds-mesa`, só para quem está com o tabuleiro aberto naquela hora.
- **Quedas de conexão:** ao reconectar, ao voltar para a aba e a cada 60 s, a página confere a Mesa e os tabuleiros com o banco. Ela baixa só o `id` e o `updated_at` e depois só o que mudou.
- **Realtime:** a publicação `supabase_realtime` tem `mesa_estado` (migration 30), `tabuleiros`, `tabuleiro_tokens` e `tabuleiro_desenhos` (migration 33), `chat_mensagens`, `tabuleiro_turnos` e `tabuleiro_campanha` (migration 34), com `REPLICA IDENTITY DEFAULT`; são as únicas tabelas que a página assina.

Limites do plano gratuito que importam aqui: 100 mensagens por segundo no projeto, 200 conexões ao mesmo tempo e 256 KB por mensagem direta. Se a Mesa só atualizar com cerca de 1 s de atraso, confira nas configurações de Realtime do projeto se o acesso a canais públicos está permitido.

---

## 6. Mesa de Combate

O estado da Mesa (combates, NPCs, personagens salvos, condições, rounds e log) é o estado do app da Mesa, que ele lê e grava inteiro. Por isso fica inteiro num lugar só: `mesa_estado` tem um registro pequeno (a revisão, quem gravou e em quantas partes) e o estado, em texto JSON, fica em `mesa_partes`, normalmente numa parte só. Normalizar a Mesa em tabelas próprias é uma etapa separada, que exige mudar o app React da Mesa.

- Cada mudança vai direto para os outros navegadores pelo canal `hounds-mesa`, compactada com gzip (o estado fica cerca de 12 vezes menor), antes de passar pelo banco. O banco salva o estado 1 s depois da última mudança, e é de lá que lê quem abre o site depois.
- O aviso do Realtime de cada gravação traz só o registro pequeno de `mesa_estado`; a página não pede os avisos de `mesa_partes`. Só baixa as partes quem não recebeu aquela revisão pelo canal (uma mensagem perdida, ou o canal fora do ar). As partes de revisões antigas são apagadas pela própria página, alguns segundos depois.
- Os avatares que a Mesa guarda como texto são enviados uma vez para o bucket de imagens, e o estado fica com o endereço deles.
- Se duas pessoas mexem no mesmo personagem no mesmo instante, fica a última mudança.
