// Ways to support the project: Pix donations and reading lists with Amazon affiliate links.
// Kept apart from data.js so the engine catalog (and its fingerprint) never changes because of it.
// Fill SUPPORT with your own data. An empty pixKey hides the Pix page; an empty amazonTag keeps plain links.
(function(root){
const SUPPORT={
  pixKey:"95db9cec-d47b-4ac6-abe2-86492b59ec7b", // chave Pix: e-mail, celular (+55...), CPF/CNPJ ou chave aleatória
  pixName:"Tiago Cardoso Bezerra", // nome de quem recebe, até 25 letras, sem acento
  pixCity:"Brasil", // cidade de quem recebe, até 15 letras, sem acento
  amazonTag:"filosofometro-20", // ID de associado da Amazon, por exemplo "filosofometro-20"
  // Each Amazon store has its own Associates program and its own tag: the Brazilian tag earns nothing on amazon.com.
  // The English and Spanish versions link to amazon.com, so they need an Amazon Associates US tag.
  amazonTags:{en:"",es:""}, // tags de associado para as versões em inglês e espanhol, quando existirem
};

// Two more works per thinker. Together with the book in data.js (field b) every thinker has three.
const READING={
  "pitagoras":["Os Filósofos Pré-Socráticos (Kirk, Raven e Schofield)","Vida de Pitágoras (Porfírio)"],
  "parmenides":["Os Filósofos Pré-Socráticos (Kirk, Raven e Schofield)","Parmênides (Platão)"],
  "heraclito":["Os Filósofos Pré-Socráticos (Kirk, Raven e Schofield)","Os Pré-Socráticos (Os Pensadores)"],
  "democrito":["Os Filósofos Pré-Socráticos (Kirk, Raven e Schofield)","Os Pré-Socráticos (Os Pensadores)"],
  "protagoras":["Teeteto (Platão)","Os Sofistas (W. K. C. Guthrie)"],
  "socrates":["Fédon (Platão)","Memoráveis (Xenofonte)"],
  "platao":["O Banquete","Fédon"],
  "aristoteles":["Política","Metafísica"],
  "diogenes":["Os Cínicos (Goulet-Cazé e Branham)","A Coragem da Verdade (Michel Foucault)"],
  "aristipo":["As Sabedorias da Antiguidade (Michel Onfray)","A Arte de Ter Prazer (Michel Onfray)"],
  "pirro":["Contra os Retóricos (Sexto Empírico)","Vida Comum e Ceticismo (Oswaldo Porchat)"],
  "epicuro":["Máximas Principais","Da Natureza das Coisas (Lucrécio)"],
  "seneca":["Cartas a Lucílio","Sobre a Ira"],
  "epicteto":["Diatribes","A Arte de Viver (Sharon Lebell)"],
  "marco-aurelio":["O Obstáculo é o Caminho (Ryan Holiday)","Como Pensar como um Imperador Romano (Donald Robertson)"],
  "plotino":["Plotino ou a Simplicidade do Olhar (Pierre Hadot)","O que é a Filosofia Antiga? (Pierre Hadot)"],
  "santo-agostinho":["A Cidade de Deus","O Livre-Arbítrio"],
  "averrois":["Exposição sobre a Substância do Orbe","Averróis, a Arte de Governar (Rosalie Helena de Souza Pereira)"],
  "maimonides":["Maimônides (Abraham Joshua Heschel)","Mishné Torá"],
  "tomas-de-aquino":["Suma contra os Gentios","O Ente e a Essência"],
  "guilherme-de-ockham":["Lógica dos Termos","Brevilóquio sobre o Principado Tirânico"],
  "joao-calvino":["A Verdadeira Vida Cristã","Breve Instrução Cristã"],
  "maquiavel":["Discursos sobre a Primeira Década de Tito Lívio","A Arte da Guerra"],
  "montaigne":["Diário da Viagem à Itália","Como Viver: Uma Biografia de Montaigne (Sarah Bakewell)"],
  "descartes":["Meditações Metafísicas","As Paixões da Alma"],
  "pascal":["As Provinciais","Do Espírito Geométrico e da Arte de Persuadir"],
  "spinoza":["Tratado Teológico-Político","Tratado da Reforma da Inteligência"],
  "leibniz":["Discurso de Metafísica","Ensaios de Teodiceia"],
  "thomas-hobbes":["Do Cidadão","Behemoth"],
  "john-locke":["Ensaio sobre o Entendimento Humano","Carta sobre a Tolerância"],
  "george-berkeley":["Três Diálogos entre Hylas e Philonous","Ensaio para uma Nova Teoria da Visão"],
  "david-hume":["Tratado da Natureza Humana","Diálogos sobre a Religião Natural"],
  "voltaire":["Tratado sobre a Tolerância","Dicionário Filosófico"],
  "rousseau":["Emílio, ou Da Educação","Discurso sobre a Origem da Desigualdade"],
  "adam-smith":["Teoria dos Sentimentos Morais","A Mão Invisível"],
  "edmund-burke":["Uma Investigação Filosófica sobre a Origem de Nossas Ideias do Sublime e do Belo","O Grande Debate (Yuval Levin)"],
  "joseph-de-maistre":["Limites da Utopia (Isaiah Berlin)","As Raízes do Romantismo (Isaiah Berlin)"],
  "kant":["Crítica da Razão Pura","À Paz Perpétua"],
  "mary-wollstonecraft":["A Vindication of the Rights of Men (em inglês)","Letters Written in Sweden, Norway, and Denmark (em inglês)"],
  "jeremy-bentham":["O Panóptico","Um Fragmento sobre o Governo"],
  "hegel":["Princípios da Filosofia do Direito","Fenomenologia do Espírito"],
  "schopenhauer":["O Mundo como Vontade e Representação","A Arte de Ter Razão"],
  "auguste-comte":["Curso de Filosofia Positiva","Catecismo Positivista"],
  "john-stuart-mill":["Utilitarismo","A Sujeição das Mulheres"],
  "henry-david-thoreau":["A Desobediência Civil","Caminhando"],
  "kierkegaard":["O Conceito de Angústia","Ou-Ou: Um Fragmento de Vida"],
  "max-stirner":["O Falso Princípio da Nossa Educação","A Ideologia Alemã (Marx e Engels)"],
  "proudhon":["Filosofia da Miséria","Do Princípio Federativo"],
  "mikhail-bakunin":["Estatismo e Anarquia","O Princípio do Estado"],
  "karl-marx":["O Capital","Manuscritos Econômico-Filosóficos"],
  "nietzsche":["Além do Bem e do Mal","Genealogia da Moral"],
  "william-james":["As Variedades da Experiência Religiosa","A Vontade de Crer"],
  "g-k-chesterton":["O Homem Eterno","Hereges"],
  "edmund-husserl":["A Crise das Ciências Europeias e a Fenomenologia Transcendental","Investigações Lógicas"],
  "bertrand-russell":["História da Filosofia Ocidental","Por que Não Sou Cristão"],
  "wittgenstein":["Investigações Filosóficas","Da Certeza"],
  "antonio-gramsci":["Cartas do Cárcere","Os Intelectuais e a Organização da Cultura"],
  "heidegger":["Introdução à Metafísica","A Questão da Técnica"],
  "jean-paul-sartre":["O Ser e o Nada","A Náusea"],
  "simone-de-beauvoir":["Por uma Moral da Ambiguidade","Memórias de uma Moça Bem-Comportada"],
  "albert-camus":["O Estrangeiro","O Homem Revoltado"],
  "simone-weil":["O Enraizamento","A Condição Operária"],
  "hannah-arendt":["A Condição Humana","Origens do Totalitarismo"],
  "theodor-adorno":["Dialética do Esclarecimento (com Max Horkheimer)","Educação e Emancipação"],
  "karl-popper":["A Lógica da Pesquisa Científica","Conjecturas e Refutações"],
  "friedrich-hayek":["Os Fundamentos da Liberdade","A Arrogância Fatal"],
  "ayn-rand":["A Revolta de Atlas","A Nascente"],
  "hans-georg-gadamer":["O Problema da Consciência Histórica","Elogio da Teoria"],
  "claude-levi-strauss":["O Pensamento Selvagem","Antropologia Estrutural"],
  "frantz-fanon":["Pele Negra, Máscaras Brancas","Por uma Revolução Africana"],
  "michel-foucault":["História da Loucura","História da Sexualidade 1: A Vontade de Saber"],
  "jacques-derrida":["A Escritura e a Diferença","Espectros de Marx"],
  "gilles-deleuze":["O Anti-Édipo (com Félix Guattari)","Mil Platôs"],
  "john-rawls":["O Liberalismo Político","Justiça como Equidade: Uma Reformulação"],
  "robert-nozick":["A Vida Examinada","The Nature of Rationality (em inglês)"],
  "murray-rothbard":["Anatomia do Estado","Por uma Nova Liberdade"],
  "roger-scruton":["Tolos, Fraudes e Militantes","Beleza"],
  "michel-onfray":["Tratado de Ateologia","A Escultura de Si"],
  "alasdair-macintyre":["Justiça de Quem? Qual Racionalidade?","Dependent Rational Animals (em inglês)"],
  "jurgen-habermas":["Teoria do Agir Comunicativo","Conhecimento e Interesse"],
  "arne-naess":["The Ecology of Wisdom (em inglês)","A Teia da Vida (Fritjof Capra)"],
  "paulo-freire":["Pedagogia da Autonomia","Pedagogia da Esperança"],
  "mario-ferreira-dos-santos":["Invasão Vertical dos Bárbaros","Filosofia e Cosmovisão"],
  "marilena-chaui":["O que é Ideologia","Cultura e Democracia"],
  "peter-singer":["Libertação Animal","Quanto Custa Salvar uma Vida?"],
  "judith-butler":["Corpos que Importam","Quadros de Guerra"],
  "slavoj-zizek":["Bem-Vindo ao Deserto do Real!","Vivendo no Fim dos Tempos"],
  "byung-chul-han":["Sociedade da Transparência","No Enxame"],
  "buda":["Sutta Nipata","O que o Buda Ensinou (Walpola Rahula)"],
  "dogen":["How to Cook Your Life (em inglês)","Mente Zen, Mente de Principiante (Shunryu Suzuki)"],
  "confucio":["O Grande Aprendizado","A Doutrina do Meio"],
  "lao-tse":["Zhuangzi","Liezi"],
  "shankara":["Vivekachudamani: A Joia Suprema do Discernimento","Brahma Sutra Bhashya (em inglês)"],
  "lucrecio":["A Virada: o Nascimento do Mundo Moderno (Stephen Greenblatt)","Carta sobre a Felicidade (Epicuro)"],
  "yang-zhu":["Mêncio","Zhuangzi"],
  "la-mettrie":["Discurso sobre a Felicidade","O Homem-Planta"],
  "charles-fourier":["O Novo Mundo Amoroso","Do Socialismo Utópico ao Socialismo Científico (Engels)"],
  "oscar-wilde":["O Retrato de Dorian Gray","Intenções"],
  "herbert-marcuse":["O Homem Unidimensional","Razão e Revolução"],
  "michael-oakeshott":["Sobre a História e Outros Ensaios","A Política da Fé e a Política do Ceticismo"],
  "russell-kirk":["A Política da Prudência","Edmund Burke: Redescobrindo um Gênio"],
  "henry-sidgwick":["Outlines of the History of Ethics (em inglês)","The Elements of Politics (em inglês)"],
  "william-godwin":["Caleb Williams","The Enquirer (em inglês)"],
  "gottlob-frege":["Lógica e Filosofia da Linguagem","Investigações Lógicas"],
  "oswaldo-porchat":["Vida Comum e Ceticismo","Ciência e Dialética em Aristóteles"],
  "ailton-krenak":["A Vida Não é Útil","Futuro Ancestral"],
  "lelia-gonzalez":["Primavera para as Rosas Negras","Lugar de Negro (com Carlos Hasenbalg)"],
  "vilem-flusser":["O Mundo Codificado","Língua e Realidade"],
  "monja-coen":["Nem Anjos Nem Demônios","Aprenda a Viver o Agora"],
  "leonardo-boff":["Saber Cuidar","A Águia e a Galinha"],
  "antonio-vieira":["História do Futuro","Cartas"],
  "tobias-barreto":["Estudos de Direito","Menores e Loucos"],
  "farias-brito":["A Base Física do Espírito","Finalidade do Mundo"],
  "miguel-reale":["Lições Preliminares de Direito","Filosofia do Direito"],
  "gilberto-freyre":["Sobrados e Mucambos","Ordem e Progresso"],
  "viveiros-de-castro":["Metafísicas Canibais","Há Mundo por Vir? (com Déborah Danowski)"],
  "oswald-de-andrade":["Manifesto Antropófago e Outros Textos","Serafim Ponte Grande"],
  "carlos-nelson-coutinho":["Gramsci: Um Estudo sobre Seu Pensamento Político","Cultura e Sociedade no Brasil"],
  "roberto-schwarz":["Um Mestre na Periferia do Capitalismo","Que Horas São?"],
  "jose-guilherme-merquior":["O Argumento Liberal","Rousseau e Weber"],
  "newton-da-costa":["Sistemas Formais Inconsistentes","Lógica Indutiva e Probabilidade"],
  "anisio-teixeira":["Pequena Introdução à Filosofia da Educação","Educação para a Democracia"],
  "benedito-nunes":["O Dorso do Tigre","Introdução à Filosofia da Arte"],
  "lima-vaz":["Escritos de Filosofia I: Problemas de Fronteira","Escritos de Filosofia II: Ética e Cultura"],
  "gustavo-corcao":["Lições de Abismo","O Desconcerto do Mundo"],
  "abdias-do-nascimento":["O Genocídio do Negro Brasileiro","Sortilégio"],
  "nise-da-silveira":["O Mundo das Imagens","Cartas a Spinoza"],
  "jose-oiticica":["Ação Direta","Sonetos"],
};

// Amazon search link for a title. Parenthesis notes like "(Platão)" become part of the search,
// and the thinker's name is added when the title does not name another author.
function bookURL(title,author){
  const q=/\(/.test(title)?title.replace(/[()]/g,""):`${title} ${author}`;
  const tag=SUPPORT.amazonTag?`&tag=${encodeURIComponent(SUPPORT.amazonTag)}`:"";
  return `https://www.amazon.com.br/s?k=${encodeURIComponent(q)}&i=stripbooks${tag}`;
}

// Pix "copia e cola" code (BR Code, EMV format) for a static key without a fixed amount.
function pixPayload({pixKey,pixName,pixCity}=SUPPORT){
  const clean=(s,n)=>s.normalize("NFD").replace(/[^A-Za-z0-9 ]/g,"").toUpperCase().slice(0,n);
  const f=(id,v)=>id+String(v.length).padStart(2,"0")+v;
  const body=f("00","01")+f("26",f("00","br.gov.bcb.pix")+f("01",pixKey.trim()))+f("52","0000")+f("53","986")+f("58","BR")+
    f("59",clean(pixName,25))+f("60",clean(pixCity,15))+f("62",f("05","***"))+"6304";
  let crc=0xFFFF;
  for(const ch of body){crc^=ch.charCodeAt(0)<<8;for(let i=0;i<8;i++)crc=crc&0x8000?((crc<<1)^0x1021)&0xFFFF:(crc<<1)&0xFFFF}
  return body+crc.toString(16).toUpperCase().padStart(4,"0");
}

const API={SUPPORT,READING,bookURL,pixPayload};
if(typeof module!=="undefined")module.exports=API;else root.AgoraSupport=API;
})(this);
