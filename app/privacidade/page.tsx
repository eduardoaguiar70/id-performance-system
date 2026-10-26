import type { Metadata } from "next";
import { LEGAL, LegalLayout, Lista, Secao } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Política de Privacidade | ID Performance",
  description: "Como a ID Performance Plataforma coleta, usa e protege dados, incluindo dados recebidos de APIs do Google.",
};

export default function PoliticaDePrivacidade() {
  return (
    <LegalLayout titulo="Política de Privacidade">
      <Secao titulo="1. Quem somos">
        <p>
          A {LEGAL.produto} (&ldquo;Plataforma&rdquo;) é um sistema de acompanhamento de desempenho de marketing
          operado pela {LEGAL.empresa} (&ldquo;nós&rdquo;). Ela reúne, em painéis e relatórios, métricas de
          campanhas e vendas das contas de anúncios e lojas de nossos clientes. Esta política explica quais dados
          tratamos, para quê, e como você controla o acesso a eles.
        </p>
      </Secao>

      <Secao titulo="2. Dados que tratamos">
        <p>
          <strong className="text-foreground">Usuários da Plataforma.</strong> E-mail e dados de autenticação das
          pessoas da agência autorizadas a entrar no sistema.
        </p>
        <p>
          <strong className="text-foreground">Dados de integrações.</strong> Quando uma conta é conectada, você
          autoriza a leitura dos dados descritos abaixo. Sempre pedimos acesso somente para leitura.
        </p>
        <Lista
          itens={[
            <>
              <strong className="text-foreground">Google Ads</strong> (escopo{" "}
              <code className="font-mono text-xs">adwords</code>): identificação e nome das contas de anúncios
              acessíveis ao login conectado e métricas de campanhas, como investimento, impressões, cliques,
              conversões e receita atribuída.
            </>,
            <>
              <strong className="text-foreground">Google Analytics 4</strong> (escopo{" "}
              <code className="font-mono text-xs">analytics.readonly</code>): propriedades acessíveis ao login
              conectado e métricas como sessões, origens de tráfego, funil de compra, pedidos e receita.
            </>,
            <>
              <strong className="text-foreground">Identificação do login Google</strong> (escopos{" "}
              <code className="font-mono text-xs">openid</code> e <code className="font-mono text-xs">email</code>
              ): usada apenas para saber qual conta Google foi conectada.
            </>,
            <>
              <strong className="text-foreground">Shopify</strong>: pedidos, produtos, clientes e estoque da loja
              instalada, em modo somente leitura.
            </>,
            <>
              <strong className="text-foreground">Meta Ads</strong>: métricas de campanhas coletadas pela agência
              com acesso próprio às contas de anúncios que gerencia, e não por login de clientes na Plataforma.
            </>,
          ]}
        />
        <p>
          <strong className="text-foreground">Dados de operação.</strong> Informações que a equipe da agência
          cadastra na Plataforma, como clientes, leads, reuniões e tarefas.
        </p>
        <p>
          <strong className="text-foreground">Credenciais técnicas.</strong> Para manter as integrações ativas,
          guardamos os tokens de acesso e de renovação emitidos pelo Google e pela Shopify. Nunca recebemos nem
          guardamos senhas das suas contas Google ou Shopify.
        </p>
      </Secao>

      <Secao titulo="3. Para que usamos os dados">
        <Lista
          itens={[
            "Exibir painéis e relatórios de desempenho do próprio cliente a quem os dados pertencem.",
            "Calcular indicadores como investimento total, retorno sobre investimento, custo de aquisição e projeções.",
            "Manter as integrações funcionando e identificar quando uma conexão precisa ser refeita.",
            "Proteger a Plataforma contra uso indevido e cumprir obrigações legais.",
          ]}
        />
        <p>
          Não usamos dados obtidos de APIs do Google ou de outras integrações para publicidade, nem para criar
          perfis de pessoas, nem os vendemos.
        </p>
      </Secao>

      <Secao titulo="4. Uso de dados recebidos de APIs do Google">
        <p>
          O uso e a transferência, para qualquer outro aplicativo, das informações recebidas das APIs do Google
          pela {LEGAL.produto} obedecerão à{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="underline hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de Dados de Usuário dos Serviços de API do Google
          </a>
          , incluindo os requisitos de Uso Limitado.
        </p>
        <p>
          In English: {LEGAL.produto}&apos;s use and transfer to any other app of information received from Google
          APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.
        </p>
        <Lista
          itens={[
            "Usamos os dados do Google apenas para oferecer e melhorar as funções de relatório visíveis ao usuário na Plataforma.",
            "Não transferimos esses dados a terceiros, exceto quando necessário para operar o serviço, cumprir a lei ou com o seu consentimento.",
            "Pessoas não leem esses dados, salvo com o seu consentimento, por motivo de segurança ou abuso, ou para cumprir a lei.",
            "Não usamos esses dados para publicidade, nem para treinar modelos de inteligência artificial generalizados.",
          ]}
        />
      </Secao>

      <Secao titulo="5. Com quem compartilhamos">
        <p>
          Não vendemos dados. Usamos prestadores que operam a Plataforma sob nossas instruções: serviço de banco de
          dados e autenticação (Supabase), serviço de automação de fluxos (n8n) e hospedagem. Eles tratam dados
          apenas para executar o serviço. Também podemos divulgar dados quando a lei exigir.
        </p>
      </Secao>

      <Secao titulo="6. Armazenamento e segurança">
        <p>
          As métricas de Google Ads e Google Analytics são consultadas no momento em que o relatório é aberto e
          exibidas na tela, sem manter cópia delas. Já as métricas do Meta Ads e alguns indicadores de
          acompanhamento ficam em registros periódicos no nosso banco de dados.
        </p>
        <p>
          Os tokens de integração ficam em tabelas de acesso restrito, lidas apenas pelo servidor da Plataforma, e
          nunca são enviados ao navegador. A comunicação com o sistema usa conexão criptografada (HTTPS). Nenhum
          sistema é totalmente imune a falhas, e trabalhamos para reduzir riscos continuamente.
        </p>
      </Secao>

      <Secao titulo="7. Retenção, desconexão e exclusão">
        <Lista
          itens={[
            <>
              <strong className="text-foreground">Desconectar:</strong> em Integrações, o botão
              &ldquo;Desconectar&rdquo; apaga da Plataforma os tokens e a conta vinculada daquele cliente.
            </>,
            <>
              <strong className="text-foreground">Revogar no Google:</strong> você pode remover o acesso a
              qualquer momento em{" "}
              <a
                href="https://myaccount.google.com/permissions"
                className="underline hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                myaccount.google.com/permissions
              </a>
              .
            </>,
            <>
              <strong className="text-foreground">Shopify:</strong> a instalação pode ser removida em Configurações
              &rarr; Aplicativos da própria loja.
            </>,
            <>
              <strong className="text-foreground">Exclusão de dados:</strong> peça por e-mail a exclusão dos seus
              dados e das integrações. Respondemos em até 15 dias, salvo guarda exigida por lei.
            </>,
          ]}
        />
      </Secao>

      <Secao titulo="8. Seus direitos (LGPD)">
        <p>
          Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode pedir confirmação do tratamento,
          acesso, correção, anonimização, portabilidade, informação sobre compartilhamentos e a eliminação dos dados
          tratados com base no seu consentimento, além de revogar esse consentimento. Para exercer qualquer desses
          direitos, escreva para o e-mail da seção 11.
        </p>
      </Secao>

      <Secao titulo="9. Cookies">
        <p>
          Usamos apenas cookies técnicos: o de sessão, que mantém você conectado, e cookies temporários que
          protegem o processo de conexão com Google e Shopify. Não usamos cookies de publicidade.
        </p>
      </Secao>

      <Secao titulo="10. Alterações desta política">
        <p>
          Podemos atualizar esta política. A data no topo da página indica a última revisão, e mudanças relevantes
          serão comunicadas pelos canais da Plataforma.
        </p>
      </Secao>

      <Secao titulo="11. Contato">
        <p>
          {LEGAL.empresa}
          <br />
          E-mail:{" "}
          <a href={`mailto:${LEGAL.email}`} className="underline hover:text-foreground">
            {LEGAL.email}
          </a>
          <br />
          Site:{" "}
          <a href={LEGAL.site} className="underline hover:text-foreground">
            {LEGAL.site}
          </a>
        </p>
      </Secao>
    </LegalLayout>
  );
}
