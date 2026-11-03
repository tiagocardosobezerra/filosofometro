# Filosofômetro: qual filósofo pensa como você?

Teste filosófico em três níveis (44, 88 ou 132 afirmações), 11 eixos e 104 pensadores, mais 27 pensadores brasileiros num ranking próprio. Mostra o seu par, os mais parecidos, o seu oposto, quem pensa como você no Brasil, uma linha do tempo e a comparação com amigos pelo link. Site estático, sem build e sem backend.

**No ar:** https://filosofometro.vercel.app · **Criado por** [Tiago Cardoso Bezerra](https://github.com/tiagocardosobezerra)

## Arquivos

| Arquivo | Papel |
|---|---|
| `index.html` | Casca da página, metadados e fontes |
| `styles.css` | Design (tema claro e escuro, mobile, movimento reduzido) |
| `data.js` | Catálogo: eixos, afirmações e posições dos pensadores. Só dados |
| `engine.js` | Motor de cálculo. Funções puras, sem DOM, com trilha de auditoria |
| `verify.js` | Segunda implementação do método, sem código em comum com o motor. Usada pela página `#/verificar` e pelos testes |
| `support.js` | Apoio: chave Pix, ID de associado da Amazon e mais dois livros por pensador. Fora do catálogo, não muda a impressão digital |
| `vendor/qrcode.js` | Gerador de QR Code (Kazuhiko Arase, MIT), carregado só na página de apoio |
| `app.js` | Interface e rotas. Não calcula nada: só mostra o que o motor devolve |
| `tests/engine-test.js` | Bateria de testes do motor e do catálogo |

## Rodar localmente

```bash
npx serve@14.2.4 -l 5173 .
```

## Testes

```bash
node tests/engine-test.js
```

Rode sempre que mudar `data.js` ou `engine.js`. A bateria confere a ausência de viés (espelho, épocas, polos, níveis), o cálculo contra uma implementação independente, a consistência da trilha de auditoria, se cada pensador é alcançável, a estabilidade, a distribuição dos resultados e os links.

### Auditoria de alcance

```bash
node tests/reachability.js
```

Prova que cada pensador, e portanto cada corrente, pode ser o resultado de um conjunto real de respostas, no ranking principal e no brasileiro. Faz isso de três formas: pelo perfil exato do pensador, por uma busca que parte de respostas aleatórias e muda uma resposta por vez, e por simulação com 60 mil pessoas espalhadas por todas as posições. Gera `tests/reachability-report.md` com a tabela por pensador.

## Como o motor calcula

1. Cada resposta vale de +2 a −2 e é multiplicada pela direção da afirmação. A posição em cada eixo é a soma das 4 contribuições dividida por 8.
2. O perfil é multiplicado por `fator = mín(3, intensidade do catálogo ÷ sua intensidade)`. O mesmo vale para cada pensador. Assim o teste compara o formato do pensamento, não a força. Abaixo de intensidade 0,05 o perfil não tem direção: não há percentual nem oposto.
3. Distância é a média das diferenças absolutas nos 11 eixos. Compatibilidade é `max(1, min(100, round(100 × e^(−(d ÷ 0,77)²))))`.
4. O ranking ordena por distância (empate se a diferença ≤ 1e-9), depois pela distância bruta, depois pelo id do pensador.

A página `#/metodo` explica tudo para o usuário. Cada resultado tem uma auditoria completa e o download em JSON (formato `filosofometro-audit/2`), com todos os números em precisão completa. Esse arquivo basta, sozinho, para refazer o ranking inteiro.

Duas impressões digitais aparecem em cada auditoria. A do **catálogo** é FNV-1a do objeto `fingerprintInput` (eixos, afirmações, ids, nomes e posições), que vai junto no catálogo para download. A do **código** cobre o motor inteiro, com as quebras de linha normalizadas.

## Prévias de link

O app roteia pelo hash (`#/vs/...`), que nunca chega ao servidor. Por isso os links compartilhados usam `/s/<código>[/<nome>]` e `/c/<a>/<b>[/<nomeA>/<nomeB>]`. A Vercel reescreve esses caminhos para `api/share.js`, que devolve uma página com título, descrição e imagem do resultado (Open Graph) e manda a pessoa direto para o app. A imagem de 1200 × 630 sai de `api/og.js`: um SVG desenhado com o mesmo motor e as mesmas cores do site, rasterizado com `@resvg/resvg-js` e as fontes de `fonts/` (Instrument Serif e Inter Tight, licença OFL). `og.png` é a prévia do site sem resultado; para gerar de novo, rode `node tests/make-og.js`.

## App instalável

`manifest.webmanifest` e `sw.js` tornam o site instalável ("Instalar o app" no rodapé, ou Adicionar à Tela de Início no iPhone) e utilizável offline depois da primeira visita. O service worker busca os arquivos do site sempre na rede primeiro, então uma nova versão aparece assim que publicada; retratos e fontes ficam em cache. Ele só é registrado no site publicado, nunca em `localhost`. Os ícones de `icons/` saem de `node tests/make-icons.js`.

## Apoio

Preencha `SUPPORT` no topo de `support.js`:

- `pixKey`, `pixName` e `pixCity` ativam a página `#/apoie` (QR Code e Pix copia e cola, montados no próprio navegador) e o link "Apoie o projeto" no rodapé. Com `pixKey` vazio, nada disso aparece.
- `amazonTag` é o ID de associado da Amazon. Cada pensador mostra três livros, e cada um leva a uma busca na Amazon Brasil com esse ID. Com o ID preenchido, aparece o aviso de associado exigido pela Amazon.

## Páginas dos pensadores (SEO)

O app vive depois do `#`, que os buscadores quase não indexam. `node tests/make-pages.js` gera uma página estática por pensador em `pensadores/<id>/` (biografia, ideias, posição nos 11 eixos, três livros, pensadores parecidos e o convite para o teste), o índice `pensadores/`, `sitemap.xml` e `robots.txt`. Cada página tem endereço canônico em `https://filosofometro.com.br` e dados estruturados (schema.org). Rode de novo sempre que `data.js`, `support.js` ou `covers.js` mudarem.

## Capas dos livros

`node tests/make-covers.js` procura na Open Library a capa de cada livro indicado e grava os ids em `covers.js` (relatório para revisão em `tests/covers-report.md`; correções manuais em `OVERRIDE`). `node tests/fetch-covers.js` baixa as capas para `covers/`, e o site as serve direto. Livro sem capa mostra a lombada colorida.

## Medição

Vercel Web Analytics, sem cookies (ative em Analytics no painel do projeto). As rotas do app e os passos do funil chegam como páginas legíveis: `/teste`, `/evento/teste-concluido`, `/resultado`, `/evento/story`, `/evento/convite`, `/evento/livro`, `/evento/pix-copiado`, `/evento/app-instalado`. O código das respostas nunca sai do navegador.

## Publicar na Vercel

É um site estático com duas funções em `api/`: importe a pasta na Vercel sem framework e sem comando de build. `vercel.json` define as reescritas de `/s/` e `/c/`.

## Retratos

Os retratos vêm da Wikimedia Commons, linkados direto do servidor da Wikimedia (`img` em `data.js`), com crédito e link para a página da Wikipédia (`wiki`). As licenças variam por imagem: retratos antigos são de domínio público, e fotos de pessoas contemporâneas costumam ser CC BY ou CC BY-SA. Antes de um uso comercial, confira a licença de cada arquivo na página dele na Commons.

Quem não tem foto de licença livre na Commons (Yang Zhu, Oswaldo Porchat, Carlos Nelson Coutinho, Roberto Schwarz e Benedito Nunes) fica com `img: ""` e ganha um retrato desenhado pelo próprio perfil: a mandala dos 11 eixos atrás das iniciais. O mesmo desenho aparece se uma imagem falhar ao carregar.

## Limites conhecidos

- As posições dos pensadores passaram por uma revisão, mas continuam sendo leituras resumidas e discutíveis.
