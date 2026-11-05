# Medição na prática

Aplicativo de pesquisa acadêmica com login Google, formulário em etapas, QR code e painel de análise. Preparado para rodar no A.R.S.E.N.A.L em uma rota como `https://arsenal.dev.br/medicao/`.

**Publicado:** [arsenal.dev.br/medicao](https://arsenal.dev.br/medicao/). Cadastrado no A.R.S.E.N.A.L com inicialização automática, porta 3015 e prefixo removido. Página, recursos e QR code verificados no endereço público; o painel de resultados exige autenticação. O botão Google reconheceu a conta no domínio público, mas a autenticação completa depende da confirmação do participante no Google.

O cadastro preservou os 21 apps anteriores e gerou um backup da configuração do A.R.S.E.N.A.L. `scripts/register-arsenal.cjs` é um auxiliar específico desta máquina, com simulação por padrão; `--apply` exige que o A.R.S.E.N.A.L esteja encerrado. Não é necessário executá-lo em uma instalação já cadastrada.

## Rodar na máquina

Requer **Node.js 24 ou superior**. O SQLite é integrado ao Node; não é necessário instalar outro banco. Nesta versão do Node, o módulo pode emitir um aviso de recurso experimental.

```powershell
npm install
Copy-Item .env.example .env
# Preencha as configurações do .env antes de iniciar.
npm start
```

Abra `http://localhost:3015/`. Não há etapa de build. Para reiniciar automaticamente ao editar o servidor, use `npm run dev`; recarregue o navegador após editar a interface.

O `.env` local já preparado nesta máquina usa o **Client ID público** encontrado no ControlPlus de referência e os cinco e-mails de administradores informados pelo usuário. Nenhuma chave privada, Client Secret, conexão de banco ou JWT do outro sistema foi copiada. O `.env` não é versionado. Para outra instalação, copie o exemplo e configure seus próprios valores.

## Login Google

Use um Client ID OAuth de **Aplicativo Web** em `GOOGLE_CLIENT_ID`. O navegador usa Google Identity Services e o servidor verifica assinatura, público, validade, e-mail verificado e nonce de uso único. A identidade é vinculada pelo `sub` Google, não por um e-mail informado no formulário.

No Google Cloud, autorize as origens necessárias:

- `http://localhost:3015` para testes locais.
- `https://arsenal.dev.br` para publicação no A.R.S.E.N.A.L.

Origens não incluem caminho. Não é necessário Client Secret ou URI de redirecionamento neste fluxo por popup. Se o projeto OAuth estiver em teste, inclua os participantes como usuários de teste ou ajuste a publicação do projeto Google. A origem local **não estava autorizada** no Client ID de referência durante a verificação; é necessário adicioná-la para testar o login real localmente.

`PUBLIC_URL` deve conter a URL completa pela qual os participantes acessam o app. Ela define o QR code, os cookies e a verificação da origem; não é inferida de cabeçalhos enviados pelo visitante.

## Publicar no A.R.S.E.N.A.L

Cadastre o projeto no painel existente:

| Campo | Valor |
| --- | --- |
| Nome | Medição na prática |
| Rota | medicao |
| Pasta | Pasta deste repositório |
| Comando | `npm start` |
| Porta | `3015` (ou outra porta disponível) |
| Prefixo | Remover `/medicao` |

Nas variáveis de ambiente do projeto, configure:

```dotenv
PUBLIC_URL=https://arsenal.dev.br/medicao
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
ADMIN_EMAILS=email1@gmail.com,email2@gmail.com
NODE_ENV=production
```

O A.R.S.E.N.A.L injeta `PORT`, `ARSENAL_ROUTE` e `ARSENAL_PROXY_TOKEN`. O servidor usa a porta fornecida e valida o cabeçalho do gateway quando esse token existe. Os recursos e a API funcionam com prefixo removido ou mantido, desde que `PUBLIC_URL` corresponda à rota. Não abra outro processo na mesma porta. Reinicie o app no painel após alterar variáveis ou arquivos do servidor.

A publicação não é feita automaticamente por `npm start`. O cadastro no painel e a configuração de origens no Google são passos da instalação. O computador, A.R.S.E.N.A.L e túnel precisam permanecer ligados para receber respostas.

## Fluxo e acesso

- Qualquer conta Google verificada pode responder; a lista `ADMIN_EMAILS` restringe somente o painel e a exportação.
- Um participante preenche nome e empresa, responde às etapas, revisa e confirma o envio.
- Cada conta pode enviar uma resposta. Reentrar mostra o comprovante já registrado.
- O rascunho fica no `sessionStorage` desta aba, separado por conta e versão. É removido ao sair ou concluir.
- A sessão dura oito horas e usa cookie HttpOnly, SameSite e Secure em HTTPS. As alterações verificam origem e token CSRF. Sair revoga a sessão no servidor.
- Administradores acessam **Resultados** após entrar. Podem buscar participantes, consultar respostas individuais e exportar CSV, com proteção contra fórmulas em células.

Os cinco administradores autorizados nesta instalação são `leandro130333@gmail.com`, `leandro130333.dev@gmail.com`, `vinisv2004@gmail.com`, `mariaclariagomes@gmail.com` e `isabellamg2017@gmail.com`. Para mudar o acesso, edite `ADMIN_EMAILS` e reinicie o app.

## Questionário inicial

As mensagens da conversa compartilhada não puderam ser recuperadas. Portanto, **as perguntas são uma proposta inicial**, não uma transcrição ou instrumento validado. Revise `config/questionnaire.json` antes da coleta oficial. O formulário informa esse status ao participante.

O arquivo define título, seções, perguntas, opções, obrigatoriedade, limites e versão. Tipos suportados: `text`, `textarea`, `select`, `multiselect` e `number`. Nome e empresa fazem parte da identificação fixa.

Depois de começar a coleta, preserve os IDs e o significado das opções. Para alterações de conteúdo, incremente `version` e reinicie o servidor. Cada resposta registra sua versão; IDs históricos removidos continuam no CSV. O painel usa os rótulos atuais, então alterações substanciais de significado exigem outra pesquisa/banco para não misturar instrumentos.

Antes da coleta oficial, a equipe também deve completar as informações de finalidade específica, contato e prazo de retenção exibidas no texto de privacidade em `public/index.html`. As respostas são **identificadas**, acessíveis aos administradores, e não anônimas.

## Gráficos e grafo

- **Termômetro:** percentual de uso estruturado ou pontual entre quem soube informar se utiliza indicadores. Mostra numerador e denominador.
- **Mapa de calor:** contagens por setor e uso. Não representa notas de desempenho; há uma tabela acessível com as contagens.
- **Violino e densidade:** variáveis numéricas opcionais de quantidade de indicadores e minutos semanais. A variável pode ser trocada em cada gráfico. Exibem amostra, mediana, quartis e valores observados.
- As distribuições usam KDE gaussiana, largura de Silverman robusta e reflexão no limite zero. Exigem ao menos cinco valores com variação. A suavização pode se estender além do maior valor observado; isso não cria novas observações. Campos vazios são excluídos e zero é preservado.
- **Grafo interativo:** rede bipartida setor–ferramenta. Conexões contam participantes, excluindo a opção “Nenhuma”. É possível arrastar nós, destacar vizinhos, mover com setas, aproximar/afastar e filtrar pela contagem mínima. Há uma tabela alternativa. Não exibe nomes individuais.
- Os quatro gráficos podem ser baixados em SVG. Os dados podem ser exportados em CSV. A busca de participantes afeta a tabela; os gráficos representam todas as respostas recebidas.

As análises são descritivas da amostra de conveniência. Não oferecem inferência populacional, testes de hipótese ou causalidade.

## Dados e backup

O banco fica em `data/medicao.sqlite`, fora do Git. Caminho alternativo: `DATA_DIR`. Não publique a pasta de dados. Para backup consistente, pare o app e copie a pasta `data` inteira; em seguida, reinicie. Preserve os backups em local de acesso restrito. Sessões e desafios expirados são limpos no acesso à API; respostas permanecem até uma ação administrativa fora do app.

## Verificação

```powershell
npm run check
npm test
```

Os testes verificam autenticação, nonce, origem, CSRF, separação de participantes, permissões, duplicidade, persistência, prefixos do gateway, geração do QR, validação de campos, CSV, densidade e agregação do grafo.

Para QA visual sem conta Google, rode **separadamente**:

```powershell
node tests/preview.js
```

Abra `http://localhost:3016/__fixture__/login`. Este processo usa banco apenas em memória, dados explicitamente fictícios e uma sessão de teste. Não utiliza o banco real, não é iniciado por `npm start` e **não deve ser cadastrado no A.R.S.E.N.A.L**. A aplicação normal não possui entrada de demonstração ou login alternativo.
