# ID Performance - Automação de Marketing

Frontend da plataforma de automação de marketing para a agência ID Performance. Desenvolvido com Next.js 14, Tailwind CSS, shadcn/ui e Supabase.

## Pré-requisitos
- Node.js 18+ ou superior
- Conta no Supabase (para banco de dados)

## Configuração do Projeto

1. Instale as dependências:
\`\`\`bash
npm install
\`\`\`

2. Configure as variáveis de ambiente:
Crie um arquivo \`.env.local\` na raiz do projeto copiando o conteúdo de \`.env.example\` e preenchendo as chaves do seu Supabase.
\`\`\`bash
cp .env.example .env.local
\`\`\`

3. Configuração do Supabase:
Acesse o SQL Editor do Supabase e rode o script contido em \`supabase-schema.sql\` para criar as tabelas necessárias para o projeto.
*Nota: A tabela \`leads\` e \`scraper_state\` já devem existir. As novas tabelas adicionadas são para os módulos criativos, reuniões, briefings e campanhas.*

4. Execute o projeto em desenvolvimento:
\`\`\`bash
npm run dev
\`\`\`

5. Acesse http://localhost:3000 no seu navegador. O sistema redirecionará automaticamente para o Dashboard.

## Tecnologias e Bibliotecas
- **Next.js 14 (App Router)** - Framework React
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes base acessíveis
- **Lucide React** - Ícones
- **Recharts** - Gráficos
- **Supabase JS** - Autenticação e Banco de Dados (PostgreSQL)

## Módulos do Sistema
- **/dashboard**: Métricas e visões gerais.
- **/leads**: Visualização da base do Scraper, com aprovação e integração ao webhook n8n para disparos.
- **/criativos**: Galeria de imagens/vídeos com insights.
- **/briefing**: Gerador de pré-briefing baseado em formulário.
- **/campanhas**: Monitor de performance do Meta/Google Ads.
- **/reunioes**: Análise de transcrições de áudio.

## Integrações Webhook (Mock)
Atualmente as integrações com n8n, Claude e Evolution API são simuladas (mock). Para conectar, edite as URLs no arquivo \`.env.local\` e utilize os hooks localizados em \`/app/api/\`.
