"""
Gera um CSV com todas as TÉCNICAS (techniques) encontradas nos seus livros GURPS.

Colunas: livro; pagina; tecnica; dificuldade; cinematica; defaults; pre_requisitos;
         descricao; modificadores

Uso:
    pip install pdfplumber
    python extrair_tecnicas.py
    python extrair_tecnicas.py --pasta "C:\\outra\\pasta" --saida tecnicas.csv

As técnicas têm o mesmo formato das perícias nos livros GURPS 4e (título em
negrito-itálico, linha de dificuldade, Default(s) e Prerequisite(s)), só que a
linha de dificuldade não tem atributo: "Average" ou "Hard". A leitura das páginas
(colunas, quadros laterais, rótulos) é a do extrair_pericias.py, que precisa estar
na mesma pasta. Técnicas marcadas com * são cinemáticas (coluna "cinematica").
O CSV usa ";" e UTF-8 com BOM, para abrir direto no Excel em português.
"""
import argparse, csv, gc, re, sys
from collections import Counter
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    sys.exit("Instale antes:  pip install pdfplumber")

# extrair_pericias.py fica na mesma pasta deste script
sys.path.insert(0, str(Path(__file__).resolve().parent))
from extrair_pericias import (Pericia, PASTA_PADRAO, eh_titulo_pericia, eh_tipo, eh_secao,
                              ler_pagina, nome_bonito, texto)

DIFICULDADE = re.compile(r"^(Average|Hard)\b")
# A tabela de custo das técnicas do Basic Set (p. B230) fica no meio do texto, sem quadro em volta:
# "Difficulty of Technique Average Hard 0 points 0 points 1 point ... +1 point +1 point".
TABELA_CUSTO = re.compile(r"^Difficulty of Technique Average Hard(?:\s+\+?\d+ points?)+\s*")
CAMPOS = ["livro", "pagina", "tecnica", "dificuldade", "cinematica", "defaults", "pre_requisitos",
          "descricao", "modificadores"]


class Tecnica(Pericia):
    def finalizar(self):
        d = super().finalizar()
        m = DIFICULDADE.match(d["tipo"])
        # Alguns livros anunciam a técnica no título ("New Technique: Sight-Reading").
        nome = re.sub(r"^New Technique:\s*", "", d["pericia"])
        return {"livro": d["livro"], "pagina": d["pagina"], "tecnica": nome,
                "dificuldade": m.group(1) if m else "", "cinematica": d["cinematica"],
                "defaults": d["defaults"], "pre_requisitos": d["pre_requisitos"],
                "descricao": TABELA_CUSTO.sub("", d["descricao"]), "modificadores": d["modificadores"]}


def eh_inicio_tecnica(ln):
    return eh_tipo(ln[0]) and bool(DIFICULDADE.match(texto(ln)))


def processar(caminho, nome_livro, saida, contador):
    atual = None

    def fechar():
        nonlocal atual
        if atual:
            d = atual.finalizar()
            # Sem Default nem Prerequisite não é técnica (um título qualquer seguido de "Hard...").
            if d["dificuldade"] and (d["defaults"] or d["pre_requisitos"]):
                saida.writerow(d)
                contador[nome_livro] += 1
            atual = None

    with pdfplumber.open(caminho) as pdf:
        total = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            linhas, numero = ler_pagina(page)
            page.flush_cache()
            pagina = numero or str(i + 1)
            k = 0
            while k < len(linhas):
                ln, recuada = linhas[k]
                if all(eh_titulo_pericia(w) for w in ln):
                    nome = texto(ln)
                    j = k + 1
                    # título quebrado em duas linhas (e não dois títulos seguidos)
                    if j + 1 < len(linhas) and all(eh_titulo_pericia(w) for w in linhas[j][0]) \
                            and eh_inicio_tecnica(linhas[j + 1][0]) and not eh_inicio_tecnica(linhas[j][0]):
                        nome += " " + texto(linhas[j][0])
                        j += 1
                    if j < len(linhas) and eh_inicio_tecnica(linhas[j][0]):
                        fechar()
                        atual = Tecnica(nome_livro, pagina, nome)
                        k = j
                        continue
                    # outro título qualquer encerra a técnica em andamento
                    fechar()
                elif atual and all(eh_secao(w) for w in ln):
                    fechar()
                elif atual:
                    atual.adicionar(ln, recuada)
                k += 1
            if (i + 1) % 50 == 0:
                print(f"    página {i + 1}/{total}...")
            gc.collect()
    fechar()


# Técnicas que os livros trazem fora do formato de técnica e o leitor não acha: entram à mão, depois
# das do livro delas (se o PDF do livro estiver na pasta).
#   Targeted Attacks (Martial Arts, p. 68): o quadro "Optional Rule: Targeted Attacks". Na ficha,
#   "TA (Perícia Ataque/Alvo)" tem o padrão e o máximo calculados pela tabela do quadro (taParse,
#   js/tabs/ficha-combate.js).
EXTRAS = [{'livro': 'GURPS Martial Arts', 'pagina': '68', 'tecnica': 'Targeted Attack', 'dificuldade': 'Hard', 'cinematica': '', 'defaults': 'prerequisite skill, at the penalty to hit the target (see Modifiers)', 'pre_requisitos': 'Any Melee Weapon or unarmed combat skill; buys off up to half the default penalty (round up)', 'descricao': 'Optional rule. Attacks on high-value targets (the face, chinks in armor, weapons) stop fights, so many styles teach them as Hard techniques. Each Targeted Attack names three things. Skill: the Melee Weapon or unarmed combat skill used. Attack: for weapon skills, Swing or Thrust; for unarmed strikes, usually Punch, or a striking technique such as Disarming, Kicking, Lethal Strike or Return Strike; for grapples, Grab, Grapple or (Judo only) Throw. Target: a hit location other than the torso, chinks in armor at a location, or a weapon; the attack must be able to reach it. Write it as TA (Skill Attack/Target). The default is the skill at the penalty to hit the target (see Modifiers); defaulting from the skill, add the penalty of a special attack (Knee Strike -1; Elbow Strike, Kicking or Lethal Strike -2; Lethal Kick -4), but not when defaulting from a technique, whose default already has it. Improving the Targeted Attack buys off up to half of its default penalty, rounded up. Examples: TA (Boxing Punch/Face) defaults to Boxing-5, cannot exceed Boxing-2; TA (Broadsword Disarm/Weapon) to Broadsword-6 or Disarming (Broadsword)-6, cannot exceed Broadsword-3; TA (Broadsword Swing/Neck) to Broadsword-5, cannot exceed Broadsword-2; TA (Judo Throw/Skull) to Judo-7, cannot exceed Judo-3; TA (Karate Knee Strike/Groin) to Karate-4 or Knee Strike-3, cannot exceed Karate-2; TA (Rapier Thrust/Vitals Chinks) to Rapier-10, cannot exceed Rapier-5; TA (Wrestling Grab/Weapon) to Wrestling-4, cannot exceed Wrestling-2; TA (Wrestling Grapple/Arm) to Wrestling-1, cannot exceed Wrestling. Roll against the Targeted Attack to hit. Against a weapon it assumes -4: roll at +1 against large weapons (-3 to hit) and -1 against small ones (-5 to hit). Using the same Targeted Attack twice on a foe in a fight makes you predictable: he defends at +1 against the third and later uses. The GM may forbid Targeted Attacks.', 'modificadores': 'Strikes: Arm or Leg -2; Groin or Vitals -3; Hand or Foot -4; Face or Neck -5; Skull -7; Eye -9; chinks in armor -10 instead of the location penalty (torso chinks -8); weapons -4 (blows to break a weapon add nothing; to disarm, specify Disarm as the attack, a further -2 except with a fencing weapon). Grapples: half the location penalty (Arm or Leg -1, Hand or Foot -2, Face or Neck -3); grabs for weapons -4. Judo throws: any part but the Eye, Vitals or Groin, at the striking penalties; a throw to the head or neck damages it and needs a HT roll to avoid stun (Judo Throw, p. 75).'}]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pasta", type=Path, default=PASTA_PADRAO)
    ap.add_argument("--saida", type=Path, default=None)
    a = ap.parse_args()
    if not a.pasta.is_dir():
        sys.exit(f"Pasta não encontrada: {a.pasta}")
    pdfs = sorted(a.pasta.rglob("*.pdf"))
    if not pdfs:
        sys.exit(f"Nenhum PDF em {a.pasta}")
    arquivo = a.saida or (a.pasta / "tecnicas.csv")
    contador = Counter()
    with open(arquivo, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=CAMPOS, delimiter=";")
        w.writeheader()
        for p in pdfs:
            livro = nome_bonito(p)
            print(f"Lendo {p.name} ...")
            try:
                processar(p, livro, w, contador)
            except Exception as e:
                print(f"  ERRO: {e}")
                continue
            for x in EXTRAS:
                if x["livro"] == livro:
                    w.writerow(x); contador[livro] += 1
            print(f"  {contador[livro]} técnicas")
    print(f"\nTotal: {sum(contador.values())} técnicas -> {arquivo}")


if __name__ == "__main__":
    main()
