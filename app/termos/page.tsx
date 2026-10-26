import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, LegalLayout, Lista, Secao } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Termos de Serviço | ID Performance",
  description: "Condições de uso da ID Performance Plataforma.",
};

export default function TermosDeServico() {
  return (
    <LegalLayout titulo="Termos de Serviço">
      <Secao titulo="1. Aceitação">
        <p>
          Estes Termos regem o uso da {LEGAL.produto} (&ldquo;Plataforma&rdquo;), operada pela {LEGAL.empresa}.
          Ao acessar a Plataforma ou conectar uma conta, você declara que leu e concorda com estes Termos e com a{" "}
          <Link href="/privacidade" className="underline hover:text-foreground">
            Política de Privacidade
          </Link>
          . Se não concordar, não use o serviço.
        </p>
      </Secao>

      <Secao titulo="2. O serviço">
        <p>
          A Plataforma reúne, em painéis e relatórios, métricas de campanhas de mídia paga, de análise de tráfego e
          de lojas virtuais. As informações vêm de serviços de terceiros, como Google Ads, Google Analytics, Meta
          Ads e Shopify, conectados com a sua autorização. A Plataforma lê esses dados, e não altera campanhas,
          orçamentos nem configurações das suas contas.
        </p>
      </Secao>

      <Secao titulo="3. Acesso e conta">
        <Lista
          itens={[
            "O acesso é concedido pela agência a pessoas autorizadas. Você é responsável por manter suas credenciais em sigilo.",
            "Avise-nos imediatamente se suspeitar de uso indevido da sua conta.",
            "Atividades feitas com as suas credenciais são consideradas feitas por você.",
          ]}
        />
      </Secao>

      <Secao titulo="4. Conexão de contas de terceiros">
        <p>
          Ao conectar uma conta do Google, da Shopify ou de outro serviço, você declara ter autoridade para
          autorizar esse acesso em nome do titular da conta. O uso desses serviços continua sujeito aos termos de
          cada fornecedor. Você pode desconectar uma integração a qualquer momento pela Plataforma e revogar o
          acesso diretamente no Google ou na Shopify.
        </p>
      </Secao>

      <Secao titulo="5. Uso aceitável">
        <p>É proibido:</p>
        <Lista
          itens={[
            "usar a Plataforma para fins ilegais ou para violar direitos de terceiros;",
            "tentar acessar dados de clientes ou contas para as quais você não tem autorização;",
            "tentar burlar a segurança, sobrecarregar ou fazer engenharia reversa do sistema;",
            "revender, sublicenciar ou compartilhar o acesso sem autorização da agência.",
          ]}
        />
      </Secao>

      <Secao titulo="6. Dados e privacidade">
        <p>
          Os dados das suas contas continuam sendo seus. Tratamos esses dados para prestar o serviço, conforme a
          Política de Privacidade, que explica como são usados, armazenados e como pedir a exclusão.
        </p>
      </Secao>

      <Secao titulo="7. Propriedade intelectual">
        <p>
          O software, a marca, o design e os conteúdos da Plataforma pertencem à {LEGAL.empresa}. Estes Termos não
          transferem a você nenhum direito de propriedade, apenas um direito limitado, revogável e não exclusivo de
          uso enquanto durar a relação com a agência.
        </p>
      </Secao>

      <Secao titulo="8. Disponibilidade e precisão dos dados">
        <p>
          Buscamos manter a Plataforma disponível, mas ela pode ficar indisponível por manutenção ou por falhas de
          serviços de terceiros. Os números exibidos dependem das plataformas de origem e podem sofrer atrasos,
          ajustes ou diferenças de atribuição em relação às ferramentas originais. A Plataforma é um apoio à
          decisão e não garante resultados de campanhas.
        </p>
      </Secao>

      <Secao titulo="9. Limitação de responsabilidade">
        <p>
          Na medida permitida pela lei, a {LEGAL.empresa} não responde por lucros cessantes, perda de oportunidade
          ou danos indiretos decorrentes do uso ou da impossibilidade de uso da Plataforma, nem por decisões
          tomadas com base nos dados exibidos. Nada nestes Termos exclui responsabilidades que a lei não permita
          excluir.
        </p>
      </Secao>

      <Secao titulo="10. Suspensão e encerramento">
        <p>
          Podemos suspender ou encerrar o acesso em caso de violação destes Termos, de risco à segurança ou do fim
          da relação com a agência. Você pode parar de usar a Plataforma e pedir a exclusão dos seus dados a
          qualquer momento, conforme a Política de Privacidade.
        </p>
      </Secao>

      <Secao titulo="11. Alterações">
        <p>
          Podemos atualizar estes Termos. A data no topo indica a última revisão. O uso continuado da Plataforma
          após a atualização significa que você aceita a nova versão.
        </p>
      </Secao>

      <Secao titulo="12. Lei aplicável e contato">
        <p>
          Estes Termos são regidos pelas leis do Brasil. Fica eleito o foro da comarca do domicílio do consumidor,
          quando aplicável, ou o foro da sede da {LEGAL.empresa}, para resolver controvérsias. Dúvidas:{" "}
          <a href={`mailto:${LEGAL.email}`} className="underline hover:text-foreground">
            {LEGAL.email}
          </a>
          .
        </p>
      </Secao>
    </LegalLayout>
  );
}
