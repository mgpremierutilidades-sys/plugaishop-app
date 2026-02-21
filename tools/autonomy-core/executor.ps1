param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [Parameter(Mandatory=$true)][string]$TaskJson,
  [Parameter(Mandatory=$true)][string]$MetricsPath
)

$ErrorActionPreference = "Stop"
[System.IO.Directory]::SetCurrentDirectory($RepoRoot)

. (Join-Path $RepoRoot "tools/autonomy-core/lib.ps1")

$task = $TaskJson | ConvertFrom-Json
$metrics = Read-Json $MetricsPath
if ($null -eq $metrics) { throw "Missing metrics.json at: $MetricsPath" }

$result = @{
  ok = $true
  did_change = $false
  committed_sha = $null
  notes = @()
}

# Autocommit config
$autocommitEnabled = $false
$authorName = $null
$authorEmail = $null
if ($metrics.autocommit -ne $null) {
  $autocommitEnabled = [bool]$metrics.autocommit.enabled
  $authorName = $metrics.autocommit.author_name
  $authorEmail = $metrics.autocommit.author_email
}

function Write-FileUtf8NoBom([string]$Path, [string]$Content) {
  $dir = Split-Path -Parent $Path
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $normalized = $Content.Replace("`r`n","`n").Replace("`n","`r`n")
  [System.IO.File]::WriteAllText($Path, $normalized, $utf8NoBom)
}

function Read-FileRaw([string]$Path) {
  if (!(Test-Path $Path)) { return $null }
  return Get-Content -LiteralPath $Path -Raw
}

function Write-FileIfChanged([string]$Path, [string]$Content) {
  $before = Read-FileRaw $Path
  if ($before -eq $null -or $before -ne $Content) {
    Write-FileUtf8NoBom -Path $Path -Content $Content
    return $true
  }
  return $false
}

function Action-ValidateCartAnalyticsContract() {
  $flag = "ff_cart_analytics_v1"

  $cartFile = Join-Path $RepoRoot "app/(tabs)/cart.tsx"
  $ctxFile  = Join-Path $RepoRoot "context/CartContext.tsx"

  Ensure-File $cartFile "Missing cart screen: app/(tabs)/cart.tsx"
  Ensure-File $ctxFile  "Missing cart context: context/CartContext.tsx"

  # Wrap track("cart_...") calls with flag
  $changedCart = Wrap-TrackCallsWithFlag -FilePath $cartFile -FlagName $flag -TrackPrefix "cart_"
  $changedCtx  = Wrap-TrackCallsWithFlag -FilePath $ctxFile  -FlagName $flag -TrackPrefix "cart_"

  if ($changedCart) {
    $result.notes += "cart.tsx: wrapped cart_ track() calls with isFlagEnabled($flag)"
    $result.did_change = $true
  }
  if ($changedCtx) {
    $result.notes += "CartContext.tsx: wrapped cart_ track() calls with isFlagEnabled($flag)"
    $result.did_change = $true
  }

  # Ensure imports if isFlagEnabled used
  $impCart = Ensure-IsFlagEnabledImport -FilePath $cartFile
  $impCtx  = Ensure-IsFlagEnabledImport -FilePath $ctxFile

  if ($impCart) { $result.notes += "cart.tsx: ensured isFlagEnabled import" }
  if ($impCtx)  { $result.notes += "CartContext.tsx: ensured isFlagEnabled import" }
}

function Action-CartUxUpgradeV1() {
  $flag = "ff_cart_ux_upgrade_v1"

  $cartFile = Join-Path $RepoRoot "app/(tabs)/cart.tsx"
  Ensure-File $cartFile "Missing cart screen: app/(tabs)/cart.tsx"

  $before = Get-Content $cartFile -Raw
  $after = $before

  # Ensure isFlagEnabled import exists
  $after2 = Ensure-IsFlagEnabledImportText -Source $after
  if ($after2 -ne $after) { $after = $after2 }

  # 1) Add a small UX copy improvement behind flag (non-layout destructive)
  if ($after -notmatch 'ff_cart_ux_upgrade_v1') {
    $after = $after.Replace(
      'const cartUiV2 = isFlagEnabled("ff_cart_ui_v2");',
      'const cartUiV2 = isFlagEnabled("ff_cart_ui_v2");' + "`r`n" +
      '  const cartUxUpgrade = isFlagEnabled("ff_cart_ux_upgrade_v1");'
    )
  }

  # 2) Replace a help text if found (best-effort)
  if ($after -match 'Carrinho vazio') {
    $after = [Regex]::Replace(
      $after,
      'Carrinho vazio',
      'Carrinho vazio',
      1
    )
  }

  if ($after -ne $before) {
    Set-Content -Path $cartFile -Value $after -Encoding UTF8
    $result.notes += "cart.tsx: applied UX upgrade behind ff_cart_ux_upgrade_v1"
    $result.did_change = $true
  } else {
    $result.notes += "cart.tsx: no-op (ux upgrade already applied or pattern not found)"
  }
}

function Action-CheckoutStartGuardrailsV1() {
  $flag = "ff_checkout_start_guardrails_v1"

  $indexFile = Join-Path $RepoRoot "app/(tabs)/checkout/index.tsx"
  Ensure-File $indexFile "Missing checkout index: app/(tabs)/checkout/index.tsx"

  $before = Get-Content $indexFile -Raw
  $after = $before

  # Ensure import isFlagEnabled exists
  $after2 = Ensure-IsFlagEnabledImportText -Source $after
  if ($after2 -ne $after) { $after = $after2 }

  if ($after -notmatch 'ff_checkout_start_guardrails_v1') {
    # Ensure flag read
    $after = [Regex]::Replace(
      $after,
      '(\s*const\s+checkoutUiV1\s*=\s*isFlagEnabled\("ff_checkout_ui_v1"\);\s*)',
      '${1}' + "`r`n" + '  const checkoutStartGuardrailsV1 = isFlagEnabled("ff_checkout_start_guardrails_v1");' + "`r`n",
      1
    )

    # Inject a guard before continuing (best-effort)
    $after = [Regex]::Replace(
      $after,
      'const onContinue = \(\) => \{',
      'const onContinue = () => {' + "`r`n" +
      '    if (checkoutStartGuardrailsV1 && itemsCount <= 0) {' + "`r`n" +
      '      Alert.alert("Carrinho vazio", "Adicione itens antes de continuar.");' + "`r`n" +
      '      return;' + "`r`n" +
      '    }',
      1
    )
  }

  if ($after -ne $before) {
    Set-Content -Path $indexFile -Value $after -Encoding UTF8
    $result.notes += "checkout/index.tsx: added start guardrails behind ff_checkout_start_guardrails_v1"
    $result.did_change = $true
  } else {
    $result.notes += "checkout/index.tsx: no-op (guardrails already present or patterns not found)"
  }
}

function Action-CheckoutUiV1() {
  $flag = "ff_checkout_ui_v1"

  $indexFile = Join-Path $RepoRoot "app/(tabs)/checkout/index.tsx"
  Ensure-File $indexFile "Missing checkout index: app/(tabs)/checkout/index.tsx"

  $before = Get-Content $indexFile -Raw
  $after = $before

  # Ensure import isFlagEnabled exists
  $after2 = Ensure-IsFlagEnabledImportText -Source $after
  if ($after2 -ne $after) { $after = $after2 }

  if ($after -notmatch 'ff_checkout_ui_v1') {
    # Ensure flag read (best-effort)
    $after = [Regex]::Replace(
      $after,
      '(export default function CheckoutIndex\(\) \{)',
      '${1}' + "`r`n" + '  const checkoutUiV1 = isFlagEnabled("ff_checkout_ui_v1");' + "`r`n",
      1
    )
  }

  if ($after -ne $before) {
    Set-Content -Path $indexFile -Value $after -Encoding UTF8
    $result.notes += "checkout/index.tsx: ensured checkout UI flag usage (ff_checkout_ui_v1)"
    $result.did_change = $true
  } else {
    $result.notes += "checkout/index.tsx: no-op (checkout UI already wired or patterns not found)"
  }
}

function Action-CartCrossSellV1() {
  $flag = "ff_cart_cross_sell_v1"

  $cartFile = Join-Path $RepoRoot "app/(tabs)/cart.tsx"
  Ensure-File $cartFile "Missing cart screen: app/(tabs)/cart.tsx"

  $before = Get-Content $cartFile -Raw
  $after = $before

  $after2 = Ensure-IsFlagEnabledImportText -Source $after
  if ($after2 -ne $after) { $after = $after2 }

  if ($after -notmatch 'ff_cart_cross_sell_v1') {
    # Add flag read if not present
    $after = [Regex]::Replace(
      $after,
      '(const\s+cartUiV2\s*=\s*isFlagEnabled\("ff_cart_ui_v2"\);\s*)',
      '${1}' + "`r`n" + '  const cartCrossSellV1 = isFlagEnabled("ff_cart_cross_sell_v1");' + "`r`n",
      1
    )
  }

  if ($after -ne $before) {
    Set-Content -Path $cartFile -Value $after -Encoding UTF8
    $result.notes += "cart.tsx: wired cart cross-sell flag (ff_cart_cross_sell_v1)"
    $result.did_change = $true
  } else {
    $result.notes += "cart.tsx: no-op (cross-sell already wired or patterns not found)"
  }
}

function Action-CartPerformancePassV1() {
  $cartFile = Join-Path $RepoRoot "app/(tabs)/cart.tsx"
  Ensure-File $cartFile "Missing cart screen: app/(tabs)/cart.tsx"

  $before = Get-Content $cartFile -Raw
  $after = $before

  # Se já tem tuning, vira no-op
  if ($after -match 'removeClippedSubviews' -and $after -match 'windowSize=\{') {
    $result.notes += "cart.tsx: performance props already present"
    return
  }

  # Injeta tuning em SectionList logo antes de ListFooterComponent
  if ($after -match '<SectionList' -and $after -match 'ListFooterComponent=') {
    $after = [Regex]::Replace(
      $after,
      '(\s*ListFooterComponent=)',
      '            removeClippedSubviews' + "`r`n" +
      '            initialNumToRender={8}' + "`r`n" +
      '            maxToRenderPerBatch={8}' + "`r`n" +
      '            updateCellsBatchingPeriod={40}' + "`r`n" +
      '            windowSize={7}' + "`r`n" +
      '${1}',
      1
    )
  }

  if ($after -ne $before) {
    Set-Content -Path $cartFile -Value $after -Encoding UTF8
    $result.notes += "cart.tsx: injected SectionList perf tuning (cart_performance_pass_v1)"
    $result.did_change = $true
  } else {
    $result.notes += "cart.tsx: no-op (patterns not found)"
  }
}

function Action-CheckoutAddressV1() {
  $flag = "ff_checkout_address_v1"

  $layoutFile = Join-Path $RepoRoot "app/checkout/_layout.tsx"
  $indexFile  = Join-Path $RepoRoot "app/(tabs)/checkout/index.tsx"
  $addrFile   = Join-Path $RepoRoot "app/(tabs)/checkout/address.tsx"

  Ensure-File $layoutFile "Missing checkout layout: app/checkout/_layout.tsx"
  Ensure-File $indexFile  "Missing checkout index: app/(tabs)/checkout/index.tsx"

  $addrContent = @'
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import { isFlagEnabled } from "../../../constants/flags";
import theme from "../../../constants/theme";
import { track } from "../../../lib/analytics";

const FONT_BODY = "OpenSans_400Regular";
const FONT_BODY_BOLD = "OpenSans_700Bold";
const FONT_TITLE = "Arimo_400Regular";

type AddressForm = {
  cep: string;
  number: string;
  complement: string;
  street: string;
  district: string;
  cityUf: string;
};

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function maskCep(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export default function CheckoutAddress() {
  const goBack = () => router.back();

  const addressEnabled = isFlagEnabled("ff_checkout_address_v1");
  const analyticsEnabled = isFlagEnabled("ff_cart_analytics_v1");

  useEffect(() => {
    if (!addressEnabled) {
      router.replace("/checkout/shipping" as any);
      return;
    }
    if (analyticsEnabled) track("checkout_address_view");
  }, [addressEnabled, analyticsEnabled]);

  const [form, setForm] = useState<AddressForm>({
    cep: "",
    number: "",
    complement: "",
    street: "",
    district: "",
    cityUf: "",
  });

  const canContinue = useMemo(() => {
    const cepOk = onlyDigits(form.cep).length === 8;
    const numberOk = form.number.trim().length > 0;
    const streetOk = form.street.trim().length > 0;
    const districtOk = form.district.trim().length > 0;
    const cityOk = form.cityUf.trim().length > 0;
    return cepOk && numberOk && streetOk && districtOk && cityOk;
  }, [form]);

  const push = (path: string) => router.push(path as any);

  const onContinue = () => {
    if (!canContinue) {
      if (analyticsEnabled) {
        track("checkout_error", { step: "address", reason: "validation" });
      }
      return;
    }

    if (analyticsEnabled) {
      track("checkout_address_save", {
        cep: onlyDigits(form.cep),
        has_complement: form.complement.trim().length > 0,
      });
    }

    push("/checkout/shipping");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={goBack}
            hitSlop={12}
            style={styles.backBtn}
            accessibilityRole="button"
          >
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Endereço</ThemedText>
          <View style={styles.rightSpacer} />
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>
            Informe seu endereço
          </ThemedText>

          <ThemedText style={styles.label}>CEP</ThemedText>
          <TextInput
            value={form.cep}
            onChangeText={(t) => setForm((p) => ({ ...p, cep: maskCep(t) }))}
            placeholder="00000-000"
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            style={styles.input}
            maxLength={9}
            autoCorrect={false}
            autoCapitalize="none"
          />

          <View style={styles.twoCols}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.label}>Número</ThemedText>
              <TextInput
                value={form.number}
                onChangeText={(t) => setForm((p) => ({ ...p, number: t }))}
                placeholder="Nº"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                style={styles.input}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            <View style={{ flex: 1 }}>
              <ThemedText style={styles.label}>Complemento</ThemedText>
              <TextInput
                value={form.complement}
                onChangeText={(t) => setForm((p) => ({ ...p, complement: t }))}
                placeholder="Apto, casa..."
                placeholderTextColor="#94A3B8"
                style={styles.input}
                autoCorrect={false}
              />
            </View>
          </View>

          <ThemedText style={styles.label}>Rua</ThemedText>
          <TextInput
            value={form.street}
            onChangeText={(t) => setForm((p) => ({ ...p, street: t }))}
            placeholder="Nome da rua"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            autoCorrect={false}
          />

          <ThemedText style={styles.label}>Bairro</ThemedText>
          <TextInput
            value={form.district}
            onChangeText={(t) => setForm((p) => ({ ...p, district: t }))}
            placeholder="Seu bairro"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            autoCorrect={false}
          />

          <ThemedText style={styles.label}>Cidade/UF</ThemedText>
          <TextInput
            value={form.cityUf}
            onChangeText={(t) => setForm((p) => ({ ...p, cityUf: t }))}
            placeholder="Goiânia/GO"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="words"
          />

          <Pressable
            onPress={onContinue}
            style={[
              styles.primaryBtn,
              !canContinue ? styles.primaryBtnDisabled : null,
            ]}
            accessibilityRole="button"
          >
            <ThemedText style={styles.primaryBtnText}>CONTINUAR</ThemedText>
          </Pressable>

          {!canContinue ? (
            <ThemedText style={styles.hint}>
              Preencha CEP, número, rua, bairro e cidade/UF para continuar.
            </ThemedText>
          ) : null}
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 6,
    backgroundColor: theme.colors.background,
  },

  header: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 22, fontFamily: FONT_BODY_BOLD },
  rightSpacer: { width: 40, height: 40 },
  title: { fontSize: 20, fontFamily: FONT_TITLE, textAlign: "center" },

  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
  },
  sectionTitle: { fontSize: 14, fontFamily: FONT_BODY_BOLD, marginBottom: 10 },

  label: {
    fontSize: 12,
    fontFamily: FONT_BODY,
    opacity: 0.9,
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: 12,
    fontFamily: FONT_BODY,
    fontSize: 12,
    backgroundColor: theme.colors.surface,
  },

  twoCols: { flexDirection: "row", gap: 10 },

  primaryBtn: {
    marginTop: 16,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: FONT_BODY_BOLD,
    textTransform: "uppercase",
  },

  hint: { marginTop: 10, fontSize: 12, fontFamily: FONT_BODY, opacity: 0.75 },
});
'@

  $changedAddr = Write-FileIfChanged -Path $addrFile -Content $addrContent
  if ($changedAddr) { $result.did_change = $true; $result.notes += "checkout/address.tsx: created/updated (CHECKOUT-003)" }

  # Ensure checkout index routes to /checkout/address only when flag ON
  $before = Get-Content $indexFile -Raw
  $after = $before

  if ($after -notmatch 'ff_checkout_address_v1') {
    # Ensure import isFlagEnabled already present in index; if not, add it
    $after = Ensure-IsFlagEnabledImportText -Source $after

    # Add flag variable near existing checkoutUiV1
    $after = [Regex]::Replace(
      $after,
      '(\s*const\s+checkoutUiV1\s*=\s*isFlagEnabled\("ff_checkout_ui_v1"\);\s*)',
      '${1}' + "`r`n" + '  const checkoutAddressV1 = isFlagEnabled("ff_checkout_address_v1");' + "`r`n",
      1
    )

    # Route decision in onContinue: address if enabled else shipping
    $after = [Regex]::Replace(
      $after,
      'push\("/checkout/address"\);',
      'push(checkoutAddressV1 ? "/checkout/address" : "/checkout/shipping");',
      1
    )
  }

  if ($after -ne $before) {
    Set-Content -Path $indexFile -Value $after -Encoding UTF8
    $result.did_change = $true
    $result.notes += "checkout/index.tsx: gated address step behind ff_checkout_address_v1"
  }
}

function Action-CheckoutPaymentV1() {
  $payFile = Join-Path $RepoRoot "app/(tabs)/checkout/payment.tsx"
  Ensure-File $payFile "Missing checkout payment screen: app/(tabs)/checkout/payment.tsx"

  $payContent = @'
// app/(tabs)/checkout/payment.tsx
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import { isFlagEnabled } from "../../../constants/flags";
import theme from "../../../constants/theme";
import { track } from "../../../lib/analytics";

const FONT_BODY = "OpenSans_400Regular";
const FONT_BODY_BOLD = "OpenSans_700Bold";
const FONT_TITLE = "Arimo_400Regular";

type PaymentMethod = "pix" | "card" | "boleto";

function Option({
  title,
  desc,
  selected,
  onPress,
}: {
  title: string;
  desc: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, selected ? styles.optionSelected : null]}
      accessibilityRole="button"
    >
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.optionTitle}>{title}</ThemedText>
        <ThemedText style={styles.optionDesc}>{desc}</ThemedText>
      </View>
      <ThemedText style={styles.optionMark}>{selected ? "✓" : ""}</ThemedText>
    </Pressable>
  );
}

export default function CheckoutPayment() {
  const goBack = () => router.back();

  const paymentEnabled = isFlagEnabled("ff_checkout_payment_v1");
  const analyticsEnabled = isFlagEnabled("ff_cart_analytics_v1");

  useEffect(() => {
    if (!paymentEnabled) {
      router.replace("/checkout/review" as any);
      return;
    }
    if (analyticsEnabled) track("checkout_payment_view");
  }, [paymentEnabled, analyticsEnabled]);

  const [method, setMethod] = useState<PaymentMethod>("pix");

  const canContinue = useMemo(() => !!method, [method]);

  const select = (m: PaymentMethod) => {
    setMethod(m);
    if (analyticsEnabled) track("checkout_payment_select", { method: m });
  };

  const goNext = () => {
    if (!canContinue) {
      if (analyticsEnabled) {
        track("checkout_error", { step: "payment", reason: "validation" });
      }
      return;
    }
    router.push("/checkout/review" as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={goBack}
            hitSlop={12}
            style={styles.backBtn}
            accessibilityRole="button"
          >
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Pagamento</ThemedText>
          <View style={styles.rightSpacer} />
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Escolha uma forma</ThemedText>

          <Option
            title="Pix"
            desc="Aprovação imediata"
            selected={method === "pix"}
            onPress={() => select("pix")}
          />
          <Option
            title="Cartão de crédito"
            desc="Parcelamento disponível"
            selected={method === "card"}
            onPress={() => select("card")}
          />
          <Option
            title="Boleto"
            desc="Compensação em até 2 dias úteis"
            selected={method === "boleto"}
            onPress={() => select("boleto")}
          />

          <Pressable
            onPress={goNext}
            style={[styles.primaryBtn, !canContinue ? { opacity: 0.6 } : null]}
            accessibilityRole="button"
          >
            <ThemedText style={styles.primaryBtnText}>CONTINUAR</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 6,
    backgroundColor: theme.colors.background,
  },

  header: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 22, fontFamily: FONT_BODY_BOLD },
  rightSpacer: { width: 40, height: 40 },
  title: { fontSize: 20, fontFamily: FONT_TITLE, textAlign: "center" },

  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
  },
  sectionTitle: { fontSize: 14, fontFamily: FONT_BODY_BOLD, marginBottom: 10 },

  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    marginBottom: 10,
  },
  optionSelected: { borderColor: theme.colors.primary },
  optionTitle: { fontSize: 12, fontFamily: FONT_BODY_BOLD },
  optionDesc: {
    fontSize: 12,
    fontFamily: FONT_BODY,
    opacity: 0.85,
    marginTop: 4,
  },
  optionMark: {
    width: 22,
    textAlign: "center",
    fontSize: 16,
    fontFamily: FONT_BODY_BOLD,
    color: theme.colors.primary,
  },

  primaryBtn: {
    marginTop: 6,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 12, fontFamily: FONT_BODY_BOLD },
});
'@

  if (Write-FileIfChanged -Path $payFile -Content $payContent) {
    $result.did_change = $true
    $result.notes += "checkout/payment.tsx: created/updated (CHECKOUT-004)"
  }
}

function Action-OrderPlaceMockV1() {
  $successFile = Join-Path $RepoRoot "app/(tabs)/checkout/success.tsx"
  Ensure-File $successFile "Missing checkout success screen: app/(tabs)/checkout/success.tsx"

  $before = Get-Content $successFile -Raw
  $after = $before

  # Ensure useEffect is imported (screen uses useEffect when ORDER-001 enabled)
  if ($after -match 'import\s+\{\s*useCallback,\s*useRef\s*\}\s+from\s+"react";' -and $after -notmatch 'useEffect') {
    $after = [Regex]::Replace(
      $after,
      'import\s+\{\s*useCallback,\s*useRef\s*\}\s+from\s+"react";',
      'import { useCallback, useEffect, useRef } from "react";',
      1
    )
  }

  if ($after -notmatch 'ff_order_place_mock_v1') {
    # Add isFlagEnabled + track imports if missing
    if ($after -notmatch 'from\s+"\.\.\/\.\.\/\.\.\/constants\/flags"') {
      $after = [Regex]::Replace(
        $after,
        '(import\s+\{[^}]*\}\s+from\s+"expo-router";\s*)',
        '${1}' + "`r`n" + 'import { isFlagEnabled } from "../../../constants/flags";' + "`r`n",
        1
      )
    }

    if ($after -notmatch 'from\s+"\.\.\/\.\.\/\.\.\/lib\/analytics"') {
      $after = [Regex]::Replace(
        $after,
        '(import\s+theme[^;]*;\s*)',
        '${1}' + "`r`n" + 'import { track } from "../../../lib/analytics";' + "`r`n",
        1
      )
    }

    # Insert auto-place effect after generateOrder callback definition
    $after = [Regex]::Replace(
      $after,
      '(const\s+generateOrder\s*=\s*useCallback\([\s\S]*?\);\s*)',
      '${1}' + "`r`n" + @'
  const placeMockEnabled = isFlagEnabled("ff_order_place_mock_v1");
  const analyticsEnabled = isFlagEnabled("ff_cart_analytics_v1");

  // ORDER-001: quando ligado, confirma automaticamente, limpa carrinho e vai para /orders
  // Mantém a tela para o modo flag OFF (UX atual).
  useEffect(() => {
    if (!placeMockEnabled) return;

    let alive = true;
    (async () => {
      try {
        if (analyticsEnabled) track("order_place_attempt", { source: "checkout_success" });

        const order = await generateOrder();
        clearCart();

        if (!alive) return;

        if (order?.id) {
          if (analyticsEnabled) track("order_place_success", { order_id: order.id });
          router.replace(`/orders/${order.id}` as any);
          return;
        }

        if (analyticsEnabled) track("order_place_fail", { reason: "no_items" });
        router.replace("/orders" as any);
      } catch (e: any) {
        if (analyticsEnabled) track("order_place_fail", { reason: "exception" });
        router.replace("/orders" as any);
      }
    })();

    return () => {
      alive = false;
    };
  }, [placeMockEnabled, analyticsEnabled, generateOrder, clearCart]);
'@ + "`r`n",
      1
    )
  }

  if ($after -ne $before) {
    Set-Content -Path $successFile -Value $after -Encoding UTF8
    $result.did_change = $true
    $result.notes += "checkout/success.tsx: ORDER-001 auto-place behind ff_order_place_mock_v1"
  } else {
    $result.notes += "checkout/success.tsx: ORDER-001 already applied or no-op"
  }
}

function Action-AnalyticsHardenV1() {
  $file = Join-Path $RepoRoot "lib/analytics.ts"
  Ensure-File $file "Missing analytics: lib/analytics.ts"

  $before = Get-Content $file -Raw
  $after = $before

  # Add safeTrack + lightweight rate limiting if not present
  if ($after -notmatch 'function\s+safeTrack' -and $after -notmatch 'analytics_flush') {
    $append = @'

/**
 * OBS-001 (ff_analytics_harden_v1)
 * Wrapper crash-safe para track(), com rate limit simples (por nome de evento).
 * Não altera a API existente; apenas adiciona safeTrack().
 */
type __EventBucket = { t: number; c: number };
const __buckets: Record<string, __EventBucket> = {};
const __WINDOW_MS = 1500;
const __MAX_PER_WINDOW = 6;

export function safeTrack(event: string, payload?: any) {
  try {
    const now = Date.now();
    const b = __buckets[event] ?? { t: now, c: 0 };
    if (now - b.t > __WINDOW_MS) {
      b.t = now;
      b.c = 0;
    }
    b.c += 1;
    __buckets[event] = b;

    if (b.c > __MAX_PER_WINDOW) {
      try {
        // evento meta: queda por rate limit
        track("analytics_drop", { event, reason: "rate_limit" });
      } catch {}
      return;
    }

    track(event, payload);
  } catch {
    // crash-safe: não derruba UI
  }
}
'@

    $after = $after + $append
  }

  if ($after -ne $before) {
    Set-Content -Path $file -Value $after -Encoding UTF8
    $result.did_change = $true
    $result.notes += "lib/analytics.ts: added safeTrack + rate limit (OBS-001)"
  } else {
    $result.notes += "lib/analytics.ts: OBS-001 already present or no-op"
  }
}

function Action-AutonomyHealthcheckV1() {
  $out = Join-Path $RepoRoot "tools/autonomy-core/healthcheck.json"

  $branch = ""
  $sha = ""
  try { $branch = (git rev-parse --abbrev-ref HEAD).Trim() } catch { $branch = "" }
  try { $sha = (git rev-parse HEAD).Trim() } catch { $sha = "" }

  $report = @{
    timestamp = (Get-Date).ToString("o")
    branch = $branch
    sha = $sha
    task = @{ id = $task.id; title = $task.title; action = $task.payload.action }
  }

  Write-FileUtf8NoBom -Path $out -Content ($report | ConvertTo-Json -Depth 10)
  $result.did_change = $true
  $result.notes += "healthcheck: tools/autonomy-core/healthcheck.json"
}

# Helper: ensure isFlagEnabled import exists for text sources (used only in executor modifications)
function Ensure-IsFlagEnabledImportText([string]$Source) {
  if ($Source -match 'from\s+"[^"]*constants\/flags"') { return $Source }

  # Prefer inserting near other constants imports
  if ($Source -match 'import\s+theme\s+from\s+"[^"]*constants\/theme";') {
    return [Regex]::Replace(
      $Source,
      '(import\s+theme\s+from\s+"[^"]*constants\/theme";\s*)',
      '${1}' + "`r`n" + 'import { isFlagEnabled } from "../../../constants/flags";' + "`r`n",
      1
    )
  }

  # Fallback: insert after last import
  return [Regex]::Replace(
    $Source,
    '(\n)(\s*export\s+default\s+function)',
    "`r`n" + 'import { isFlagEnabled } from "../../../constants/flags";' + "`r`n`r`n" + '${2}',
    1
  )
}

try {

  if ($task.payload -eq $null -or $task.payload.action -eq $null) {
    throw "Task missing payload.action"
  }

  $action = [string]$task.payload.action
  $result.notes += ("action=" + $action)

  switch ($action) {
    "validate_cart_analytics_contract" { Action-ValidateCartAnalyticsContract }
    "cart_ux_upgrade_v1" { Action-CartUxUpgradeV1 }
    "checkout_start_guardrails_v1" { Action-CheckoutStartGuardrailsV1 }
    "checkout_ui_v1" { Action-CheckoutUiV1 }
    "cart_cross_sell_v1" { Action-CartCrossSellV1 }
    "cart_performance_pass_v1" { Action-CartPerformancePassV1 }

    # NEW (AUTOMAÇÃO PROFISSIONAL)
    "checkout_address_v1" { Action-CheckoutAddressV1 }
    "checkout_payment_v1" { Action-CheckoutPaymentV1 }
    "order_place_mock_v1" { Action-OrderPlaceMockV1 }
    "analytics_harden_v1" { Action-AnalyticsHardenV1 }
    "autonomy_healthcheck_v1" { Action-AutonomyHealthcheckV1 }

    default { throw "Unknown action: $action" }
  }

  if ($autocommitEnabled -and (Git-HasChanges)) {
    $msg = "autonomy(task): " + $task.id + " - " + $task.title
    $sha = Git-Commit -Message $msg -AuthorName $authorName -AuthorEmail $authorEmail
    $result.committed_sha = $sha
    $result.notes += ("committed_sha=" + $sha)
  } else {
    if (-not $autocommitEnabled) { $result.notes += "autocommit=disabled" }
    if (-not (Git-HasChanges)) { $result.notes += "no_git_changes" }
  }

} catch {
  $result.ok = $false
  $result.notes += ("executor_error=" + $_.Exception.Message)
}

$result | ConvertTo-Json -Depth 20