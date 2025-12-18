// app/auth/register.tsx
import { router } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ButtonPrimary from "../../components/ButtonPrimary";
import theme from "../../constants/theme";

export default function RegisterScreen() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [cpf, setCpf] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const handleRegister = () => {
    console.log("Criar conta Plugaí Shop", {
      name,
      email,
      phone,
      cpf,
      password,
      confirmPassword,
    });

    // Futuro: validações reais + chamada para API de cadastro
    // Por enquanto, simulamos sucesso e levamos para a conta
    router.push("/(tabs)/account" as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Criar conta</Text>
          <Text style={styles.screenSubtitle}>
            Cadastre-se para acompanhar pedidos, salvar favoritos e ter uma
            experiência completa Plugaí Shop.
          </Text>
        </View>

        {/* Campos do formulário */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seus dados</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nome completo</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite seu nome completo"
              placeholderTextColor={theme.colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="seuemail@exemplo.com"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Celular (WhatsApp)</Text>
            <TextInput
              style={styles.input}
              placeholder="(62) 9 9999-9999"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>CPF</Text>
            <TextInput
              style={styles.input}
              placeholder="000.000.000-00"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="numeric"
              value={cpf}
              onChangeText={setCpf}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Defina sua senha</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirmar senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Repita a senha"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <Text style={styles.passwordHint}>
            Dica 2026 de segurança: use combinação de letras maiúsculas,
            minúsculas, números e símbolos para fortalecer sua senha.
          </Text>
        </View>

        {/* Termos e privacidade */}
        <View style={styles.section}>
          <Text style={styles.termsText}>
            Ao criar sua conta, você concorda com os{" "}
            <Text style={styles.termsLink}>Termos de Uso</Text> e a{" "}
            <Text style={styles.termsLink}>Política de Privacidade</Text> da
            Plugaí Shop.
          </Text>
        </View>

        {/* Botão principal */}
        <View style={styles.section}>
          <ButtonPrimary title="Criar conta" onPress={handleRegister} />

          <TouchableOpacity
            style={styles.footerLinkWrapper}
            activeOpacity={0.8}
            onPress={() => router.push("/auth/login" as any)}
          >
            <Text style={styles.footerText}>
              Já tem conta?{" "}
              <Text style={styles.footerLink}>Entrar na Plugaí Shop</Text>
            </Text>
          </TouchableOpacity>
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
  header: {
    marginBottom: theme.spacing.lg,
  },
  screenTitle: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
  },
  screenSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },

  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
    fontSize: 18,
  },

  fieldGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    ...theme.typography.body,
  },

  passwordHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },

  termsText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  termsLink: {
    color: theme.colors.primary,
    fontWeight: "600",
  },

  footerLinkWrapper: {
    marginTop: theme.spacing.md,
    alignItems: "center",
  },
  footerText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  footerLink: {
    color: theme.colors.primary,
    fontWeight: "600",
  },

  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
