"""
Gera um CSV com todas as ARMAS (weapons) das tabelas dos seus livros GURPS.

Colunas: livro; pagina; tipo; tabela; pericia; defaults; tl; arma; modo; dano; alcance; aparar;
         precisao; distancia; peso; cdt; tiros; espoleta; st; volume; recuo; custo; cl;
         notas; rodape; descricao

Uma linha por linha da tabela do livro. A arma com mais de um ataque (golpe e estocada, por
exemplo) ocupa várias linhas, todas com o nome e o TL da arma; nas linhas seguintes à primeira,
"modo" traz o que o livro escreve no lugar do nome ("or", "with Dart", "two hands", "linked").
"tipo" é Melee (tabelas com Reach e Parry) ou Ranged (Acc, Range ou Fuse); "tabela" é o título
da tabela no livro ("Melee Weapon Table").
"pericia" e "defaults" saem do título do grupo da tabela ("AXE/MACE (DX-5, Flail-4, ...)").
Os valores ficam como no livro: dano (Damage), alcance (Reach), aparar (Parry), precisao (Acc),
distancia (Range), peso (Weight), cdt (RoF, cadência de tiro), tiros (Shots), espoleta (Fuse),
st (ST), volume (Bulk), recuo (Rcl), custo (Cost), cl (LC, classe de legalidade), notas (Notes).
"rodape" traz o texto das notas numeradas citadas em "notas" ([1], [2]...), lidas embaixo da
tabela ou na página seguinte. "descricao" é o verbete da arma nas listas de armas descritas
(Low-Tech e Martial Arts: "KNOBBED CLUB (p. 65) – Universal. A club with...").

Uso:
    pip install pdfplumber
    python extrair_armas.py
    python extrair_armas.py --pasta "C:\\outra\\pasta" --saida armas.csv

O script lê todos os PDFs da pasta (e subpastas) e reconhece as tabelas pelo formato padrão
dos livros GURPS 4e: cabeçalho em negrito-itálico (TL, Weapon, Damage...), grupos por perícia
em negrito ("AXE/MACE (DX-5, ...)") e as linhas da tabela, cada valor alinhado à sua coluna
do cabeçalho. Tabelas sem custo nem peso (as de comparação, como a de Powers) ficam de fora.
A leitura das tabelas (ler_livro) serve também ao extrair_armaduras.py. O extrair_pericias.py
precisa estar na mesma pasta.
O CSV usa ";" e UTF-8 com BOM, para abrir direto no Excel em português.
"""
import argparse, csv, gc, re, sys, unicodedata
from collections import Counter
from pathlib import Path

try:
    import pdfplumber
    import pypdfium2
except ImportError:
    sys.exit("Instale antes:  pip install pdfplumber")

# extrair_pericias.py fica na mesma pasta deste script
sys.path.insert(0, str(Path(__file__).resolve().parent))
from extrair_pericias import PASTA_PADRAO, juntar, nome_bonito

CAMPOS = ["livro", "pagina", "tipo", "tabela", "pericia", "defaults", "tl", "arma", "modo", "dano",
          "alcance", "aparar", "precisao", "distancia", "peso", "cdt", "tiros", "espoleta", "st",
          "volume", "recuo", "custo", "cl", "notas", "rodape", "descricao"]
# coluna do livro -> coluna do CSV
COLUNAS = {"Damage": "dano", "Reach": "alcance", "Parry": "aparar", "Acc": "precisao",
           "Range": "distancia", "Weight": "peso", "RoF": "cdt", "Shots": "tiros", "Fuse": "espoleta",
           "ST": "st", "Bulk": "volume", "Rcl": "recuo", "Cost": "custo", "LC": "cl", "Notes": "notas"}

# Páginas candidatas (texto rápido, pelo pypdfium2): cabeçalho de tabela de arma, armadura ou escudo.
CABECALHO = re.compile(r"^\s*(?:TL\s+)?(?:Weapon|Armor|Torso Armor|Shield)\s+(?:Damage|Location|DR|DB)\b", re.M)
# Nomes de coluna de duas palavras e grafias diferentes da mesma coluna.
DUAS_PALAVRAS = {"Torso Armor", "Cover DR"}
SINONIMOS = {"Wt.": "Weight", "Acc*": "Acc"}
COLUNA_DO_NOME = ("Weapon", "Armor", "Torso Armor", "Shield")
TL = re.compile(r"^(?:\d{1,2}\^?|\^|–|-|var\.)$")
# Começo de um valor das colunas de números ("sw+2 cut", "1, 2*", "0U", "$50", "neg.", "T(1)",
# "spec.", "No", "C, 1"): o texto corrido que cai numa tabela não passa por aqui.
VALOR = re.compile(r"^(?:[\d\-–+×$(/]|spec|spcl|var|neg|no\b|see\b|sw|thr|ht|c\b|c,|t\(|jet)", re.I)
TEXTO_LIVRE = {"Notes", "Location"} | set(COLUNA_DO_NOME)
NOTA = re.compile(r"^\[(\d+)\]")
# Siglas que ficam em maiúsculas quando o grupo da tabela ("GUNS (SMG)") vira "Guns (SMG)".
SIGLAS = {"DX", "IQ", "HT", "ST", "SMG", "LMG", "HMG", "GL", "ATGM", "SAM", "LAW", "MG", "PDW",
          "ICW", "TL", "AT", "RPG", "SM"}


def fonte(w):
    return w["fontname"].split("+")[-1]


def italico(w):
    return "Italic" in fonte(w)


def eh_cabecalho(w):
    return fonte(w).endswith("BoldItalic") and "Semi" not in fonte(w) and w["size"] < 11


def eh_negrito(w):
    f = fonte(w)
    return ("Bold" in f or "Black" in f) and not italico(w)


def eh_grupo(ln):
    """Título de grupo da tabela: negrito de 10 a 12,5 pt ("AXE/MACE (...)", "Body Armor")."""
    return eh_negrito(ln[0]) and all(("Bold" in fonte(w) or "Black" in fonte(w)) and 10 <= w["size"] <= 12.6
                                     for w in ln)


def eh_titulo(ln):
    """Título de seção ou de tabela ("Melee Weapon Table", "MECHANICAL ARTILLERY TABLE")."""
    return all(w["size"] >= 12 and ("Bold" in fonte(w) or "Black" in fonte(w)) for w in ln)


def titulo_na_linha(ln):
    """O título que ocupa um trecho da linha (a outra coluna pode ter texto na mesma altura).
    Letra grande sem negrito é citação, não título."""
    ks = [k for k, w in enumerate(ln) if w["size"] >= 12]
    if ks and ks == list(range(ks[0], ks[-1] + 1)) and eh_titulo([ln[k] for k in ks]):
        return ln[ks[0]:ks[-1] + 1]
    return None


def texto(ws):
    """Junta as palavras; colado quando não há espaço entre elas (letra capitular, versalete)."""
    t, anterior = "", None
    for w in ws:
        if anterior is not None and w["x0"] - anterior["x1"] > 0.8:
            t += " "
        t += w["text"]
        anterior = w
    return t.replace("¥", "×")


def linhas(words):
    out, atual = [], []
    for w in sorted(words, key=lambda w: (w["bottom"], w["x0"])):
        if atual and abs(atual[-1]["bottom"] - w["bottom"]) >= 2.5:
            out.append(sorted(atual, key=lambda w: w["x0"]))
            atual = []
        atual.append(w)
    if atual:
        out.append(sorted(atual, key=lambda w: w["x0"]))
    return out


# ---------- cabeçalho e linhas da tabela ----------

def ler_cabecalho(ln):
    """Colunas do cabeçalho, ou None se a linha não é cabeçalho de tabela de arma ou armadura."""
    ws = [w for w in ln if eh_cabecalho(w)]
    if len(ws) < 4 or ws[0]["text"] not in ("TL", "Weapon", "Armor", "Torso", "Shield"):
        return None
    cols = []
    for w in ws:
        if cols and w["x0"] - cols[-1]["x1"] < 6 and f'{cols[-1]["nome"]} {w["text"]}' in DUAS_PALAVRAS:
            cols[-1]["x1"] = w["x1"]
            cols[-1]["nome"] += " " + w["text"]
        else:
            cols.append({"x0": w["x0"], "x1": w["x1"], "nome": w["text"]})
    for c in cols:
        c["nome"] = SINONIMOS.get(c["nome"], c["nome"])
        c["meio"] = (c["x0"] + c["x1"]) / 2
    nomes = {c["nome"] for c in cols}
    if not nomes & set(COLUNA_DO_NOME) or not nomes & {"Damage", "DR", "DB"} or not nomes & {"Cost", "Weight"}:
        return None
    return cols


def tipo_da_tabela(cols):
    nomes = {c["nome"] for c in cols}
    if "DB" in nomes:
        return "Shield"
    if "DR" in nomes:
        return "Armor"
    if nomes & {"Reach", "Parry"}:
        return "Melee"
    if nomes & {"Acc", "Range", "Fuse"}:
        return "Ranged"
    return ""


NOME_E_DANO = re.compile(r"^(.+?[a-z.,”’)])(\d+d(?:[+\-]\d+)?)$")


def descolar(ln):
    """O PDF às vezes cola o fim do nome no dano ("Small12d+2"): separa em duas palavras,
    dividindo a largura pela quantidade de letras."""
    out = []
    for w in ln:
        m = NOME_E_DANO.match(w["text"])
        if not m:
            out.append(w)
            continue
        meio = w["x0"] + (w["x1"] - w["x0"]) * len(m.group(1)) / len(w["text"])
        out += [dict(w, text=m.group(1), x1=meio - 1), dict(w, text=m.group(2), x0=meio + 1, descolada=True)]
    return out


def custo_alinhamento(x0, x1, col, cols):
    """Distância de um trecho da linha à coluna: pela esquerda, pela direita ou pelo centro, o
    que for menor. Um trecho que cobre o centro de duas colunas não é de nenhuma."""
    if sum(1 for c in cols if x0 <= c["meio"] <= x1) > 1:
        return 1000
    return min(abs(x0 - col["x0"]), abs(x1 - col["x1"]), abs((x0 + x1) / 2 - col["meio"]))


def alinhar(ln, cols):
    """Distribui as palavras da linha (em ordem) pelas colunas (em ordem). Palavras a até 4 pt
    uma da outra ficam na mesma coluna, a não ser que separá-las alinhe bem melhor ("1 $102,500",
    Rcl e Cost encostados); palavras mais distantes só ficam juntas se alinharem bem melhor.
    Devolve ({coluna: [palavras]}, pior distância, quantas palavras próximas foram separadas)."""
    ws = descolar(ln)
    n, m, inf = len(ws), len(cols), float("inf")
    perto = [k > 0 and ws[k]["x0"] - ws[k - 1]["x1"] <= 4 and not ws[k].get("descolada") for k in range(n)]

    def custo(t, i, j):
        """Palavras t..i-1 na coluna j."""
        return custo_alinhamento(ws[t]["x0"], ws[i - 1]["x1"], cols[j], cols) \
            + 4 * sum(1 for k in range(t + 1, i) if not perto[k]) + (3 if perto[t] else 0)

    melhor = [[inf] * (m + 1) for _ in range(n + 1)]
    de = [[None] * (m + 1) for _ in range(n + 1)]
    for j in range(m + 1):
        melhor[0][j] = 0
    for j in range(1, m + 1):
        for i in range(1, n + 1):
            melhor[i][j], de[i][j] = melhor[i][j - 1], None
            for t in range(i):
                if melhor[t][j - 1] < inf:
                    c = melhor[t][j - 1] + custo(t, i, j - 1)
                    if c < melhor[i][j]:
                        melhor[i][j], de[i][j] = c, t
    res, pior, separadas, i, j = {}, 0, 0, n, m
    while i > 0 and j > 0:
        t = de[i][j]
        if t is None:
            j -= 1
            continue
        pior = max(pior, custo_alinhamento(ws[t]["x0"], ws[i - 1]["x1"], cols[j - 1], cols))
        separadas += perto[t]
        res[cols[j - 1]["nome"]] = ws[t:i]
        i, j = t, j - 1
    return res, (pior if i == 0 else inf), separadas


# ---------- grupos ----------

def capitalizar(t):
    """"TWO-HANDED AXE/MACE" -> "Two-Handed Axe/Mace"; siglas (DX, SMG) ficam."""
    return re.sub(r"[A-Z][A-Z]+", lambda m: m.group(0) if m.group(0) in SIGLAS else m.group(0).capitalize(), t)


def separar_grupo(g):
    """"AXE/MACE (DX-5, Flail-4, or Two-Handed Axe/Mace-3)" -> ("Axe/Mace", "DX-5, Flail-4, ...")."""
    g = re.sub(r"\s*\((?:C|c)ontinued\)", "", g).strip()
    if g.endswith(")"):
        nivel = 0
        for k in range(len(g) - 1, -1, -1):
            nivel += {")": 1, "(": -1}.get(g[k], 0)
            if nivel == 0:
                dentro = g[k + 1:-1]
                if re.search(r"\d|default", dentro):
                    return capitalizar(g[:k].strip()), dentro.strip()
                break
    return capitalizar(g), ""


def eh_grupo_de_pericia(t):
    return bool(re.match(r"^[A-Z][A-Z/\-']{2,}", t))


# ---------- notas embaixo da tabela ----------

def ler_colunas(words, largura):
    """Linhas de uma faixa da página na ordem de leitura, coluna por coluna, de cima para baixo,
    como (palavras, coluna). As colunas saem das margens em que mais de um trecho de linha começa
    (trecho: o pedaço entre vãos de mais de 8 pt), como em extrair_pericias.py. Cada trecho vai
    inteiro para uma coluna, então a linha que ocupa a largura toda não se parte; os trechos da
    mesma linha e coluna (texto justificado em coluna estreita) voltam a ser uma linha só."""
    trechos = []  # (palavras, número da linha)
    for k, ln in enumerate(linhas(words)):
        atual = [ln[0]]
        for w in ln[1:]:
            if w["x0"] - atual[-1]["x1"] > 8:
                trechos.append((atual, k))
                atual = []
            atual.append(w)
        trechos.append((atual, k))
    inicios = Counter(round(t[0]["x0"] / 6) * 6 for t, _ in trechos)
    cols = []
    for x in sorted(x for x, c in inicios.items() if c >= 2):
        if not cols or x - cols[-1] > largura * 0.2:
            cols.append(x)
    # Um título que avança bem nas duas colunas (o de um quadro embaixo das notas) divide a
    # faixa: primeiro tudo o que está acima dele, coluna por coluna, depois ele.
    def atravessa(t):
        return any(w["size"] >= 11 for w in t) and any(t[0]["x0"] < x - 40 and t[-1]["x1"] > x + 40 for x in cols[1:])

    cortes = [t[0]["bottom"] for t, _ in trechos if atravessa(t)]

    def ordem(trecho):
        t, k = trecho
        faixa = sum(1 for c in cortes if c < t[0]["bottom"] - 1)
        # a margem da coluna pode estar um pouco à direita (a maioria das linhas recuadas)
        coluna = max([i for i, x in enumerate(cols) if x <= t[0]["x0"] + 12] or [0])
        return faixa, atravessa(t), coluna, k, t[0]["x0"]

    out = []
    for trecho in sorted(trechos, key=ordem):
        t, chave = trecho[0], ordem(trecho)
        if out and out[-1][1][:4] == chave[:4] and tamanho(out[-1][0]) == tamanho(t) \
                and t[0]["x0"] - out[-1][0][-1]["x1"] < 40:
            out[-1][0].extend(t)
        else:
            out.append((list(t), chave))
    return [(ln, chave[:3]) for ln, chave in out]


def tamanho(ln):
    """Tamanho da letra da linha: o maior (no versalete, o das iniciais)."""
    return round(max(w["size"] for w in ln), 1)


def eh_quebra_de_nota(ln):
    """Linha que encerra uma nota (ou um verbete): título, citação em letra grande, nota de símbolo."""
    p = ln[0]
    return (eh_negrito(p) and p["size"] >= 10.5) or any(w["size"] >= 11.5 for w in ln) \
        or texto(ln).startswith(("Notes", "Note ", "* ", "† ", "‡ "))


def sem_legendas(lns):
    """As linhas de ler_colunas sem as legendas de ilustração e as citações: letra grande sem
    negrito, ou em negrito mas na altura de uma linha de texto da mesma coluna ("Horse-Cutter"
    ao lado do texto). Elas não encerram a nota nem o verbete ao lado; ficam de fora."""
    texto_normal = [(ln[0]["bottom"], c) for ln, c in lns if tamanho(ln) < 11]

    def legenda(ln, c):
        return all(w["size"] >= 11.5 for w in ln) and (
            not eh_negrito(ln[0]) or any(c2 == c and abs(y - ln[0]["bottom"]) < 4 for y, c2 in texto_normal))

    return [(ln, c) for ln, c in lns if not legenda(ln, c)]


def segue(anterior, ln, coluna):
    """A linha continua o texto da anterior: é a linha de baixo na mesma coluna (sem vão), ou o
    alto da coluna seguinte."""
    if anterior is None:
        return False
    dy = ln[0]["bottom"] - anterior[0]
    return 8 <= dy <= 20 if coluna == anterior[1] else dy <= -30


def notas_da_faixa(words, largura, pg):
    """Notas numeradas ("[1] Can be thrown...") de uma faixa da página, na ordem de leitura."""
    notas, atual, anterior = [], None, None
    for ln, coluna in sem_legendas(ler_colunas(words, largura)):
        t = texto(ln)
        m = NOTA.match(t)
        if m:
            atual = {"ev": "nota", "pg": pg, "y": ln[0]["bottom"], "n": int(m.group(1)), "partes": [t[m.end():]]}
            notas.append(atual)
        elif atual and not eh_quebra_de_nota(ln) and 8.5 <= ln[0]["size"] <= 10.5 and segue(anterior, ln, coluna):
            atual["partes"].append(t)
        else:
            atual = None
        anterior = (ln[0]["bottom"], coluna)
    for nt in notas:
        nt["texto"] = juntar(nt.pop("partes"))
    return notas


# ---------- leitura das páginas ----------

class Leitor:
    """Lê as tabelas de um livro, página a página, guardando o grupo entre as páginas."""

    def __init__(self, livro):
        self.livro = livro
        self.grupo = ""
        self.categoria = ""
        self.ultimo = None  # última linha de item, para as linhas "or" (mesmo na página seguinte)
        self.titulos = []  # títulos vistos desde o último cabeçalho: (texto, página, linha, x0, x1)
        self.tabela = ""

    def pagina(self, page, pg):
        h = page.height
        todas = page.extract_words(x_tolerance=1.5, extra_attrs=["fontname", "size"])
        rodape = sorted([w for w in todas if w["top"] >= h - 50], key=lambda w: w["x0"])
        numero = next((w["text"] for w in rodape if w["text"].isdigit()), "") or str(pg + 1)
        words = [w for w in todas if 30 < w["top"] < h - 45 and "ICONS" not in w["fontname"].upper()]
        usadas, blocos, eventos = set(), [], []
        cols, grupo_antes = None, None  # grupo_antes: (texto, linha, é de perícia) do último grupo
        falhas = 0  # linhas seguidas que não são da tabela
        quebrado = None  # TL e começo de um nome que continua na linha de baixo
        for k, ln in enumerate(linhas(words)):
            novas = ler_cabecalho(ln)
            if novas:
                cols, tipo = novas, tipo_da_tabela(novas)
                xmin, xmax = cols[0]["x0"] - 20, cols[-1]["x1"] + 30
                nome_col = next((c["nome"] for c in cols if c["nome"] in COLUNA_DO_NOME), cols[0]["nome"])
                if grupo_antes and grupo_antes[1] >= k - 2 and grupo_antes[2]:
                    self.grupo, self.categoria = grupo_antes[0], ""
                # nome da tabela: o título logo acima do cabeçalho (ou do grupo), senão um
                # "... Table" da mesma página; sem título nenhum desde a tabela anterior, é a mesma
                # tabela, continuada; com outros títulos no meio (quadros, seções), fica sem nome
                if self.titulos:
                    acima = [(t, j) for t, p, j, x0, x1 in self.titulos
                             if p == pg and x0 < cols[-1]["x1"] and x1 > cols[0]["x0"]]
                    junto = [t for t, j in acima if j >= k - 3]
                    da_pagina = [t for t, _ in acima if "table" in t.lower()]
                    self.tabela = (junto or da_pagina or [""])[-1]
                self.titulos = []
                blocos.append([ln[0]["top"], ln[0]["bottom"]])
                usadas.update(id(w) for w in ln if eh_cabecalho(w))
                quebrado, falhas = None, 0
                continue
            titulo = titulo_na_linha(ln)
            if titulo:
                t, x0, x1 = texto(titulo), titulo[0]["x0"], titulo[-1]["x1"]
                if self.titulos and self.titulos[-1][1:3] == (pg, k - 1):
                    t0, _, _, x0, _ = self.titulos.pop()
                    t = t0 + " " + t  # título em duas linhas
                self.titulos.append((capitalizar(t), pg, k, x0, x1))
                cols, self.grupo, self.categoria, self.ultimo = None, "", "", None
                continue
            # o título do grupo pode começar à esquerda da coluna TL
            dentro = [w for w in ln if cols is None or xmin - 25 <= w["x0"] and w["x1"] <= xmax]
            if not dentro:
                continue
            t = texto(dentro)
            if eh_grupo(dentro) and not t.startswith("Note"):
                if grupo_antes and grupo_antes[1] == k - 1:
                    # título de grupo em duas linhas
                    t, de_pericia = grupo_antes[0] + " " + t, grupo_antes[2]
                else:
                    de_pericia = eh_grupo_de_pericia(t)
                grupo_antes = (t, k, de_pericia)
                if cols:
                    if de_pericia:
                        self.grupo, self.categoria = t, ""
                    else:
                        self.categoria = t  # "Body Armor", "Headgear"
                    usadas.update(id(w) for w in dentro)
                    blocos[-1][1] = dentro[-1]["bottom"]
                continue
            dentro = [w for w in dentro if cols is None or xmin <= w["x0"]]
            if cols is None or not dentro:
                continue
            if all(w["size"] >= 12 for w in dentro):
                continue  # citação em letra grande no meio da tabela
            linha = self.linha(dentro, cols, nome_col)
            if linha is None:
                # uma linha estranha (nome colado no dano, legenda) não encerra a tabela; duas sim,
                # e as notas também
                falhas += 1
                if falhas >= 2 or NOTA.match(t) or t.startswith(("Notes", "Note ")):
                    cols = None
                continue
            falhas = 0
            usadas.update(id(w) for w in dentro)
            blocos[-1][1] = dentro[-1]["bottom"]
            tl, nome = linha["tl"], linha["nome"]
            if linha["so_nome"]:
                quebrado = (tl, nome)
                continue
            if quebrado and not tl and nome:
                tl, nome = quebrado[0], juntar([quebrado[1], nome])
                linha["continua"] = False
            quebrado = None
            if linha["continua"] and self.ultimo:
                tl, modo, nome = self.ultimo["tl"], nome, self.ultimo["nome"]
            else:
                modo = ""
            self.ultimo = {"ev": "linha", "pg": pg, "y": dentro[0]["bottom"], "livro": self.livro, "pagina": numero,
                           "tipo": tipo, "tabela": self.tabela, "grupo": self.grupo, "categoria": self.categoria,
                           "tl": tl, "nome": nome,
                           "modo": modo, "valores": linha["valores"], "coluna_do_nome": nome_col}
            eventos.append(self.ultimo)
        # notas: as palavras que sobraram, em faixas entre os blocos de tabela
        livres = [w for w in words if id(w) not in usadas]
        limites = [0] + [y for b in sorted(blocos) for y in b] + [h]
        for a, b in zip(limites[0::2], limites[1::2]):
            faixa = [w for w in livres if a <= w["top"] and w["bottom"] <= b + 1]
            eventos += notas_da_faixa(faixa, page.width, pg)
        return sorted(eventos, key=lambda e: e["y"])

    def linha(self, ln, cols, nome_col):
        """Valores de uma linha da tabela, ou None se ela não é linha da tabela (fim da tabela)."""
        if not 8 <= max(w["size"] for w in ln) <= 11:
            return None
        tem_tl = cols[0]["nome"] == "TL"
        res, pior, separadas = alinhar(ln, cols)
        # texto corrido só se encaixa nas colunas partindo as frases em vários pontos
        if pior > 14 or separadas > 1:
            return None
        valores = {c: texto(ws) for c, ws in res.items()}
        primeira = texto(ln)
        if NOTA.match(primeira) or primeira.startswith(("Notes", "Note ", "* ", "† ")):
            return None
        tl = valores.pop("TL", "") if tem_tl else ""
        nome = valores.pop(nome_col, "")
        nome_italico = bool(res.get(nome_col)) and all(italico(w) for w in res[nome_col])
        if tl and not TL.match(tl):
            return None
        if any(not VALOR.match(v) for c, v in valores.items() if c not in TEXTO_LIVRE):
            return None
        if tem_tl and not tl and not nome:
            return None
        preenchidas = len(valores) + bool(tl) + bool(nome)
        # "or", "with Dart", "+ Visor"; no Fantasy, "– with Chainshot" (TL "–")
        continua = bool(nome) and tl in ("", "–", "-") and (nome_italico or nome[0].islower() or nome[0] in "+–-")
        so_nome = bool(tl) and bool(nome) and not valores
        if preenchidas < 3 and not so_nome and not (continua and preenchidas >= 2):
            return None
        return {"tl": tl, "nome": nome, "valores": valores, "continua": continua, "so_nome": so_nome}


def paginas_com_tabela(caminho):
    """Índices das páginas com cabeçalho de tabela (texto rápido, pelo pypdfium2)."""
    pdf = pypdfium2.PdfDocument(str(caminho))
    try:
        return [i for i in range(len(pdf)) if CABECALHO.search(pdf[i].get_textpage().get_text_range())]
    finally:
        pdf.close()


def ler_livro(caminho, livro):
    """Linhas das tabelas de armas, armaduras e escudos do livro, cada uma com "rodape": o texto
    das notas numeradas citadas na coluna Notes. As notas valem para as linhas lidas desde o
    último bloco de notas: embaixo da tabela ou na página seguinte."""
    paginas = paginas_com_tabela(caminho)
    if not paginas:
        return []
    leitor, eventos = Leitor(livro), []
    with pdfplumber.open(caminho) as pdf:
        # a página seguinte à tabela entra pelas notas que às vezes ficam nela
        for i in sorted(set(paginas) | {i + 1 for i in paginas if i + 1 < len(pdf.pages)}):
            page = pdf.pages[i]
            eventos += leitor.pagina(page, i)
            page.flush_cache()
            gc.collect()
    linhas_lidas, pendentes, notas = [], [], {}

    def resolver():
        for ln in pendentes:
            refs = [int(n) for g in re.findall(r"\[([\d,\s]+)\]", ln["valores"].get("Notes", ""))
                    for n in re.findall(r"\d+", g)]
            ln["rodape"] = " ".join(f"[{n}] {notas[n]}" for n in refs if n in notas)
            ln["sem_nota"] = [n for n in refs if n not in notas]
        pendentes.clear()
        notas.clear()

    for ev in eventos:
        if ev["ev"] == "linha":
            if notas:
                resolver()
            pendentes.append(ev)
            linhas_lidas.append(ev)
        elif pendentes:
            if ev["n"] in notas:
                resolver()  # outra série de notas, de outra tabela
            else:
                notas[ev["n"]] = ev["texto"]
    resolver()
    return linhas_lidas


# ---------- verbetes das listas de armas (Low-Tech, Martial Arts) ----------

def norm(s):
    s = unicodedata.normalize("NFKD", s).replace("’", "'")
    return re.sub(r"[^a-z0-9]", "", s.lower())


VERBETE = re.compile(r"^([A-ZÀ-Þ][^()–]{1,45}?)\s*(?:\((?:pp?\.|illustration)[^)]*\)\s*)?–\s*(.+)$")
# Começo de verbete: nome, páginas entre parênteses (que podem seguir na linha de baixo) e o
# travessão. Uma remissão no começo da linha ("SMALLSWORD (p. 229) is even lighter...") não é.
INICIO_DE_VERBETE = re.compile(r"^[A-ZÀ-Þ][^()–]{0,45}?\s*(?:\([^)]*(?:\)\s*)?)?(?:–|$)")


def verbetes(caminho):
    """{nome normalizado: texto} dos verbetes de arma: nome em negrito (versalete) no começo
    da linha, as páginas entre parênteses, travessão e o texto ("Universal. A club with...")."""
    pdf = pypdfium2.PdfDocument(str(caminho))
    try:
        paginas = [i for i in range(len(pdf))
                   if len(re.findall(r"^[A-Z][A-Za-z\-' ,]{1,40}\s*\(pp?\. [^)]*\)\s*–", pdf[i].get_textpage().get_text_range(), re.M)) >= 3]
    finally:
        pdf.close()
    lidos = []  # linhas de cada verbete
    if not paginas:
        return {}
    with pdfplumber.open(caminho) as pdf:
        for i in paginas:
            page = pdf.pages[i]
            h = page.height
            words = [w for w in page.extract_words(x_tolerance=1.5, extra_attrs=["fontname", "size"])
                     if 30 < w["top"] < h - 50]
            lns = sem_legendas(ler_colunas(words, page.width))
            margem = {}
            for ln, coluna in lns:
                margem[coluna] = min(margem.get(coluna, ln[0]["x0"]), ln[0]["x0"])
            atual, anterior, letra = None, None, 0
            for ln, coluna in lns:
                t = texto(ln)
                # o verbete começa com o nome em negrito; as páginas entre parênteses podem
                # continuar na linha de baixo ("illustra-" / "tion, p. 52) – ...")
                if eh_negrito(ln[0]) and ln[0]["size"] < 10.5 and INICIO_DE_VERBETE.match(t):
                    atual, letra = [t], tamanho(ln)
                    lidos.append(atual)
                    anterior = (ln[0]["bottom"], coluna)
                    continue
                if not atual:
                    continue
                # quadro lateral (título e texto em letra menor) entre o fim da coluna e a
                # continuação do verbete na coluna seguinte, ou no meio da coluna: fica de fora
                if tamanho(ln) != letra or (coluna != anterior[1] and eh_quebra_de_nota(ln)):
                    continue
                if eh_quebra_de_nota(ln):
                    atual = None
                # na coluna seguinte, o verbete continua recuado (as linhas na margem são de outro texto)
                elif segue(anterior, ln, coluna) and (coluna == anterior[1] or ln[0]["x0"] > margem[coluna] + 6):
                    atual.append(t)
                else:
                    atual = None
                anterior = (ln[0]["bottom"], coluna)
            page.flush_cache()
            gc.collect()
    achados = {}
    for partes in lidos:
        m = VERBETE.match(juntar(partes))
        if m:
            achados.setdefault(norm(m.group(1)), m.group(2))
    return achados


# Variantes descritas no verbete da arma-base: SMALL KNIFE e LARGE KNIFE estão em KNIFE.
VARIANTES = {"small", "large", "long", "short", "light", "heavy", "thrusting", "dueling", "round", "late",
             "dress", "edged", "great", "giant"}


def descricao(nome, descricoes):
    """O verbete da arma; sem verbete próprio, o da arma-base ("Small Round Mace" -> "Mace")."""
    palavras = nome.split()
    while palavras:
        d = descricoes.get(norm(" ".join(palavras)))
        if d:
            return d
        if len(palavras) == 1 or palavras[0].lower() not in VARIANTES:
            return ""
        palavras = palavras[1:]
    return ""


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
    arquivo = a.saida or (a.pasta / "armas.csv")
    contador, sem_nota = Counter(), []
    with open(arquivo, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=CAMPOS, delimiter=";")
        w.writeheader()
        for p in pdfs:
            livro = nome_bonito(p)
            print(f"Lendo {p.name} ...")
            try:
                armas = [ln for ln in ler_livro(p, livro) if ln["tipo"] in ("Melee", "Ranged")]
                descricoes = verbetes(p) if armas else {}
            except Exception as e:
                print(f"  ERRO: {e}")
                continue
            for ln in armas:
                pericia, defaults = separar_grupo(ln["grupo"])
                d = {"livro": livro, "pagina": ln["pagina"], "tipo": ln["tipo"], "tabela": ln["tabela"], "pericia": pericia,
                     "defaults": defaults, "tl": ln["tl"], "arma": ln["nome"], "modo": ln["modo"],
                     "rodape": ln["rodape"], "descricao": "" if ln["modo"] else descricao(ln["nome"], descricoes)}
                for col, campo in COLUNAS.items():
                    d[campo] = ln["valores"].get(col, "")
                w.writerow(d)
                contador[livro] += not ln["modo"]
                sem_nota += [f"{livro} p.{ln['pagina']} {ln['nome']}: [{n}]" for n in ln["sem_nota"]]
            print(f"  {contador[livro]} armas")
    print(f"\nTotal: {sum(contador.values())} armas -> {arquivo}")
    if sem_nota:
        print("Notas citadas que não foram achadas (confira manualmente):")
        for x in sem_nota:
            print("  -", x)


if __name__ == "__main__":
    main()
