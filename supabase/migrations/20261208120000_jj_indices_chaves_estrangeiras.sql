-- ============================================================
-- 62 · ÍNDICES DAS CHAVES ESTRANGEIRAS SEM ÍNDICE
-- O Performance Advisor do Supabase acusa as chaves estrangeiras sem
-- um índice que as cubra (anotacoes_criado_por_fkey, ...). São 27: o
-- criado_por de 25 tabelas (→ usuarios, ON DELETE SET NULL),
-- armadura_localizacoes.pai e tabuleiro_campanha.pagina_jogadores.
-- Sem o índice, excluir um usuário (ou uma parte do corpo, ou um
-- tabuleiro) faz o banco ler cada uma dessas tabelas inteira para
-- achar o que aponta para ele. Cada coluna ganha um índice, com o
-- nome <tabela>_<coluna>_idx como os outros. As tabelas são pequenas:
-- criar os índices é rápido. Uma tabela que não exista é pulada.
-- Pode rodar a qualquer momento, e de novo sem efeito.
-- ============================================================

DO $$
DECLARE
  c TEXT[];
BEGIN
  FOREACH c SLICE 1 IN ARRAY ARRAY[
    ['anotacoes', 'criado_por'], ['armaduras', 'criado_por'], ['armas', 'criado_por'], ['cadernos', 'criado_por'],
    ['desvantagens', 'criado_por'], ['estilos', 'criado_por'], ['eventos', 'criado_por'], ['fichas', 'criado_por'],
    ['itens', 'criado_por'], ['locais', 'criado_por'], ['magias', 'criado_por'], ['mapas', 'criado_por'],
    ['marcadores', 'criado_por'], ['melhoramentos', 'criado_por'], ['organizacoes', 'criado_por'], ['pericias', 'criado_por'],
    ['personagens', 'criado_por'], ['tabuleiro_arte', 'criado_por'], ['tabuleiro_campanha', 'criado_por'],
    ['tabuleiro_desenhos', 'criado_por'], ['tabuleiro_tokens', 'criado_por'], ['tabuleiro_turnos', 'criado_por'],
    ['tabuleiros', 'criado_por'], ['tecnicas', 'criado_por'], ['vantagens', 'criado_por'],
    ['armadura_localizacoes', 'pai'], ['tabuleiro_campanha', 'pagina_jogadores']
  ]
  LOOP
    IF to_regclass('public.' || c[1]) IS NOT NULL THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)', c[1] || '_' || c[2] || '_idx', c[1], c[2]);
    END IF;
  END LOOP;
END $$;
