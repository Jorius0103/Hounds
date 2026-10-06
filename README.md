# Hounds — Hub da campanha GURPS

Exportação completa do projeto: o código do hub e uma cópia dos dados da campanha.

## Pastas

| Caminho | O que é |
|---|---|
| `index.html` | O hub completo num arquivo só (menu, Informações, Anotações, Usuários e a Mesa de Combate embutida). |
| `src/mesa.html` | A Mesa de Combate (Dash RPG) compilada, separada, para consulta. |
| `dados/` | Cópia dos dados salvos no site, em JSON. |
| `imagens/` | As imagens enviadas (mapas, locais, personagens). O nome do arquivo é o `ref` usado nos dados. |

### Arquivos em `dados/`

- `maps.json`: mapas, com hierarquia (`parentId`), imagem (`image.ref`) e visibilidade (`visible`).
- `locations.json`: locais.
- `characters.json`: personagens de Informações.
- `notebooks.json` e `notes.json`: títulos e anotações.
- `users.json`: usuários e perfis (mestre, jogador, visualizador = Espectador).
- `mesa-de-combate.json`: estado completo da Mesa (combates, NPCs, personagens salvos, condições, rounds e log).

Cada arquivo é um objeto `{ id: documento }`.

## Onde roda

O hub foi feito para ser publicado como artifact do claude.ai, onde usa o banco de dados e o armazenamento de imagens compartilhados da plataforma.

Abrindo `index.html` direto no navegador ou numa hospedagem comum, a página funciona, mas os dados ficam só no navegador de quem usa e começam vazios. Os arquivos de `dados/` não são carregados automaticamente.

## Funcionalidades

- **Usuários:** escolha de usuário ao abrir, com perfis Mestre (administrador de tudo), Jogador e Espectador. Só o Mestre gerencia os usuários.
- **Visibilidade:** cada item tem a opção "Visível para todos". Desmarcado, só o Mestre vê.
- **Informações:** mapas em hierarquia com marcadores, localizações e personagens.
- **Anotações:** títulos com vários arquivos de anotação.
- **Mesa de Combate:**
  - Escolha ou criação de jogo ao entrar.
  - Personagens salvos e reutilizáveis entre jogos.
  - Botões de copiar e remover que agem no combate atual.
  - Botões "Finalizar Ação" e "Finalizar Round".
  - Log de Combate com manobra, PV, FP e condições, navegação por rounds e exclusão de round.
  - Botão de sair, que salva e volta à escolha de jogo.

## Segurança

Não há senha: quem tem acesso escolhe qualquer usuário. "Só o Mestre" esconde itens da tela, mas eles ainda são enviados ao navegador. Não guarde nada sigiloso.
