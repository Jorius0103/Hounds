-- ============================================================
-- 23 · FICHA › EQUIP. › MOCHILAS: UMA EM USO
-- Como o Corpo (ficha_corpo_em_uso_key), só uma mochila da ficha
-- fica em uso: é a que entra na carga (js/tabs/ficha-equipamentos.js).
-- Numa ficha que já tem mais de uma em uso, fica a primeira (menor
-- ordem); as outras passam a guardadas, com o que têm.
-- ============================================================

UPDATE public.ficha_mochila m
   SET em_uso = false
 WHERE m.em_uso
   AND EXISTS (SELECT 1 FROM public.ficha_mochila o
                WHERE o.ficha_id = m.ficha_id AND o.em_uso AND o.ordem < m.ordem);

CREATE UNIQUE INDEX ficha_mochila_em_uso_key ON public.ficha_mochila (ficha_id) WHERE em_uso;
