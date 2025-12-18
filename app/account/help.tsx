// app/account/help.tsx
import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../components/AppHeader";
import ButtonPrimary from "../../components/ButtonPrimary";
import theme from "../../constants/theme";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "prazo-entrega",
    question: "Quais são os prazos de entrega?",
    answer:
      "Os prazos variam de acordo com o produto, fornecedor e endereço de entrega. Em geral, trabalhamos com prazos estimados entre 5 e 20 dias úteis, sempre exibidos na tela de frete antes da conclusão da compra.",
  },
  {
    id: "acompanhar-pedido",
    question: "Como acompanho o status do meu pedido?",
    answer:
      "Você pode acompanhar todos os detalhes em Meus pedidos, dentro do app ou do site Plugaí Shop. Lá serão exibidos os status de pagamento, separação, envio e entrega, além do código de rastreio quando disponível.",
  },
  {
    id: "troca-devolucao",
    question: "Como funcionam trocas e devoluções?",
    answer:
      "Seguindo o Código de Defesa do Consumidor, você pode solicitar troca ou devolução dentro do prazo legal, desde que o produto esteja em boas condições. Em breve, você poderá abrir solicitações diretamente pelo app, em Meus pedidos.",
  },
  {
    id: "pagamentos",
    question: "Quais formas de pagamento serão aceitas?",
    answer:
      "Hoje exibimos opções ilustrativas. No futuro, integraremos com gateways para aceitar Pix, cartão de crédito, boleto e outras carteiras digitais, sempre com segurança e confirmação em tempo real.",
  },
];

export default function HelpCenterScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <AppHeader
          title="Central de ajuda"
          subtitle="Encontre respostas rápidas ou fale com nosso time de suporte."
        />

        {/* Bloco principal de FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dúvidas frequentes</Text>

          <View style={styles.card}>
            {FAQ_ITEMS.map((item, index) => (
              <View key={item.id} style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Text style={styles.faqAnswer}>{item.answer}</Text>

                {index < FAQ_ITEMS.length - 1 && (
                  <View style={styles.cardDivider} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Bloco de contato e suporte futuro (multicanal) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Canais de suporte</Text>

          <View style={styles.card}>
            <Text style={styles.sectionSubtitle}>
              Em breve, o app Plugaí Shop estará integrado a vários canais:
            </Text>

            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>
                Chat em tempo real diretamente pelo app.
              </Text>
            </View>

            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>
                Atendimento via WhatsApp Business com fila inteligente.
              </Text>
            </View>

            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>
                Integração com e-mail suporte@plugaishop.com.br para
                chamados estruturados.
              </Text>
            </View>

            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>
                Central de suporte omnichannel, conectando app, site e
                marketplaces parceiros.
              </Text>
            </View>

            <Text style={styles.helperText}>
              Tudo isso foi pensado para acompanhar o crescimento
              exponencial da Plugaí Shop e manter um atendimento
              profissional, mesmo com alto volume de clientes.
            </Text>
          </View>
        </View>

        {/* Bloco de “não encontrou resposta” */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ainda precisa de ajuda?</Text>

          <View style={styles.card}>
            <Text style={styles.helperText}>
              Se você não encontrou sua resposta aqui, entre em contato
              com nosso time. Em versões futuras, este fluxo será
              totalmente automatizado dentro do próprio app.
            </Text>

            <View style={styles.actions}>
              <ButtonPrimary
                title="Ver meus pedidos"
                onPress={() => router.push("/orders")}
              />

              <View style={styles.spacer} />

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.secondaryButton}
                onPress={() => {
                  // Futuramente: abrir canal direto de suporte
                  console.log("Abrir canal de suporte (futuro)");
                }}
              >
                <Text style={styles.secondaryButtonText}>
                  Falar com o suporte (futuro)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },

  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  cardDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: theme.spacing.sm,
  },

  faqItem: {
    paddingVertical: theme.spacing.xs,
  },
  faqQuestion: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  faqAnswer: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },

  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.xs,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginTop: 7,
    marginRight: theme.spacing.sm,
  },
  bulletText: {
    flex: 1,
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
  },

  helperText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },

  actions: {
    marginTop: theme.spacing.md,
  },
  spacer: {
    height: theme.spacing.sm,
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: "center",
  },
  secondaryButtonText: {
    ...theme.typography.buttonLabel,
    color: theme.colors.primary,
  },

  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
