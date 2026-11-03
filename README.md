# Filosofômetro: qual filósofo pensa como você?

Teste filosófico com 44 afirmações, 11 eixos e 93 pensadores, mais 27 pensadores brasileiros num ranking próprio. Mostra o seu par, os mais parecidos, o seu oposto, quem pensa como você no Brasil, uma linha do tempo e a comparação com amigos pelo link. Site estático, sem build e sem backend.

**No ar:** https://filosofometro.vercel.app · **Criado por** [Tiago Cardoso Bezerra](https://github.com/tiagocardosobezerra)

## Arquivos

| Arquivo | Papel |
|---|---|
| `index.html` | Casca da página, metadados e fontes |
| `styles.css` | Design (tema claro e escuro, mobile, movimento reduzido) |
| `data.js` | Catálogo: eixos, afirmações e posições dos pensadores. Só dados |
| `engine.js` | Motor de cálculo. Funções puras, sem DOM, com trilha de auditoria |
| `verify.js` | Segunda implementação do método, sem código em comum com o motor. Usada pela página `#/verificar` e pelos testes |
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

Rode sempre que mudar `data.js` ou `engine.js`. A bateria confere o cálculo contra uma implementação independente, a consistência da trilha de auditoria, se cada pensador é alcançável, a estabilidade, a distribuição dos resultados e os links.

### Auditoria de alcance

```bash
node tests/reachability.js
```

Prova que cada pensador, e portanto cada corrente, pode ser o resultado de um conjunto real de respostas. Faz isso de três formas: pelo perfil exato do pensador, por uma busca que parte de respostas aleatórias e muda uma resposta por vez, e por simulação com 60 mil pessoas espalhadas por todas as posições. Gera `tests/reachability-report.md` com a tabela por pensador.

## Como o motor calcula

1. Cada resposta vale de +2 a −2 e é multiplicada pela direção da afirmação. A posição em cada eixo é a soma das 4 contribuições dividida por 8.
2. O perfil é multiplicado por `fator = mín(3, intensidade do catálogo ÷ sua intensidade)`. O mesmo vale para cada pensador. Assim o teste compara o formato do pensamento, não a força. Abaixo de intensidade 0,05 o perfil não tem direção: não há percentual nem oposto.
3. Distância é a média das diferenças absolutas nos 11 eixos. Compatibilidade é `max(1, min(100, round(100 × e^(−(d ÷ 0,77)²))))`.
4. O ranking ordena por distância (empate se a diferença ≤ 1e-9), depois pela distância bruta, depois pelo id do pensador.

A página `#/metodo` explica tudo para o usuário. Cada resultado tem uma auditoria completa e o download em JSON (formato `filosofometro-audit/2`), com todos os números em precisão completa. Esse arquivo basta, sozinho, para refazer o ranking inteiro.

Duas impressões digitais aparecem em cada auditoria. A do **catálogo** é FNV-1a do objeto `fingerprintInput` (eixos, afirmações, ids, nomes e posições), que vai junto no catálogo para download. A do **código** cobre o motor inteiro, com as quebras de linha normalizadas.

## Publicar na Vercel

É um site estático: importe a pasta na Vercel sem framework e sem comando de build.

## Retratos

Os retratos vêm da Wikimedia Commons, linkados direto do servidor da Wikimedia (`img` em `data.js`), com crédito e link para a página da Wikipédia (`wiki`). As licenças variam por imagem: retratos antigos são de domínio público, e fotos de pessoas contemporâneas costumam ser CC BY ou CC BY-SA. Antes de um uso comercial, confira a licença de cada arquivo na página dele na Commons.

## Limites conhecidos

- O card de prévia ao colar o link (Open Graph) é o mesmo para todos. Uma imagem por resultado exige uma função no servidor.
- As posições dos pensadores passaram por uma revisão, mas continuam sendo leituras resumidas e discutíveis.
