"""
Gera um CSV com os MELHORAMENTOS dos seus livros GURPS: os modificadores que se aplicam a uma
arma, escudo, armadura, roupa ou outro equipamento e mudam o custo dele ("Balanced", "Fine",
"Dwarven", "Orichalcum", "Ornate", "Spiked", tingimento, bordado, as maldições dos itens mágicos...).

Colunas: livro; pagina; melhoramento; tl; aplica_a; categoria; restricao; custo; peso; descricao

"aplica_a" é o tipo de equipamento: Arma, Escudo, Armadura, Roupa, Item ou Item mágico.
"categoria" é o título da seção ou do quadro do livro ("Weapons of Quality", "Soft Items Table").
"restricao" diz a que equipamentos o melhoramento serve ("Any metal weapon", "Fencing weapons and
swords only"): a coluna "Applies To" das tabelas do Dungeon Fantasy 8 ou a frase antes do custo.
"custo" é o fator de custo (CF, "cost factor"; custo final = preço × (1 + soma dos CF)): "+4 CF",
ou "+2/+3/+9 CF" quando varia com a arma ou o nível; nos livros que não usam CF, o que o livro diz
("×4" para "4 times list price", "+$20"). "peso" é o efeito no peso ("×2", "×3/4", "-10%",
"+6 lbs."), quando o livro dá.

Uso:
    pip install pdfplumber
    python extrair_melhoramentos.py
    python extrair_melhoramentos.py --pasta "C:\\outra\\pasta" --saida melhoramentos.csv

Os melhoramentos ficam em seções conhecidas dos livros (SECOES, abaixo), lidas inteiras, com os
quadros laterais (vários estão em quadros, como "Weapons of Quality" do Low-Tech). Os formatos:
  - parágrafo que começa com o nome em itálico, terminado em ":" ou "." ("Balanced: +1 to skill
    ... +4 CF."): Basic Set, Martial Arts, Low-Tech, Dungeon Fantasy 1, 4, 12, 14, 16, 18;
  - subtítulo com o texto embaixo ("Fluting (TL1)" ... "+4 CF; reduce weight by 10%."): Low-Tech;
  - linha em negrito das tabelas de rolagem, com os dados ("1, 5 – Dyed, Cheap. +1.5 CF."):
    Dungeon Fantasy 8;
  - as tabelas de qualidade de arma, armadura e escudo do Dungeon Fantasy 8 ("Roll Quality
    Applies To CF Wt. Notes"), com as notas embaixo.
Só entra o verbete com custo: CF, preço de lista ("4 times list price") ou "+$". Os exemplos
("Example:") ficam de fora. O extrair_armas.py e o extrair_pericias.py precisam estar na mesma pasta.
O CSV usa ";" e UTF-8 com BOM, para abrir direto no Excel em português.
"""
import argparse, csv, gc, re, sys
from collections import Counter
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    sys.exit("Instale antes:  pip install pdfplumber")

# extrair_armas.py e extrair_pericias.py ficam na mesma pasta deste script
sys.path.insert(0, str(Path(__file__).resolve().parent))
from extrair_pericias import PASTA_PADRAO, juntar, nome_bonito, quadros, dentro
from extrair_armas import capitalizar, fonte, italico, ler_colunas, linhas, texto

CAMPOS = ["livro", "pagina", "melhoramento", "tl", "aplica_a", "categoria", "restricao", "custo", "peso", "descricao"]

# As seções dos livros com melhoramentos: (trecho do nome do arquivo, páginas do PDF (contadas do
# começo do arquivo, não as impressas), aplica_a quando o título da seção não diz[, categoria]).
# Com a categoria, ela vale para a seção toda; sem, sai dos títulos do livro.
SECOES = [
    ("Basic Set", [(276, 277)], "Arma", "Melee Weapon Quality"),
    ("Basic Set", [(279, 279)], "Arma", "Muscle-Powered Ranged Weapon Quality"),
    ("Basic Set", [(282, 282)], "Arma", "Firearm Quality"),
    ("Martial Arts.pdf", [(217, 217)], "Arma", "Weapons of Quality"),
    ("Low-Tech.pdf", [(16, 16)], "Item", "Custom-Made Equipment"),
    ("Low-Tech.pdf", [(37, 37)], "Item", "Container Options"),
    ("Low-Tech.pdf", [(40, 41)], "Item", "Decorated Equipment"),
    ("Low-Tech.pdf", [(128, 128)], "Item", "Smuggling Gear"),
    ("Low-Tech.pdf", [(61, 61)], "Arma", "Weapons of Quality"),
    ("Low-Tech.pdf", [(101, 102)], "Roupa", "Clothing"),
    ("Low-Tech.pdf", [(105, 115)], "Armadura"),
    ("Social Engineering", [(23, 23)], "Roupa", "Clothing"),
    ("Dungeon Fantasy 1 -", [(26, 27)], "Arma"),
    ("Dungeon Fantasy 4 -", [(13, 14)], "Item"),
    ("Dungeon Fantasy 8 -", [(16, 16)], "Item", "Toys"),
    ("Dungeon Fantasy 8 -", [(20, 20)], "Item", "Containers"),
    ("Dungeon Fantasy 8 -", [(25, 25)], "Item", "Tents"),
    ("Dungeon Fantasy 8 -", [(32, 32)], "Arma", "Bizarre Weapons"),
    ("Dungeon Fantasy 8 -", [(33, 35)], "Arma"),
    ("Dungeon Fantasy 8 -", [(51, 52)], "Item mágico", "Curses Table"),
    ("Dungeon Fantasy 8 -", [(53, 55)], "Item"),
    ("Dungeon Fantasy 8 -", [(56, 57)], "Item mágico"),
    ("Dungeon Fantasy 12 -", [(13, 13)], "Arma", "Ninja Weapon Modifier"),
    ("Dungeon Fantasy 12 -", [(16, 17)], "Roupa", "Ninja Suit Options"),
    ("Dungeon Fantasy 14 -", [(24, 24)], "Arma"),
    ("Dungeon Fantasy 16 -", [(16, 16)], "Roupa", "Garments"),
    ("Dungeon Fantasy 16 -", [(17, 18)], "Item", "Gear"),
]
# O que as seções têm com custo mas não é melhoramento: um item com uma variante ("Long Coat"),
# um exemplo ou uma nota. (trecho do nome do livro, nome do verbete)
FORA = {("Low-Tech", "Long Coat"), ("Low-Tech", "Pot Helm"), ("Low-Tech", "Bascinet"), ("Low-Tech", "Iliad"),
        ("Low-Tech", "Roman Imperial Legionary"), ("Low-Tech", "Roman Imperial"), ("Low-Tech", "Full Helm"), ("Low-Tech", "Layered Armor (p. 103)"), ("Low-Tech", "Base Materials"),
        ("Low-Tech", "Plate"), ("Low-Tech", "DB 2 or 3"), ("Dungeon Fantasy 4", "Spellbooks"),
        ("Dungeon Fantasy 4", "Sketchy"), ("Dungeon Fantasy 12", "Barbed Ninja’s Kusari"),
        ("Dungeon Fantasy 16", "Fire Arrow, Alchemical"), ("Martial Arts", "Optional Rule: Custom Quality Levels"),
        ("Low-Tech", "Fine Quality")}
# Subtítulos que só agrupam os melhoramentos de um tipo de equipamento (Dungeon Fantasy 14).
# Livros em que as páginas dos melhoramentos têm três colunas: a leitura das colunas é a do
# extrair_armas.py (nos outros, as duas colunas se dividem no meio; veja em_ordem).
TRES_COLUNAS = ("Basic Set",)
GRUPO = re.compile(r"^(?:Weapons?|Shields?|Armou?r|Helmets?|Garments|Clothing)$", re.I)
# O título da seção diz a que tipo de equipamento ela serve (o primeiro que casar).
TIPO_DA_CATEGORIA = [
    (re.compile(r"shield", re.I), "Escudo"),
    (re.compile(r"armor|armour|helm|headgear", re.I), "Armadura"),
    (re.compile(r"weapon|firearm|blade", re.I), "Arma"),
    (re.compile(r"cloth|garment|soft items|attire|undercover", re.I), "Roupa"),
    (re.compile(r"curse", re.I), "Item mágico"),
    (re.compile(r"hard items|container|decorat", re.I), "Item"),
]

NUM = r"\d+(?:\.\d+)?"
# "+4 CF", "-0.6 CF", "CF +1", "CF is +1", "CF is -0.5"
CF = re.compile(r"([+\-–]\s?" + NUM + r")\s?CF\b|\bCF (?:is )?([+\-–]?\s?" + NUM + r")(?![\d/])")
# "4 times list price", "40% of list price", "double list price"
VEZES = {"double": "2", "twice": "2", "three": "3", "five": "5"}
LISTA = re.compile(r"\b(" + NUM + r"|double|twice|three|five)(?: times|×)? list price|\b(\d+)% of list price", re.I)
# "All weapons: +400%", "+1,900% at TL0-6" (Martial Arts): o modificador do preço, em CF.
PCT = re.compile(r"([+\-–]\d[\d,]*)%(?= at TL| or more|[.,;)]|$)")
DOLAR = re.compile(r"(?:\+|[Aa]dds )\$(\d[\d,]*)")
# A frase com a restrição, logo antes do custo: "Any metal weapon: +19 CF".
RESTRICAO = re.compile(r"(?:^|[.!;]\s+|\)\s+)([A-Z][^.:;!()]{2,90}?):\s*(?:\+1 to reactions for )?[+\-–]\s?(?:" + NUM + r"\s?CF|\d[\d,]*%)")
# Efeito no peso.
PESO = [
    (re.compile(r"[Dd]oubles? (?:its |the |normal |usual )?weight|double weight"), lambda m: "×2"),
    (re.compile(r"[Hh]alf the weight|half (?:its )?usual weight"), lambda m: "×1/2"),
    (re.compile(r"(\d/\d) (?:its |the )?usual weight"), lambda m: "×" + m.group(1)),
    (re.compile(r"(" + NUM + r") times (?:as much|(?:its |the |usual |normal )*weight)"), lambda m: "×" + m.group(1)),
    (re.compile(r"[Ww]eight is ×(\d[\d./]*)"), lambda m: "×" + m.group(1)),
    (re.compile(r"(\d[\d./]*) (?:times |×)?weight"), lambda m: "×" + m.group(1)),
    (re.compile(r"[Rr]educe (?:its )?weight by (\d+)%"), lambda m: "-" + m.group(1) + "%"),
    (re.compile(r"[Ii]ncrease weight by (\d+)%"), lambda m: "+" + m.group(1) + "%"),
    (re.compile(r"\+(\d+)% (?:to )?weight|adds (?:[^.]{0,20} and )?(\d+)% to (?:both )?weight"), lambda m: "+" + (m.group(1) or m.group(2)) + "%"),
    (re.compile(r"CF,? \+(" + NUM + r") lbs?\."), lambda m: "+" + m.group(1) + " lbs."),
]
# "(TL1)", "(TL0-4)" depois do nome.
TL = re.compile(r"\s*\(TL\s?([\d^+\-–]+(?:\s?[–-]\s?\d+)?)\)")
# Linha de tabela de rolagem do Dungeon Fantasy 8: "1, 5 – Dyed, Cheap. +1.5 CF."
DADOS = re.compile(r"^((?:[1-6](?:-[1-6])?,\s*)*[1-6](?:-[1-6])?)\s*–\s*(.+)$")
# Nomes de parágrafo que não são melhoramentos.
NAO_E = re.compile(r"^(?:Examples?\b.*|Notes?|Design Notes?|Cost|Weight|Alternate SMs|TL|LC|Special Abilities|"
                   r"Production Quality|Thesis|Total Cost.*)$", re.I)
# Cabeçalho das tabelas de qualidade do Dungeon Fantasy 8.
CABECALHO = re.compile(r"^Roll (?:Quality|Form|Map Of|Language) ")


def corpo(w):
    return 8.5 <= w["size"] <= 10.5


def destaque(w):
    f = fonte(w)
    return bool(re.search(r"Bold|Black|SemiB", f))


def eh_titulo(ln):
    """Título de seção ou subtítulo: negrito/seminegrito/Black de 10,5 a 24 pt."""
    return all(destaque(w) and 10.5 <= w["size"] <= 24 for w in ln)


def eh_capitulo(ln):
    return any(w["size"] > 24 for w in ln)


def eh_citacao(ln):
    return all(w["size"] >= 11.5 and italico(w) and not destaque(w) for w in ln)


def eh_nota_simbolo(t):
    """"* Fine, very fine, and solid silver are mutually exclusive." encerra a lista."""
    return bool(re.match(r"^[*†‡]+\s", t))


def nome_italico(ln):
    """O nome em itálico (ou negrito) no começo do parágrafo ("Balanced*:", "Fluting (TL3).",
    "Cheap (Balance):"), sem a pontuação; None se a linha não começa um verbete."""
    if not corpo(ln[0]) or not (italico(ln[0]) or destaque(ln[0])):
        return None
    estilo = (italico(ln[0]), destaque(ln[0]))
    run = []
    for w in ln:
        if (italico(w), destaque(w)) != estilo or not corpo(w):
            break
        run.append(w)
        if re.search(r"[.:][*†‡]*$|[*†‡]+[.:]$", w["text"]) and not re.search(r"\b(?:p|pp|vs|e\.g|i\.e|St)\.$", w["text"]):
            break  # o nome acaba no ":" ou no "." (o "-" de "-1" depois dele também é itálico)
    if not run or len(run) > 9 or not re.match(r"[A-Z“\"']", run[0]["text"]):
        return None
    if not re.search(r"[.:][*†‡]*$|[*†‡]+[.:]$", run[-1]["text"]):
        # o TL ou a nota depois do nome pode não estar em itálico: "Backpack, Frame (TL1)."
        resto = ln[len(run):len(run) + 3]
        for n in range(1, len(resto) + 1):
            if re.match(r"^(?:\([^()]*\))?[*†‡]*[.:]$", texto(resto[:n])):
                run = run + resto[:n]
                break
        else:
            return None
    if len(run) == len(ln) and len(run) > 6:
        return None  # uma frase inteira em itálico, não um nome
    return texto(run), len(run)


def limpar_nome(nome):
    nome = nome.strip()
    m = TL.search(nome)
    tl = m.group(1).replace("–", "-") if m else ""
    nome = TL.sub("", nome)
    nome = re.sub(r"[*†‡]+", "", nome).strip().rstrip(".:").strip()
    if nome.isupper():
        nome = capitalizar(nome)
    return nome, tl


def custo(t):
    cfs = []
    for m in CF.finditer(t):
        v = (m.group(1) or m.group(2)).replace("–", "-").replace(" ", "")
        if not v.startswith(("+", "-")):
            v = "+" + v
        if v not in cfs:
            cfs.append(v)
    for m in PCT.finditer(t):
        n = float(m.group(1).replace("–", "-").replace(",", "")) / 100
        v = ("+" if n >= 0 else "-") + f"{abs(n):g}"
        if v not in cfs:
            cfs.append(v)
    partes = ["/".join(cfs) + " CF"] if cfs else []
    lista = []
    for m in LISTA.finditer(t):
        v = "×" + (VEZES.get(m.group(1).lower(), m.group(1)) if m.group(1) else str(int(m.group(2)) / 100).rstrip("0").rstrip("."))
        if v not in lista:
            lista.append(v)
    if lista:
        partes.append("/".join(lista))
    dolar = []
    for m in DOLAR.finditer(t):
        if "+$" + m.group(1) not in dolar:
            dolar.append("+$" + m.group(1))
    if dolar and not cfs:
        partes.append("/".join(dolar))
    return "; ".join(partes)


def peso(t):
    achados = []
    for rx, f in PESO:
        for m in rx.finditer(t):
            v = f(m)
            if v not in achados:
                achados.append(v)
    return " / ".join(achados)


def restricao(t):
    achadas = []
    for m in RESTRICAO.finditer(t):
        r = m.group(1).strip()
        if not re.search(r"\b(?:weapon|armor|shield|mail|plate|leather|metal|bow|sword|item|cloth|any|all|only|"
                          r"projectile|knives|stick|axe|hatchet|pick|crossbow|blowpipe)", r, re.I):
            continue
        if r not in achadas:
            achadas.append(r)
    return "; ".join(achadas)


def tipo_da_categoria(categoria, padrao):
    for rx, tipo in TIPO_DA_CATEGORIA:
        if rx.search(categoria):
            return tipo
    return padrao


class Melhoramento:
    def __init__(self, livro, pagina, nome, categoria, aplica_a, titulo=False):
        self.livro, self.pagina, self.categoria, self.aplica_a = livro, pagina, categoria, aplica_a
        self.nome, self.tl = limpar_nome(nome)
        self.titulo = titulo  # começou num subtítulo, não num nome em itálico
        self.dados = False    # começou numa linha de dados ("1, 5 – Dyed, Cheap. +1.5 CF.")
        self.partes, self.restricao, self.custo, self.peso = [], "", "", ""

    def tem_custo(self):
        return bool(custo(juntar(self.partes)))

    def finalizar(self):
        descricao = juntar(self.partes)
        c = self.custo or custo(descricao)
        p = self.peso or peso(descricao)
        if not c or not self.nome or NAO_E.match(self.nome) or len(self.nome) > 70:
            return None
        if self.dados:
            # o custo da linha de dados já está em custo e peso
            descricao = re.sub(r"^[+\-–][\d.]+ CF[.,]?\s*(?:(?:×[\d./]+ weight|\+[\d.]+ lbs)\.?\s*)?", "", descricao)
        return {"livro": self.livro, "pagina": self.pagina, "melhoramento": self.nome, "tl": self.tl,
                "aplica_a": self.aplica_a, "categoria": self.categoria,
                "restricao": self.restricao or restricao(descricao), "custo": c,
                "peso": p, "descricao": descricao}


class Leitor:
    """Lê as linhas de uma área (o texto corrido ou um quadro), na ordem, e grava os verbetes."""

    def __init__(self, livro, padrao, gravar, fixa=""):
        self.livro, self.padrao, self.gravar, self.fixa = livro, padrao, gravar, fixa
        self.atual, self._categoria = None, fixa
        self.titulo_antes = None  # (fim, começo, texto) do título da linha anterior
        self.tabela = None  # (colunas do cabeçalho, linhas lidas) de uma tabela de qualidade
        self.notas = None   # {"1": texto} das notas embaixo da tabela

    @property
    def categoria(self):
        return self._categoria

    @categoria.setter
    def categoria(self, t):
        # a categoria fixa da seção (SECOES) não muda com os títulos
        if not self.fixa:
            self._categoria = re.sub(r"(?<=\S) (And|Of|The|Or|For|In|On|To|With|A|An)\b", lambda m: " " + m.group(1).lower(),
                                     capitalizar(t) if t.isupper() else t)

    def aplica_a(self):
        return tipo_da_categoria(self.categoria, self.padrao)

    def fechar(self):
        if self.atual:
            linha = self.atual.finalizar()
            if linha:
                self.gravar(linha)
        self.atual = None

    def fechar_tabela(self):
        if self.tabela:
            for m in self.tabela["linhas"]:
                if m.get("_ignorar"):
                    continue
                if self.notas:
                    for n in re.findall(r"\[(\d+)\]", m.pop("_notas", "")):
                        if n in self.notas:
                            m["descricao"] = (m["descricao"] + " " if m["descricao"] else "") + self.notas[n]
                m.pop("_notas", None)
                self.gravar(m)
        self.tabela, self.notas = None, None

    def titulo(self, ln, numero):
        self.fechar()
        t = texto(ln)
        antes, self.titulo_antes = self.titulo_antes, (ln[0]["bottom"], ln[0]["x0"], t)
        if antes and 0 < ln[0]["bottom"] - antes[0] < 25 and abs(ln[0]["x0"] - antes[1]) < 80:
            # título em duas linhas ("Mail" / "Variants"): o verbete da primeira linha não teve texto
            self.atual = None
            t = antes[2] + " " + t
            self.titulo_antes = (ln[0]["bottom"], ln[0]["x0"], t)
        if GRUPO.match(t):
            self.categoria = t
            return
        if re.search(r"table$", t, re.I) or t.isupper() or not self.categoria:
            # um título de seção ou de tabela; em maiúsculas também pode ser um melhoramento
            # ("REINFORCED") e vira verbete se tiver custo antes do próximo
            self.fechar_tabela()
            self.categoria = t
            if not re.search(r"table$", t, re.I):
                self.atual = Melhoramento(self.livro, numero, t, self.categoria, self.aplica_a(), titulo=True)
            return
        # subtítulo: um melhoramento ("Fluting (TL1)") ou o título de um grupo deles ("Fine
        # Quality"), conforme venha o custo antes de um nome em itálico
        self.atual = Melhoramento(self.livro, numero, t, self.categoria, self.aplica_a(), titulo=True)

    def linha(self, ln, numero):
        t = texto(ln)
        if not eh_titulo(ln) or DADOS.match(t):
            self.titulo_antes = None
        if eh_capitulo(ln):
            self.fechar()
            self.fechar_tabela()
            self.categoria = ""
            return
        if self.tabela is not None and self.notas is None and t == "Notes":
            self.notas = {}  # as notas embaixo da tabela ("Notes" é um subtítulo)
            return
        if eh_titulo(ln) and not DADOS.match(t):
            self.titulo(ln, numero)
            return
        if not corpo(ln[0]) or eh_citacao(ln):
            return
        if CABECALHO.match(t):
            self.fechar()
            self.cabecalho(ln)
            return
        if self.tabela is not None and self.notas is None:
            if t.startswith("Notes"):
                self.notas = {}
                return
            if self.linha_da_tabela(ln, numero):
                return
            self.fechar_tabela()
        if self.notas is not None:
            m = re.match(r"^\[(\d+)\]\s*(.*)$", t)
            if m:
                self.ultima_nota = m.group(1)
                self.notas[m.group(1)] = m.group(2)
                return
            if self.notas and not eh_titulo(ln):
                self.notas[self.ultima_nota] = juntar([self.notas[self.ultima_nota], t])
                return
        if eh_nota_simbolo(t):
            self.fechar()
            return
        m = DADOS.match(t)
        if m and destaque(ln[0]):
            if self.atual and self.atual.titulo and not self.atual.tem_custo():
                self.categoria = self.atual.nome  # "Aura of Sensation", em cima das linhas de dados
            self.fechar()
            nome, resto, fechado = self.nome_dos_dados(m.group(2))
            self.atual = Melhoramento(self.livro, numero, nome, self.categoria, self.aplica_a())
            self.atual.dados = True
            self.atual.nome_aberto = None if fechado else nome
            self.atual.partes.append(resto)
            return
        if self.atual and getattr(self.atual, "nome_aberto", None) and destaque(ln[0]):
            # o nome de uma linha de dados continua na linha de baixo ("Shifting Colors/Tex-" "tures. +1 CF.")
            ws = [w for w in ln if destaque(w)]
            nome, resto, fechado = self.nome_dos_dados(texto(ws))
            nome = juntar([self.atual.nome_aberto, nome])
            self.atual.nome, self.atual.tl = limpar_nome(nome)
            self.atual.nome_aberto = None if fechado else nome
            self.atual.partes.append(juntar([resto, texto(ln[len(ws):])]))
            return
        ita = nome_italico(ln)
        if ita:
            if self.atual and self.atual.titulo and not self.atual.tem_custo():
                # o subtítulo era o título do grupo de melhoramentos
                self.categoria = self.atual.nome
            self.fechar()
            self.atual = Melhoramento(self.livro, numero, ita[0], self.categoria, self.aplica_a())
            self.atual.partes.append(texto(ln[ita[1]:]))
            return
        if self.atual:
            self.atual.partes.append(t)

    def nome_dos_dados(self, t):
        """"Dyed, Cheap. +1.5 CF." -> ("Dyed, Cheap", "+1.5 CF.", True); o nome vai até o primeiro
        ". ". Sem o ponto, o nome continua na linha de baixo (False)."""
        m = re.match(r"^(.+?)\.\s+(.*)$", t)
        if m:
            return m.group(1), m.group(2), True
        if t.endswith("."):
            return t[:-1], "", True
        return t, "", False

    # ---------- tabelas de qualidade do Dungeon Fantasy 8 ----------

    def cabecalho(self, ln):
        """"Roll Quality Applies To CF Wt. Notes": o começo de cada coluna."""
        nomes = {"Roll": "roll", "Quality": "nome", "Applies": "restricao", "CF": "custo", "Cost": "custo",
                 "Wt.": "peso", "Notes": "notas", "Form": "nome", "Map": "nome", "Language": "nome"}
        cols = [(w["x0"], nomes[w["text"]]) for w in ln if w["text"] in nomes]
        self.tabela = {"cols": cols, "linhas": [], "dados": ""}
        self.notas = None

    def linha_da_tabela(self, ln, numero):
        cols = self.tabela["cols"]
        valores = {}
        for w in ln:
            meio = (w["x0"] + w["x1"]) / 2  # pelo meio: o "+14" começa antes do "Cost" do cabeçalho
            c = max([k for k, (x, _) in enumerate(cols) if x <= meio] or [0])
            valores.setdefault(cols[c][1], []).append(w)
        v = {k: texto(ws) for k, ws in valores.items()}
        # o peso colado ao custo ("+37 ×1.25", "+$20 +5 lbs.") vai para a coluna do peso
        m = re.match(r"^(\S+(?: CF)?)\s+((?:×|\+?\d).*)$", v.get("custo", ""))
        if m:
            v["custo"], v["peso"] = m.group(1), juntar([m.group(2), v.get("peso", "")])
        roll = v.get("roll", "")
        if roll and not re.match(r"^[1-6](?:-[1-6])?(?:,\s*[1-6](?:-[1-6])?)*,?$", roll):
            # o nome que começa colado aos dados cai na coluna dos dados: "1-2, 5-6 Silver-Coated"
            m = re.match(r"^([1-6\-,\s]+?)\s+(\D.*)$", roll)
            if not m:
                return False
            roll, v["nome"] = m.group(1), juntar([m.group(2), v.get("nome", "")])
        linhas = self.tabela["linhas"]
        atual = linhas[-1] if linhas else None
        val = v.get("custo", "")
        if val and not re.match(r"^[+\-–]?\$?[\d.]+|^×|^–$|^Variable$", val):
            return False
        nome, restr = v.get("nome", ""), v.get("restricao", "")
        com_valor = atual is not None and any(n[1] for n in atual["_niveis"])
        if not roll and nome and atual and nome == atual.get("melhoramento"):
            # o mesmo melhoramento com outra restrição e outro custo ("Mirrored" Metallic / Nonmetallic)
            atual["_niveis"].append([restr, val])
            self.resumir(atual)
            return True
        if roll or (nome and val and com_valor) or (nome and not atual):
            # um melhoramento novo; sem os dados, é outra linha do mesmo resultado ("Mirrored Nonmetallic")
            if roll:
                self.tabela["dados"] = roll
            if not nome or nome == "Roll Twice":
                self.tabela["linhas"].append({"_ignorar": True, "_niveis": [["", "x"]]})
                return True
            atual = {"livro": self.livro, "pagina": numero, "melhoramento": nome, "tl": "", "aplica_a": self.aplica_a(),
                     "categoria": self.categoria, "restricao": "", "descricao": "", "custo": "", "peso": "",
                     "_notas": v.get("notas", ""), "_niveis": [[restr, val]]}
            linhas.append(atual)
        elif not atual:
            return False
        elif atual.get("_ignorar"):
            return True
        else:
            # a linha de baixo do mesmo melhoramento: o resto do nome, da restrição ou outra faixa de custo
            if nome:
                atual["melhoramento"] = juntar([atual["melhoramento"], nome])
            if restr:
                if atual["_niveis"][-1][1]:
                    atual["_niveis"].append([restr, ""])  # outra faixa de custo do mesmo melhoramento ("Fine")
                else:
                    atual["_niveis"][-1][0] = juntar([atual["_niveis"][-1][0], restr])
            if val:
                atual["_niveis"][-1][1] = val
            if v.get("notas"):
                atual["_notas"] += " " + v["notas"]
        if v.get("peso") and v["peso"] != "–":
            atual["peso"] = v["peso"]
        self.resumir(atual)
        return True

    @staticmethod
    def resumir(m):
        """custo e restrição de um melhoramento de tabela com várias faixas: "+2/+3/+9 CF" e
        "Crushing-only; impaling-only; projectiles (+2 CF) / Fencing weapons; swords; bows (+3 CF)"."""
        niveis = [n for n in m["_niveis"] if n[1]]
        def fmt(v):
            v = v.replace("–", "-")
            if v.startswith("$"):
                return "+" + v
            return v if v.endswith("CF") or v.startswith(("+$", "×")) or v == "Variable" else v + " CF"
        valores = [fmt(n[1]) for n in niveis]
        valores = [v for v in valores if v not in ("- CF", "–")]
        if len(valores) > 1 and all(v.endswith(" CF") for v in valores):
            m["custo"] = "/".join(v[:-3] for v in valores) + " CF"
            m["restricao"] = " / ".join(f"{n[0]} ({fmt(n[1])})" for n in niveis)
        else:
            m["custo"] = valores[0] if valores else ""
            m["restricao"] = niveis[0][0] if niveis else m["_niveis"][0][0]


def partir(words):
    """"(TL4).This" (sem espaço depois do nome, Low-Tech): duas palavras."""
    saida = []
    for w in words:
        m = re.match(r"^(\([^()]*\)[.:])(\S.*)$", w["text"])
        if not m:
            saida.append(w)
            continue
        x = w["x0"] + (w["x1"] - w["x0"]) * len(m.group(1)) / len(w["text"])
        saida += [{**w, "text": m.group(1), "x1": x}, {**w, "text": m.group(2), "x0": x + 1}]
    return saida


def em_ordem(words, x0, x1, largura_pagina, tres_colunas=False):
    """As linhas de uma área (a página fora dos quadros, ou um quadro) na ordem de leitura. As
    seções lidas aqui são de duas colunas: a área larga se divide no meio, a coluna da esquerda
    vem antes. Um título de capítulo que começa no meio da página ("PERSONAL GEAR AND GOODS"
    embaixo de Container Options, um pedaço em cada coluna) corta as duas: o que está acima dele
    vem antes. (O ler_colunas do extrair_armas.py se perde com as tabelas de armadura no meio; só
    serve às páginas de três colunas.)"""
    if tres_colunas:
        return [ln for ln, _ in ler_colunas(words, x1 - x0)]
    largos, colunas = [], [words]
    if x1 - x0 > largura_pagina * 0.6:
        meio = (x0 + x1) / 2
        # o título que atravessa o meio (o de um quadro largo, "Mail Variants") fica inteiro
        # (sem vão entre as palavras: dois títulos na mesma altura, um em cada coluna, são dois)
        largos = [ln for ln in linhas(words) if eh_titulo(ln) and ln[0]["x0"] < meio - 10 and ln[-1]["x1"] > meio + 10
                  and all(b["x0"] - a["x1"] < 30 for a, b in zip(ln, ln[1:]))]
        nos_largos = {id(w) for ln in largos for w in ln}
        resto = [w for w in words if id(w) not in nos_largos]
        colunas = [[w for w in resto if (w["x0"] + w["x1"]) / 2 < meio], [w for w in resto if (w["x0"] + w["x1"]) / 2 >= meio]]
    lns = [(ln, c) for c, ws in enumerate(colunas) if ws for ln in linhas(ws)] + [(ln, -1) for ln in largos]
    corte = {}
    for ln, c in lns:
        if eh_capitulo(ln):
            corte.setdefault(c, ln[0]["top"])
    cortes = sorted(ln[0]["top"] for ln in largos)

    def chave(k):
        ln, c = lns[k]
        faixa = sum(1 for y in cortes if y <= ln[0]["top"] + 1)  # abaixo de quantos títulos largos
        capitulo = 1 if c in corte and ln[0]["top"] >= corte[c] - 1 else 0
        if eh_capitulo(ln):
            return faixa, capitulo, -1, ln[0]["top"]  # antes do texto embaixo dele, nas duas colunas
        return faixa, capitulo, c, ln[0]["top"]
    return [lns[k][0] for k in sorted(range(len(lns)), key=chave)]


def juntar_repetidos(linhas):
    """O mesmo melhoramento duas vezes no mesmo livro e tipo de equipamento (Martial Arts lista os
    efeitos e, adiante, os custos): uma linha, com os textos e os custos dos dois."""
    saida, por_chave = [], {}
    for l in linhas:
        chave = (l["aplica_a"], l["categoria"], l["melhoramento"].lower())
        if chave not in por_chave:
            por_chave[chave] = l
            saida.append(l)
            continue
        a = por_chave[chave]
        if l["descricao"] and l["descricao"] not in a["descricao"]:
            a["descricao"] = juntar([a["descricao"], l["descricao"]])
        for campo in ("custo", "peso", "restricao"):
            if l[campo] and l[campo] not in a[campo]:
                a[campo] = "; ".join(x for x in (a[campo], l[campo]) if x)
        for campo in ("tl", "categoria"):
            a[campo] = a[campo] or l[campo]
    return saida


def processar(caminho, livro, secoes):
    linhas = []

    def gravar(linha):
        linha = {k: v for k, v in linha.items() if not k.startswith("_")}
        if linha["melhoramento"] and linha["custo"] and not any(t in livro and n == linha["melhoramento"] for t, n in FORA):
            linhas.append(linha)

    tres = any(t in livro for t in TRES_COLUNAS)
    with pdfplumber.open(caminho) as pdf:
        for faixas, padrao, fixa in secoes:
            for ini, fim in faixas:
                principal = Leitor(livro, padrao, gravar, fixa)
                for i in range(ini - 1, min(fim, len(pdf.pages))):
                    page = pdf.pages[i]
                    h = page.height
                    todas = page.extract_words(x_tolerance=1.5, extra_attrs=["fontname", "size"])
                    rodape = sorted([w for w in todas if w["top"] >= h - 50], key=lambda w: w["x0"])
                    numero = next((w["text"] for w in rodape if w["text"].isdigit()), "") or str(i + 1)
                    words = partir([w for w in todas if 30 < w["top"] < h - 50 and "ICONS" not in w["fontname"].upper()])
                    caixas = [c for c in quadros(page) if (c[2] - c[0]) < page.width * 0.9]
                    fora = [w for w in words if not dentro(w, caixas)]
                    for ln in em_ordem(fora, 0, page.width, page.width, tres) if fora else []:
                        principal.linha(ln, numero)
                    # cada quadro é lido à parte, com o título dele como categoria
                    for c in caixas:
                        ws = [w for w in words if dentro(w, [c])]
                        if not ws:
                            continue
                        quadro = Leitor(livro, padrao, gravar, fixa)
                        for ln in em_ordem(ws, c[0], c[2], page.width, tres):
                            quadro.linha(ln, numero)
                        quadro.fechar()
                        quadro.fechar_tabela()
                    page.flush_cache()
                    gc.collect()
                principal.fechar()
                principal.fechar_tabela()
    return juntar_repetidos(linhas)


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
    arquivo = a.saida or (a.pasta / "melhoramentos.csv")
    contador = Counter()
    with open(arquivo, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=CAMPOS, delimiter=";")
        w.writeheader()
        for p in pdfs:
            secoes = [(x[1], x[2], x[3] if len(x) > 3 else "") for x in SECOES if x[0] in p.name]
            if not secoes:
                continue
            livro = nome_bonito(p)
            print(f"Lendo {p.name} ...")
            try:
                linhas = processar(p, livro, secoes)
            except Exception as e:
                print(f"  ERRO: {e}")
                continue
            w.writerows(linhas)
            contador[livro] += len(linhas)
            print(f"  {contador[livro]} melhoramentos")
    print(f"\nTotal: {sum(contador.values())} melhoramentos -> {arquivo}")


if __name__ == "__main__":
    main()
