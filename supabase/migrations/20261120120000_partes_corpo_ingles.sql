-- ============================================================
-- 43 · NOMES DAS PARTES DO CORPO EM INGLÊS
-- As localizações de Criar Armadura (armadura_localizacoes) com os
-- nomes do livro, GURPS Low-Tech, pp. 100-101 (Head, Skull, Face...),
-- no lugar dos nomes em português. Os ids, os percentuais e o resto
-- não mudam; js/tabs/ficha-armaduras.js (ARMOR_LOC_DEFAULTS) tem os
-- mesmos nomes. As peças já criadas guardam o nome que tinham ao
-- criar (o do conjunto e o da linha em Meus Itens).
-- Pode rodar de novo sem efeito.
-- ============================================================

UPDATE public.armadura_localizacoes l SET nome = x.nome, atualizado_em = now(), gravado_em = now()
FROM (VALUES
  ('head', 'Head'),
  ('skull', 'Skull'),
  ('face', 'Face'),
  ('neck', 'Neck'),
  ('torso', 'Torso'),
  ('chest', 'Chest'),
  ('abdomen', 'Abdomen'),
  ('groin', 'Groin'),
  ('arms', 'Arms'),
  ('shoulders', 'Shoulders'),
  ('upper_arms', 'Upper Arms'),
  ('elbows', 'Elbows'),
  ('forearms', 'Forearms'),
  ('hands', 'Hands'),
  ('hand', 'Hand (one)'),
  ('legs', 'Legs'),
  ('thighs', 'Thighs'),
  ('knees', 'Knees'),
  ('shins', 'Shins'),
  ('shins_front', 'Shins (front only)'),
  ('leg', 'Leg (one)'),
  ('feet', 'Feet'),
  ('foot', 'Foot (one)')
) AS x (id, nome)
WHERE l.id = x.id AND l.nome IS DISTINCT FROM x.nome;
