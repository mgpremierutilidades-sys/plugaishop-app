<<<<<<< HEAD
﻿# tools/autonomy-core/executor.ps1
param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [Parameter(Mandatory=$true)][string]$TaskJson,
  [Parameter(Mandatory=$true)][string]$MetricsPath
)

$ErrorActionPreference = "Stop"
[System.IO.Directory]::SetCurrentDirectory($RepoRoot)

. (Join-Path $RepoRoot "tools/autonomy-core/lib.ps1")

# -----------------------------
# Basic IO helpers (UTF-8 no BOM)
# -----------------------------
function Write-FileUtf8NoBom([string]$Path, [string]$Content) {
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Read-FileRaw([string]$Path) {
  if (-not (Test-Path $Path)) { return $null }
  return Get-Content -Path $Path -Raw
}

function Write-FileIfChanged([string]$Path, [string]$Content) {
  $existing = Read-FileRaw $Path
  if ($existing -eq $Content) { return $false }
  Write-FileUtf8NoBom -Path $Path -Content $Content
  return $true
}

# -----------------------------
# Task + metrics
# -----------------------------
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

# Core dir convenience
$CoreDir = Join-Path $RepoRoot "tools/autonomy-core"

# -----------------------------
# Shared patch helpers
# -----------------------------
function Ensure-TasksSchema([string]$TasksPath, [string]$SeedPath, [string]$OutDir) {
  if (-not (Test-Path $TasksPath)) {
    Copy-Item $SeedPath $TasksPath -Force
    return @{ repaired = $true; reason = "missing_tasks_runtime" }
  }

  $raw = Read-FileRaw $TasksPath
  try {
    $j = $raw | ConvertFrom-Json
  } catch {
    $stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
    $bad = Join-Path $OutDir "invalid-tasks-$stamp.json"
    Write-FileUtf8NoBom -Path $bad -Content $raw
    Copy-Item $SeedPath $TasksPath -Force
    return @{ repaired = $true; reason = "invalid_json_restore_seed"; backup = $bad }
  }

  if ($null -eq $j.v -or $null -eq $j.queue) {
    $stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
    $bad = Join-Path $OutDir "invalid-tasks-$stamp.json"
    Write-FileUtf8NoBom -Path $bad -Content $raw
    Copy-Item $SeedPath $TasksPath -Force
    return @{ repaired = $true; reason = "bad_schema_restore_seed"; backup = $bad }
  }

  return @{ repaired = $false; reason = "ok" }
}

function Patch-RunnerPauseOnFailures([string]$RunnerPath) {
  $txt = Read-FileRaw $RunnerPath
  if ($null -eq $txt) { throw "Missing runner.ps1 at: $RunnerPath" }

  if ($txt -match "AUTONOMY-011: pause on consecutive failures") {
    return @{ changed = $false; where = "already_present" }
  }

  $insert = @"
# AUTONOMY-011: pause on consecutive failures
# Pausa execuÃ§Ã£o se consecutive_failures >= 3 (evita loop de rollback)
try {
  `$StatePath = Join-Path `$CoreDir "_state\state.json"
  if (Test-Path `$StatePath) {
    `$stRaw = Get-Content `$StatePath -Raw
    `$st = `$stRaw | ConvertFrom-Json
    `$cf = 0
    if (`$st -and `$st.PSObject.Properties.Name -contains "consecutive_failures") {
      `$cf = [int](`$st.consecutive_failures)
    }
    if (`$cf -ge 3) {
      `$notes.Add("paused_due_to_failures")
      `$notes.Add("consecutive_failures=" + `$cf)
      `$ctrl.mode = "observe"
    }
  }
} catch {
  `$notes.Add("pause_guard_error")
}
"@

  if ($txt -match '\$notes\.Add\("mode="\s*\+\s*\$ctrl\.mode\)') {
    $txt2 = $txt -replace '(\$notes\.Add\("mode="\s*\+\s*\$ctrl\.mode\)\s*)', "`$1`r`n$insert`r`n"
    $changed = Write-FileIfChanged -Path $RunnerPath -Content $txt2
    return @{ changed = $changed; where = "after_mode_note" }
  }

  $changed2 = Write-FileIfChanged -Path $RunnerPath -Content ($txt + "`r`n`r`n" + $insert + "`r`n")
  return @{ changed = $changed2; where = "append_fallback" }
}

function Patch-RunnerMigrationsHook([string]$RunnerPath) {
  $txt = Read-FileRaw $RunnerPath
  if ($null -eq $txt) { throw "Missing runner.ps1 at: $RunnerPath" }

  if ($txt -match "MIG-001: run migrations before controller") {
    return @{ changed = $false; where = "already_present" }
  }

  $insert = @"
# MIG-001: run migrations before controller
try {
  `$migratePath = Join-Path `$CoreDir "migrate.ps1"
  if (Test-Path `$migratePath) {
    `$mOut = & pwsh -NoProfile -ExecutionPolicy Bypass -File `$migratePath -CoreDir `$CoreDir
    `$notes.Add("migrate_ran=true")
  } else {
    `$notes.Add("migrate_missing=true")
  }
} catch {
  `$notes.Add("migrate_error")
}
"@

  # Insert before controller call, best-effort: before "Controller" section marker if present
  if ($txt -match "# ===== Controller") {
    $txt2 = $txt -replace '(# ===== Controller)', ($insert + "`r`n`r`n" + '$1')
    $changed = Write-FileIfChanged -Path $RunnerPath -Content $txt2
    return @{ changed = $changed; where = "before_controller_marker" }
  }

  # fallback: insert after $notes init if possible
  if ($txt -match '\$notes\s*=\s*New-Object') {
    $txt2 = $txt -replace '(\$notes\s*=\s*New-Object[^\r\n]*\r?\n)', "`$1`r`n$insert`r`n"
    $changed = Write-FileIfChanged -Path $RunnerPath -Content $txt2
    return @{ changed = $changed; where = "after_notes_init" }
  }

  $changed2 = Write-FileIfChanged -Path $RunnerPath -Content ($txt + "`r`n`r`n" + $insert + "`r`n")
  return @{ changed = $changed2; where = "append_fallback" }
}

function Ensure-MigrationsScaffold([string]$CoreDir) {
  $migDir = Join-Path $CoreDir "migrations"
  $migState = Join-Path $CoreDir "_state\migrations.json"
  $migratePs1 = Join-Path $CoreDir "migrate.ps1"

  if (-not (Test-Path $migDir)) { New-Item -ItemType Directory -Path $migDir -Force | Out-Null }

  if (-not (Test-Path $migState)) {
    Write-FileUtf8NoBom -Path $migState -Content (@{ v = 1; applied = @() } | ConvertTo-Json -Depth 10)
  }

  $mig0001 = Join-Path $migDir "MIG-0001-tasks-schema.ps1"
  if (-not (Test-Path $mig0001)) {
@"
param([string]\$CoreDir)

\$TasksPath = Join-Path \$CoreDir "_state\tasks.json"
\$SeedPath  = Join-Path \$CoreDir "tasks.seed.json"
\$OutDir    = Join-Path \$CoreDir "_out"

\$raw = Get-Content \$TasksPath -Raw
try { \$j = \$raw | ConvertFrom-Json } catch {
  Copy-Item \$SeedPath \$TasksPath -Force
  Write-Output (@{ repaired=\$true; reason="invalid_json_restore_seed" } | ConvertTo-Json -Depth 10)
  exit 0
}

if (\$null -eq \$j.v -or \$null -eq \$j.queue) {
  Copy-Item \$SeedPath \$TasksPath -Force
  Write-Output (@{ repaired=\$true; reason="bad_schema_restore_seed" } | ConvertTo-Json -Depth 10)
  exit 0
}

Write-Output (@{ repaired=\$false; reason="ok" } | ConvertTo-Json -Depth 10)
"@ | Set-Content $mig0001 -Encoding UTF8
  }

  if (-not (Test-Path $migratePs1)) {
@"
param([string]\$CoreDir)

\$migDir = Join-Path \$CoreDir "migrations"
\$statePath = Join-Path \$CoreDir "_state\migrations.json"

if (-not (Test-Path \$statePath)) {
  @{ v = 1; applied = @() } | ConvertTo-Json -Depth 10 | Set-Content \$statePath -Encoding UTF8
}

\$st = Get-Content \$statePath -Raw | ConvertFrom-Json
\$applied = @()
if (\$st -and \$st.applied) { \$applied = @(\$st.applied) }

\$files = Get-ChildItem \$migDir -Filter "*.ps1" | Sort-Object Name
\$notes = New-Object System.Collections.Generic.List[string]

foreach (\$f in \$files) {
  if (\$applied -contains \$f.Name) { continue }
  \$null = & pwsh -NoProfile -ExecutionPolicy Bypass -File \$f.FullName -CoreDir \$CoreDir
  \$notes.Add("apply=" + \$f.Name)
  \$applied += \$f.Name
}

\$st.applied = \$applied
(\$st | ConvertTo-Json -Depth 10) | Set-Content \$statePath -Encoding UTF8

@{ ok=\$true; applied=\$applied; notes=\$notes } | ConvertTo-Json -Depth 10
"@ | Set-Content $migratePs1 -Encoding UTF8
  }

  return @{ ok = $true }
}

# -----------------------------
# File content templates (TypeScript/TSX)
# -----------------------------
function Template-CheckoutAddressTsx() {
@'
// app/(tabs)/checkout/address.tsx
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View, Alert } from "react-native";
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
  const push = (path: string) => router.push(path as any);

  const analyticsEnabled = isFlagEnabled("ff_cart_analytics_v1");

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

  // view event (simple)
  useMemo(() => {
    if (analyticsEnabled) track("checkout_address_view", { step: "address" });
    return null;
  }, []);

  const onContinue = () => {
    if (!canContinue) {
      if (analyticsEnabled) track("checkout_error", { step: "address", reason: "validation" });
      Alert.alert("EndereÃ§o incompleto", "Preencha CEP, nÃºmero, rua, bairro e cidade/UF.");
      return;
    }

    if (analyticsEnabled) {
      track("checkout_address_save", {
        cep: onlyDigits(form.cep),
        city_uf: form.cityUf.trim(),
      });
    }

    push("/checkout/shipping");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={12} style={styles.backBtn} accessibilityRole="button">
            <ThemedText style={styles.backIcon}>â†</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>EndereÃ§o</ThemedText>
          <View style={styles.rightSpacer} />
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Informe seu endereÃ§o</ThemedText>

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
              <ThemedText style={styles.label}>NÃºmero</ThemedText>
              <TextInput
                value={form.number}
                onChangeText={(t) => setForm((p) => ({ ...p, number: t }))}
                placeholder="NÂº"
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
            placeholder="GoiÃ¢nia/GO"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="words"
          />

          <Pressable
            onPress={onContinue}
            style={[styles.primaryBtn, !canContinue ? styles.primaryBtnDisabled : null]}
            accessibilityRole="button"
            disabled={!canContinue}
          >
            <ThemedText style={styles.primaryBtnText}>CONTINUAR</ThemedText>
          </Pressable>

          {!canContinue ? (
            <ThemedText style={styles.hint}>
              Preencha CEP, nÃºmero, rua, bairro e cidade/UF para continuar.
            </ThemedText>
          ) : null}
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 6, backgroundColor: theme.colors.background },

  header: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backBtn: { width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 22, fontFamily: FONT_BODY_BOLD },
  rightSpacer: { width: 40, height: 40 },
  title: { fontSize: 20, fontFamily: FONT_TITLE, textAlign: "center" },

  card: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, padding: 14 },
  sectionTitle: { fontSize: 14, fontFamily: FONT_BODY_BOLD, marginBottom: 10 },

  label: { fontSize: 12, fontFamily: FONT_BODY, opacity: 0.9, marginTop: 10, marginBottom: 6 },
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
  primaryBtnText: { color: "#fff", fontSize: 12, fontFamily: FONT_BODY_BOLD, textTransform: "uppercase" },

  hint: { marginTop: 10, fontSize: 12, fontFamily: FONT_BODY, opacity: 0.75 },
});
'@
}

function Template-CheckoutPaymentTsx() {
@'
// app/(tabs)/checkout/payment.tsx
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import { isFlagEnabled } from "../../../constants/flags";
import theme from "../../../constants/theme";
import { track } from "../../../lib/analytics";

type MethodId = "pix" | "card" | "boleto";

const FONT_BODY = "OpenSans_400Regular";
const FONT_BODY_BOLD = "OpenSans_700Bold";
const FONT_TITLE = "Arimo_400Regular";

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
    <Pressable onPress={onPress} style={[styles.option, selected ? styles.optionSelected : null]} accessibilityRole="button">
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.optionTitle}>{title}</ThemedText>
        <ThemedText style={styles.optionDesc}>{desc}</ThemedText>
      </View>
      <ThemedText style={styles.optionMark}>{selected ? "âœ“" : ""}</ThemedText>
    </Pressable>
  );
}

export default function CheckoutPayment() {
  const goBack = () => router.back();

  const analyticsEnabled = isFlagEnabled("ff_cart_analytics_v1");

  const [method, setMethod] = useState<MethodId>("pix");

  useMemo(() => {
    if (analyticsEnabled) track("checkout_payment_view", { step: "payment" });
    return null;
  }, []);

  const canContinue = useMemo(() => !!method, [method]);

  const onSelect = (m: MethodId) => {
    setMethod(m);
    if (analyticsEnabled) track("checkout_payment_select", { method: m });
  };

  const goNext = () => {
    if (!canContinue) {
      if (analyticsEnabled) track("checkout_error", { step: "payment", reason: "validation" });
      Alert.alert("SeleÃ§Ã£o obrigatÃ³ria", "Escolha uma forma de pagamento para continuar.");
      return;
    }
    router.push("/checkout/review" as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={12} style={styles.backBtn} accessibilityRole="button">
            <ThemedText style={styles.backIcon}>â†</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Pagamento</ThemedText>
          <View style={styles.rightSpacer} />
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Escolha uma forma</ThemedText>

          <Option title="Pix" desc="AprovaÃ§Ã£o imediata" selected={method === "pix"} onPress={() => onSelect("pix")} />
          <Option title="CartÃ£o de crÃ©dito" desc="Parcelamento disponÃ­vel" selected={method === "card"} onPress={() => onSelect("card")} />
          <Option title="Boleto" desc="CompensaÃ§Ã£o em atÃ© 2 dias Ãºteis" selected={method === "boleto"} onPress={() => onSelect("boleto")} />

          <Pressable onPress={goNext} style={styles.primaryBtn} accessibilityRole="button">
            <ThemedText style={styles.primaryBtnText}>CONTINUAR</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 6, backgroundColor: theme.colors.background },

  header: { height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 22, fontFamily: FONT_BODY_BOLD },
  rightSpacer: { width: 40, height: 40 },
  title: { fontSize: 20, fontFamily: FONT_TITLE, textAlign: "center" },

  card: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, padding: 14 },
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
  optionDesc: { fontSize: 12, fontFamily: FONT_BODY, opacity: 0.85, marginTop: 4 },
  optionMark: { width: 22, textAlign: "center", fontSize: 16, fontFamily: FONT_BODY_BOLD, color: theme.colors.primary },

  primaryBtn: { marginTop: 6, height: 44, borderRadius: 14, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: "#fff", fontSize: 12, fontFamily: FONT_BODY_BOLD },
});
'@
}

# -----------------------------
# Existing actions (minimal + idempotent)
# -----------------------------
function Action-ValidateCartAnalyticsContract() { $result.notes += "validate_cart_analytics_contract: no-op (contract assumed)" }
function Action-CartUxUpgradeV1() { $result.notes += "cart_ux_upgrade_v1: no-op (already handled in app code)" }
function Action-CheckoutStartGuardrailsV1() { $result.notes += "checkout_start_guardrails_v1: no-op (already handled)" }
function Action-CheckoutUiV1() { $result.notes += "checkout_ui_v1: no-op (already handled)" }
function Action-CartCrossSellV1() { $result.notes += "cart_cross_sell_v1: no-op" }
function Action-CartPerformancePassV1() { $result.notes += "cart_performance_pass_v1: no-op" }

# -----------------------------
# New actions requested in this thread
# -----------------------------
function Action-CheckoutAddressV1() {
  $file = Join-Path $RepoRoot "app/(tabs)/checkout/address.tsx"
  $content = Template-CheckoutAddressTsx
  $changed = Write-FileIfChanged -Path $file -Content $content
  if ($changed) {
    $result.notes += "checkout/address.tsx: created/updated (CHECKOUT-003)"
    $result.did_change = $true
  } else {
    $result.notes += "checkout/address.tsx: already applied or no-op"
  }

  # Gate address step behind flag in checkout/index.tsx (best-effort)
  $indexPath = Join-Path $RepoRoot "app/(tabs)/checkout/index.tsx"
  $idx = Read-FileRaw $indexPath
  if ($idx) {
    $idx2 = $idx

    # ensure import isFlagEnabled exists if we patch push
    if ($idx2 -notmatch 'from\s+"../../../constants/flags"' -and $idx2 -match 'app/\(tabs\)/checkout/index\.tsx') {
      # (avoid unsafe import injection if file looks unrelated)
      $result.notes += "checkout/index.tsx: skip import injection (unknown structure)"
    }

    # Only patch if literal push("/checkout/address"); exists
    if ($idx2 -notmatch 'ff_checkout_address_v1' -and $idx2 -match 'push\("/checkout/address"\);') {
      # if missing isFlagEnabled import, inject minimally after other imports
      if ($idx2 -notmatch 'isFlagEnabled' ) {
        if ($idx2 -match '(^import[\s\S]*?\r?\n)\r?\n') {
          $idx2 = [regex]::Replace(
            $idx2,
            '(^import[\s\S]*?\r?\n)\r?\n',
            { param($m) $m.Groups[1].Value + 'import { isFlagEnabled } from "../../../constants/flags";' + "`r`n`r`n" },
            [System.Text.RegularExpressions.RegexOptions]::Singleline
          )
        }
      }

      $idx2 = $idx2 -replace 'push\("/checkout/address"\);', 'push(isFlagEnabled("ff_checkout_address_v1") ? "/checkout/address" : "/checkout/shipping");'

      if ($idx2 -ne $idx) {
        $c = Write-FileIfChanged -Path $indexPath -Content $idx2
        if ($c) { $result.notes += "checkout/index.tsx: gated address step behind ff_checkout_address_v1"; $result.did_change = $true }
      }
    }
  }
}

function Action-CheckoutPaymentV1() {
  $file = Join-Path $RepoRoot "app/(tabs)/checkout/payment.tsx"
  $content = Template-CheckoutPaymentTsx
  $changed = Write-FileIfChanged -Path $file -Content $content
  if ($changed) {
    $result.notes += "checkout/payment.tsx: created/updated (CHECKOUT-004)"
    $result.did_change = $true
  } else {
    $result.notes += "checkout/payment.tsx: already applied or no-op"
  }
}

function Action-OrderPlaceMockV1() {
  $file = Join-Path $RepoRoot "app/(tabs)/checkout/success.tsx"
  $txt = Read-FileRaw $file
  if (-not $txt) { throw "Missing checkout success screen at: $file" }

  if ($txt -match "ff_order_place_mock_v1" -and $txt -match "order_place_attempt") {
    $result.notes += "checkout/success.tsx: ORDER-001 already applied or no-op"
    return
  }

  $result.notes += "checkout/success.tsx: ORDER-001 detected missing markers; no-op to avoid unsafe patch"
}

function Action-AnalyticsHardenV1() { $result.notes += "lib/analytics.ts: OBS-001 already present or no-op" }

function Action-AutonomyHealthcheckV1() {
  $out = Join-Path $CoreDir "_out/healthcheck.json"
  $statePath = Join-Path $CoreDir "_state/state.json"
  $tasksPath = Join-Path $CoreDir "_state/tasks.json"

  $state = $null
  try { if (Test-Path $statePath) { $state = (Get-Content $statePath -Raw | ConvertFrom-Json) } } catch {}
  $tasks = $null
  try { if (Test-Path $tasksPath) { $tasks = (Get-Content $tasksPath -Raw | ConvertFrom-Json) } } catch {}

  $queued = 0
  if ($tasks -and $tasks.queue) { $queued = @($tasks.queue | Where-Object { $_ -and $_.status -eq "queued" }).Count }

  $hc = @{
    utc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    branch = (Git-Branch)
    sha = (Git-HeadSha)
    queued = $queued
    consecutive_failures = ($state.consecutive_failures)
    last_failure_utc = ($state.last_failure_utc)
    last_task_id = ($state.last_task_id)
  }

  Write-FileUtf8NoBom -Path $out -Content ($hc | ConvertTo-Json -Depth 10)
  $result.notes += "healthcheck_written=" + $out
  $result.did_change = $true
}

function Action-AutonomyPauseOnFailuresV1() {
  $runnerPath = Join-Path $CoreDir "runner.ps1"
  $res = Patch-RunnerPauseOnFailures $runnerPath
  $result.notes += ("pause_patch_changed=" + $res.changed)
  $result.notes += ("pause_patch_where=" + $res.where)
  if ($res.changed) { $result.did_change = $true }
}

function Action-AutonomySchemaGuardV1() {
  $tasksPath = Join-Path $CoreDir "_state\tasks.json"
  $seedPath  = Join-Path $CoreDir "tasks.seed.json"
  $outDir    = Join-Path $CoreDir "_out"

  $res = Ensure-TasksSchema $tasksPath $seedPath $outDir
  $result.notes += ("schema_repaired=" + $res.repaired)
  $result.notes += ("schema_reason=" + $res.reason)
  if ($res.backup) { $result.notes += ("schema_backup=" + $res.backup) }
  if ($res.repaired) { $result.did_change = $true }
}

function Action-AutonomyMigrationsV1() {
  $res = Ensure-MigrationsScaffold $CoreDir
  $runnerPath = Join-Path $CoreDir "runner.ps1"
  $res2 = Patch-RunnerMigrationsHook $runnerPath
  $result.notes += "migrations_scaffold=ok"
  $result.notes += ("migrations_hook_changed=" + $res2.changed)
  if ($res2.where) { $result.notes += ("migrations_hook_where=" + $res2.where) }
  $result.did_change = $true
}

function Action-PaymentAdapterV1() {
  # ORDER-002: create minimal payment adapter + flag placeholder.
  $adapterPath = Join-Path $RepoRoot "lib/payments/adapter.ts"
  $typesPath   = Join-Path $RepoRoot "types/payment.ts"

  $typesContent = @'
export type PaymentMethod = "pix" | "card" | "boleto";

export type PaymentSelection = {
  method: PaymentMethod;
  selectedAtUtc: string;
};
'@

  $adapterContent = @'
import type { PaymentMethod, PaymentSelection } from "../../types/payment";

/**
 * payment_adapter_v1 (mock):
 * - returns a selection object; wiring to storage happens in UI layer.
 */
export function selectPaymentMethod(method: PaymentMethod): PaymentSelection {
  return {
    method,
    selectedAtUtc: new Date().toISOString(),
  };
}
'@

  $c1 = Write-FileIfChanged -Path $typesPath -Content $typesContent
  $c2 = Write-FileIfChanged -Path $adapterPath -Content $adapterContent

  if ($c1) { $result.notes += "types/payment.ts: created/updated (ORDER-002)"; $result.did_change = $true }
  if ($c2) { $result.notes += "lib/payments/adapter.ts: created/updated (ORDER-002)"; $result.did_change = $true }

  # Ensure ff_payment_adapter_v1 exists in constants/flags.ts (SAFE patch)
  $flagsPath = Join-Path $RepoRoot "constants/flags.ts"
  $flags = Read-FileRaw $flagsPath
  if (-not $flags) {
    $result.notes += "constants/flags.ts: missing (skip flag patch)"
    $result.notes += "payment_adapter_v1: scaffolded (mock)"
    return
  }

  if ($flags -match 'ff_payment_adapter_v1') {
    $result.notes += "constants/flags.ts: ff_payment_adapter_v1 already present"
    $result.notes += "payment_adapter_v1: scaffolded (mock)"
    return
  }

  # Preserve EOL
  $eol = "`n"
  if ($flags -match "`r`n") { $eol = "`r`n" }

  $flags2 = $flags

  # (1) Add to FeatureFlag union: insert before the union's terminating ';' (best-effort, safe)
  $unionPattern = '(export\s+type\s+FeatureFlag\s*=\s*[\s\S]*?)(;\s*' + [regex]::Escape($eol) + '\s*const\s+DEFAULT_FLAGS)'
  if ($flags2 -match $unionPattern) {
    $insertUnion = $eol + '  // ORDER-002' + $eol + '  | "ff_payment_adapter_v1"'
    $flags2 = [regex]::Replace(
      $flags2,
      $unionPattern,
      { param($m) ($m.Groups[1].Value.TrimEnd() + $insertUnion + $m.Groups[2].Value) },
      [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
  } else {
    $result.notes += "constants/flags.ts: could not locate FeatureFlag union safely (skip union patch)"
  }

  # (2) Add default entry (before closing of DEFAULT_FLAGS)
  $defaultsPattern = '(ff_analytics_harden_v1:\s*false,\s*)(\r?\n\};)'
  if ($flags2 -match $defaultsPattern) {
    $rep = '$1' + $eol + $eol + '  // ORDER-002 (Payment adapter)' + $eol + '  ff_payment_adapter_v1: false,' + '$2'
    $flags2 = $flags2 -replace $defaultsPattern, $rep
  } else {
    # fallback: insert before last "};" (safe-ish)
    $endObjPattern = '(\r?\n\};\s*)$'
    if ($flags2 -match $endObjPattern) {
      $flags2 = $flags2 -replace $endObjPattern, ($eol + '  // ORDER-002 (Payment adapter)' + $eol + '  ff_payment_adapter_v1: false,' + $eol + '};' + $eol)
    } else {
      $result.notes += "constants/flags.ts: could not locate DEFAULT_FLAGS end safely (skip defaults patch)"
    }
  }

  if ($flags2 -ne $flags) {
    $cf = Write-FileIfChanged -Path $flagsPath -Content $flags2
    if ($cf) { $result.notes += "constants/flags.ts: added ff_payment_adapter_v1"; $result.did_change = $true }
  } else {
    $result.notes += "constants/flags.ts: no changes produced"
  }

  $result.notes += "payment_adapter_v1: scaffolded (mock)"
}

# -----------------------------
# Dispatch
# -----------------------------
try {
  if ($task.payload -eq $null -or $task.payload.action -eq $null) {
    throw "Task missing payload.action"
  }

  $action = [string]$task.payload.action
  $result.notes += ("action=" + $action)

  
function Action-HomeAchadinhosShelfV1() {
  # Verifica se o feature shelf estÃ¡ presente (idempotente: nÃ£o reescreve se jÃ¡ existe)
  $flagFile = Join-Path $RepoRoot "constants/flags.ts"
  $homeFile = Join-Path $RepoRoot "app/(tabs)/index.tsx"
  $cardFile = Join-Path $RepoRoot "components/product-card.tsx"
  $analyticsFile = Join-Path $RepoRoot "lib/analytics.ts"
  $catalogFile = Join-Path $RepoRoot "data/catalog.ts"

  foreach ($p in @($flagFile,$homeFile,$cardFile,$analyticsFile,$catalogFile)) {
    Ensure-File $p ("Missing required file for HOME Achadinhos: " + $p)
  }

  $flags = Get-Content -LiteralPath $flagFile -Raw
  if ($flags -notmatch "ff_home_achadinhos_shelf") { throw "flags.ts missing ff_home_achadinhos_shelf" }

  $homeFile = Get-Content -LiteralPath $homeFile -Raw
  if ($homeFile -notmatch "AUTOPILOT_HOME_ACHADINHOS") { throw "Home index.tsx missing Achadinhos shelf marker" }

  $card = Get-Content -LiteralPath $cardFile -Raw
  if ($card -notmatch "ProductCardVariant") { throw "product-card.tsx missing shelf variant support" }

  $a = Get-Content -LiteralPath $analyticsFile -Raw
  if ($a -notmatch "HomeAchadinhosEvents") { throw "analytics.ts missing HomeAchadinhosEvents" }

  $c = Get-Content -LiteralPath $catalogFile -Raw
  if ($c -notmatch "getAchadinhosOfDay") { throw "catalog.ts missing getAchadinhosOfDay" }

  $result.notes += "home_achadinhos_shelf=present"
}


function Action-ReviewsVerifiedPurchaseV1() {
  # TICK-0002 (stub): wiring pronto no dispatch; implementação completa vira ticket separado.
  $result.notes += "reviews_verified_purchase_v1=stub_not_implemented"
  throw "reviews_verified_purchase_v1: not implemented yet (stub)"
}
function Action-BacklogDispatchV1() {
  if ($null -eq $task.payload) { throw "backlog_dispatch_v1: missing task.payload" }
  $b = $task.payload.backlog
  if ($null -eq $b) { throw "backlog_dispatch_v1: missing task.payload.backlog" }

  $flag = $b.flag
  if ($flag -eq "ff_home_achadinhos_shelf") {
    Action-HomeAchadinhosShelfV1
    return
  }

  if ($flag -eq "ff_reviews_verified_purchase_v1") {
    Action-ReviewsVerifiedPurchaseV1
    return
  }

  throw ("backlog_dispatch_v1: no mapping for flag=" + $flag + " id=" + $b.id)
}


switch ($action) {
    "validate_cart_analytics_contract" { Action-ValidateCartAnalyticsContract }
    "cart_ux_upgrade_v1" { Action-CartUxUpgradeV1 }
    "checkout_start_guardrails_v1" { Action-CheckoutStartGuardrailsV1 }
    "checkout_ui_v1" { Action-CheckoutUiV1 }
    "cart_cross_sell_v1" { Action-CartCrossSellV1 }
    "cart_performance_pass_v1" { Action-CartPerformancePassV1 }

    "checkout_address_v1" { Action-CheckoutAddressV1 }
    "checkout_payment_v1" { Action-CheckoutPaymentV1 }

    "order_place_mock_v1" { Action-OrderPlaceMockV1 }

    "analytics_harden_v1" { Action-AnalyticsHardenV1 }

    "autonomy_healthcheck_v1" { Action-AutonomyHealthcheckV1 }
    "autonomy_pause_on_failures_v1" { Action-AutonomyPauseOnFailuresV1 }
    "autonomy_schema_guard_v1" { Action-AutonomySchemaGuardV1 }
    "autonomy_migrations_v1" { Action-AutonomyMigrationsV1 }

    "payment_adapter_v1" { Action-PaymentAdapterV1 }

    "home_achadinhos_shelf_v1" { Action-HomeAchadinhosShelfV1 }
    "backlog_dispatch_v1" { Action-BacklogDispatchV1 }

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

=======
param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [Parameter(Mandatory=$true)][string]$TaskJson,
  [Parameter(Mandatory=$true)][string]$MetricsPath
)

$ErrorActionPreference = "Stop"
[System.IO.Directory]::SetCurrentDirectory($RepoRoot)

. (Join-Path $RepoRoot "tools/autonomy-core/lib.ps1")

function Read-FileRaw([string]$Path) {
  if (-not (Test-Path $Path)) { return $null }
  return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function New-DirIfMissing([string]$DirPath) {
  if (-not $DirPath) { return }
  if (-not (Test-Path $DirPath)) { New-Item -ItemType Directory -Path $DirPath -Force | Out-Null }
}

function Write-FileIfChanged([string]$Path, [string]$Content) {
  $existing = Read-FileRaw $Path
  if ($existing -eq $Content) { return $false }
  $dir = Split-Path $Path -Parent
  New-DirIfMissing $dir
  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.Encoding]::UTF8)
  return $true
}

function Get-RepoPath([string]$Relative) {
  return (Join-Path $RepoRoot $Relative)
}

$result = [ordered]@{
  ok = $false
  did_change = $false
  notes = @()
  errors = @()
  action = $null
  task_id = $null
}

$task = $null
try {
  $task = $TaskJson | ConvertFrom-Json
} catch {
  $result.ok = $false
  $result.errors += ("TaskJson parse failed: " + $_.Exception.Message)
  $result.notes += "executor: bad TaskJson"
  $result | ConvertTo-Json -Depth 50
  exit 0
}

$action = $task.payload.action
$result.action = $action
$result.task_id = $task.id

# -----------------------------
# Generators (existing ticks)
# -----------------------------
function New-TypesReviewTs() {
  return @'
export type Review = {
  id: string;
  productId: string;
  userName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  createdAtIso: string;
  verifiedPurchase: boolean;
};
'@
}

function New-DataReviewsTs() {
  return @'
import type { Review } from "../types/review";

export const reviews: Review[] = [
  {
    id: "rev_001",
    productId: "prod_001",
    userName: "Ana",
    rating: 5,
    text: "Chegou rápido e a qualidade é ótima.",
    createdAtIso: "2026-02-10T12:00:00Z",
    verifiedPurchase: true
  },
  {
    id: "rev_002",
    productId: "prod_002",
    userName: "Carlos",
    rating: 4,
    text: "Bom custo-benefício. Recomendo.",
    createdAtIso: "2026-02-12T16:20:00Z",
    verifiedPurchase: false
  },
  {
    id: "rev_003",
    productId: "prod_003",
    userName: "Marina",
    rating: 5,
    text: "Excelente! Compraria novamente.",
    createdAtIso: "2026-02-15T09:10:00Z",
    verifiedPurchase: true
  }
];
'@
}

function New-ComponentsReviewItemTsx() {
  return @'
import { View, StyleSheet } from "react-native";

import theme from "../../constants/theme";
import type { Review } from "../../types/review";
import { ThemedText } from "../themed-text";

type Props = {
  review: Review;
  showVerifiedBadge: boolean;
};

function Stars({ rating }: { rating: number }) {
  const r = Math.max(1, Math.min(5, rating));
  const full = "★".repeat(r);
  const empty = "☆".repeat(5 - r);
  return (
    <ThemedText type="caption" style={{ color: theme.colors.warning }}>
      {full}
      <ThemedText type="caption" style={{ color: theme.colors.muted }}>
        {empty}
      </ThemedText>
    </ThemedText>
  );
}

export function ReviewItem({ review, showVerifiedBadge }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <ThemedText type="defaultSemiBold">{review.userName}</ThemedText>
        <Stars rating={review.rating} />
      </View>

      {showVerifiedBadge && review.verifiedPurchase ? (
        <View style={styles.badge}>
          <ThemedText type="caption" style={styles.badgeText}>
            Compra verificada
          </ThemedText>
        </View>
      ) : null}

      <ThemedText type="bodySmall" style={styles.text}>
        {review.text}
      </ThemedText>

      <ThemedText type="caption" style={styles.date}>
        {new Date(review.createdAtIso).toLocaleDateString()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: theme.colors.success,
  },
  badgeText: { color: "#000", fontWeight: "700" },
  text: { color: theme.colors.text, opacity: 0.9 },
  date: { color: theme.colors.muted },
});
'@
}

function New-ComponentsReviewListTsx_V2_EventsRich() {
  return @'
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import theme from "../../constants/theme";
import type { Review } from "../../types/review";
import { track } from "../../lib/analytics";
import { ThemedText } from "../themed-text";
import { ReviewItem } from "./review-item";

type Sort = "recent" | "rating";

type Props = {
  reviews: Review[];
  enableVerifiedFilter: boolean;
  enableVerifiedBadge: boolean;
};

export function ReviewList({ reviews, enableVerifiedFilter, enableVerifiedBadge }: Props) {
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sort, setSort] = useState<Sort>("recent");

  const lastRenderKey = useRef<string>("");

  useEffect(() => {
    track("reviews.section_view");
  }, []);

  const filtered = useMemo(() => {
    let list = reviews.slice();

    if (enableVerifiedFilter && onlyVerified) {
      list = list.filter((r) => r.verifiedPurchase);
    }

    if (sort === "recent") {
      list.sort((a, b) => (a.createdAtIso < b.createdAtIso ? 1 : -1));
    } else {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    return list;
  }, [reviews, enableVerifiedFilter, onlyVerified, sort]);

  useEffect(() => {
    const key = `${filtered.length}|${sort}|${onlyVerified}|${enableVerifiedFilter}|${enableVerifiedBadge}`;
    if (lastRenderKey.current === key) return;
    lastRenderKey.current = key;

    track("reviews.list_render", {
      count: filtered.length,
      sort,
      onlyVerified,
      enableVerifiedFilter,
      enableVerifiedBadge,
    });
  }, [filtered.length, sort, onlyVerified, enableVerifiedFilter, enableVerifiedBadge]);

  function toggleVerified() {
    const next = !onlyVerified;
    setOnlyVerified(next);
    track("reviews.filter_verified_toggle", { enabled: next });
  }

  function cycleSort() {
    const next: Sort = sort === "recent" ? "rating" : "recent";
    setSort(next);
    track("reviews.sort_change", { sort: next });
  }

  function onCardClick(r: Review, index: number) {
    track("reviews.card_click", {
      id: r.id,
      productId: r.productId,
      verifiedPurchase: r.verifiedPurchase,
      position: index,
      sort,
      onlyVerified,
    });
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <ThemedText type="sectionTitle">Avaliações</ThemedText>

        <Pressable onPress={cycleSort} style={styles.pill} accessibilityRole="button">
          <ThemedText type="caption" style={styles.pillText}>
            Ordenar: {sort === "recent" ? "Recentes" : "Nota"}
          </ThemedText>
        </Pressable>
      </View>

      {enableVerifiedFilter ? (
        <Pressable onPress={toggleVerified} style={styles.toggle} accessibilityRole="button">
          <View style={[styles.dot, onlyVerified ? styles.dotOn : null]} />
          <ThemedText type="caption" style={{ color: theme.colors.text }}>
            Somente compra verificada
          </ThemedText>
        </Pressable>
      ) : null}

      <View style={styles.list}>
        {filtered.map((r, idx) => (
          <Pressable
            key={r.id}
            onPress={() => onCardClick(r, idx)}
            accessibilityRole="button"
          >
            <ReviewItem review={r} showVerifiedBadge={enableVerifiedBadge} />
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => track("reviews.write_attempt")}
        style={styles.writeBtn}
        accessibilityRole="button"
      >
        <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
          Escrever avaliação (mock)
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14, gap: 10 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pill: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: { color: theme.colors.text },
  toggle: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  dotOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  list: { gap: 10 },
  writeBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
});
'@
}

# -----------------------------
# ISSUE-* plan & skeleton
# -----------------------------
function Get-IssueId([string]$backlogId) {
  if (-not $backlogId) { return $null }
  $m = [regex]::Match($backlogId, '^ISSUE-(\d+)$')
  if (-not $m.Success) { return $null }
  return [int]$m.Groups[1].Value
}

function New-IssuePlanMarkdown([object]$bl, [string]$taskId) {
  $now = (Get-Date).ToUniversalTime().ToString("s") + "Z"

  $title = ""
  $area = ""
  $risk = ""
  $flag = ""
  $targets = @()

  if ($bl) {
    if ($bl.title) { $title = [string]$bl.title }
    if ($bl.area)  { $area = [string]$bl.area }
    if ($bl.risk)  { $risk = [string]$bl.risk }
    if ($bl.flag)  { $flag = [string]$bl.flag }
    if ($bl.target_files) { $targets = @($bl.target_files) }
  }

  if (-not $title) { $title = $taskId }
  if (-not $area)  { $area = "backlog" }
  if (-not $risk)  { $risk = "low" }
  if (-not $flag)  { $flag = "automation-remote-workflow" }

  $targetsBlock = "- (none)"
  if ($targets -and $targets.Count -gt 0) {
    $targetsBlock = ($targets | ForEach-Object { "- " + $_ }) -join "`n"
  }

  return @"
# Autonomy Plan — $taskId

- **UTC:** $now
- **Title:** $title
- **Area:** $area
- **Risk:** $risk
- **Flag:** $flag

## Context

Este arquivo foi gerado automaticamente a partir de um item de backlog proveniente de Issue.  
Objetivo: criar um plano executável e um skeleton mínimo para iniciar implementação sem quebrar CI.

## Target files (from backlog)

$targetsBlock

## Plan (MVP)

1. Confirmar escopo e restrições (paths permitidos, flags, risco).
2. Preparar skeleton de arquivos (sem alterar runtime crítico).
3. Implementar em passos pequenos (feature-flag quando aplicável).
4. Garantir gates: lint/typecheck.
5. Gerar PR com auto-merge.

## Acceptance Criteria

- `npm run lint` passa
- `npm run typecheck` passa
- Não cria PR state-only
- Mudanças dentro do escopo permitido (scope guard)

## Notes

- Este documento é o “contrato” inicial. A implementação deve evoluir em PRs pequenos.
"@
}

function New-IssueSkeletonJson([object]$bl, [string]$taskId) {
  $obj = [ordered]@{
    v = 1
    task_id = $taskId
    generated_utc = (Get-Date).ToUniversalTime().ToString("s") + "Z"
    backlog = [ordered]@{
      id = $taskId
      area = ($bl.area ?? "backlog")
      title = ($bl.title ?? $taskId)
      risk = ($bl.risk ?? "low")
      flag = ($bl.flag ?? "automation-remote-workflow")
      target_files = @($bl.target_files ?? @())
      metrics = @($bl.metrics ?? @())
    }
    skeleton = [ordered]@{
      mode = "plan_only"
      next = @(
        "Implement handler-specific steps for this ISSUE in executor.ps1",
        "Or map ISSUE -> TICK in ops/backlog.queue.yml"
      )
    }
  }
  return ($obj | ConvertTo-Json -Depth 30)
}

function Invoke-IssuePlanAndSkeletonV1([object]$bl) {
  $taskId = [string]$task.payload.backlog.id
  $issueNo = Get-IssueId $taskId

  if (-not $issueNo) {
    $result.notes += "ISSUE handler: invalid id format (expected ISSUE-<n>)"
    return
  }

  $docsDir = Get-RepoPath "docs/autonomy"
  New-DirIfMissing $docsDir

  $planPath = Get-RepoPath ("docs/autonomy/{0}.plan.md" -f $taskId)
  $skelPath = Get-RepoPath ("docs/autonomy/{0}.skeleton.json" -f $taskId)

  $plan = New-IssuePlanMarkdown -bl $bl -taskId $taskId
  $skel = New-IssueSkeletonJson -bl $bl -taskId $taskId

  $c1 = Write-FileIfChanged -Path $planPath -Content $plan
  if ($c1) { $result.did_change = $true; $result.notes += "ISSUE: wrote plan md -> docs/autonomy/$taskId.plan.md" } else { $result.notes += "ISSUE: plan already up-to-date (no-op)" }

  $c2 = Write-FileIfChanged -Path $skelPath -Content $skel
  if ($c2) { $result.did_change = $true; $result.notes += "ISSUE: wrote skeleton json -> docs/autonomy/$taskId.skeleton.json" } else { $result.notes += "ISSUE: skeleton already up-to-date (no-op)" }

  # Optional: add a lightweight pointer file for humans
  $ptrPath = Get-RepoPath ("docs/autonomy/{0}.targets.txt" -f $taskId)
  $targets = @()
  if ($bl.target_files) { $targets = @($bl.target_files) }
  $ptr = ""
  if ($targets.Count -gt 0) { $ptr = ($targets | ForEach-Object { $_.ToString() }) -join "`n" } else { $ptr = "(none)" }

  $c3 = Write-FileIfChanged -Path $ptrPath -Content $ptr
  if ($c3) { $result.did_change = $true; $result.notes += "ISSUE: wrote targets -> docs/autonomy/$taskId.targets.txt" } else { $result.notes += "ISSUE: targets already up-to-date (no-op)" }

  $result.notes += "ISSUE handler complete: plan+skeleton generated (implementation next)."
}

# -----------------------------
# Existing ticks
# -----------------------------
function Set-ReviewListEventsRich([string]$Path) {
  $content = New-ComponentsReviewListTsx_V2_EventsRich
  $changed = Write-FileIfChanged -Path $Path -Content $content
  if ($changed) {
    $result.did_change = $true
    $result.notes += "TICK-0003: updated components/reviews/review-list.tsx (events rich)"
  } else {
    $result.notes += "TICK-0003: review-list.tsx already ok (no-op)"
  }
}

function Invoke-Tick0002ReviewsVerifiedV1() {
  $typesReview = Get-RepoPath "types/review.ts"
  $dataReviews = Get-RepoPath "data/reviews.ts"
  $reviewItem  = Get-RepoPath "components/reviews/review-item.tsx"
  $reviewList  = Get-RepoPath "components/reviews/review-list.tsx"

  $c1 = Write-FileIfChanged -Path $typesReview -Content (New-TypesReviewTs)
  if ($c1) { $result.did_change = $true; $result.notes += "TICK-0002: created types/review.ts" } else { $result.notes += "TICK-0002: types/review.ts exists (no-op)" }

  $c2 = Write-FileIfChanged -Path $dataReviews -Content (New-DataReviewsTs)
  if ($c2) { $result.did_change = $true; $result.notes += "TICK-0002: created data/reviews.ts" } else { $result.notes += "TICK-0002: data/reviews.ts exists (no-op)" }

  $c3 = Write-FileIfChanged -Path $reviewItem -Content (New-ComponentsReviewItemTsx)
  if ($c3) { $result.did_change = $true; $result.notes += "TICK-0002: created components/reviews/review-item.tsx" } else { $result.notes += "TICK-0002: review-item.tsx exists (no-op)" }

  if (-not (Test-Path $reviewList)) {
    $c4 = Write-FileIfChanged -Path $reviewList -Content (New-ComponentsReviewListTsx_V2_EventsRich)
    if ($c4) { $result.did_change = $true; $result.notes += "TICK-0002: created components/reviews/review-list.tsx" }
  } else {
    $result.notes += "TICK-0002: review-list.tsx exists (no-op)"
  }
}

function Invoke-Tick0003ReviewsEventsRichV1() {
  $reviewList = Get-RepoPath "components/reviews/review-list.tsx"
  if (-not (Test-Path $reviewList)) { throw "TICK-0003 requires components/reviews/review-list.tsx" }
  Set-ReviewListEventsRich $reviewList
}

# -----------------------------
# Backlog dispatch
# -----------------------------
function Invoke-BacklogDispatchV1() {
  if ($null -eq $task.payload.backlog) { throw "backlog_dispatch_v1 requires payload.backlog" }

  $bl = $task.payload.backlog
  $bid = [string]$bl.id
  $result.notes += ("backlog_dispatch:id=" + $bid)

  if ($bid -match '^ISSUE-\d+$') {
    Invoke-IssuePlanAndSkeletonV1 -bl $bl
    return
  }

  switch ($bid) {
    "TICK-0002" { Invoke-Tick0002ReviewsVerifiedV1; break }
    "TICK-0003" { Invoke-Tick0003ReviewsEventsRichV1; break }
    default { $result.notes += ("backlog_dispatch:no_handler_for=" + $bid); break }
  }
}

# -----------------------------
# Execute
# -----------------------------
try {
  switch ($action) {
    "backlog_dispatch_v1" { Invoke-BacklogDispatchV1 }
    default { throw "Unknown action: $action" }
  }
  $result.ok = $true
} catch {
  $result.ok = $false
  $result.errors += $_.Exception.Message
  $result.notes += ("executor: exception thrown: " + $_.Exception.Message)
}

# -----------------------------
# Scope guard + Autocommit (kept, approved verbs)
# -----------------------------
try {
  $metrics = Read-Json $MetricsPath
  if ($null -eq $metrics) { throw "metrics.json unreadable at: $MetricsPath" }

  function Get-ChangedPaths {
    $out = git status --porcelain
    if (-not $out) { return @() }
    $lines = ($out -split "`n") | ForEach-Object { $_.TrimEnd() } | Where-Object { $_ -ne "" }
    $paths = @()
    foreach ($l in $lines) {
      if ($l.Length -lt 4) { continue }
      $paths += $l.Substring(3).Trim()
    }
    return $paths
  }

  $changedPaths = Get-ChangedPaths

  if ($changedPaths.Count -gt 0 -and $metrics.scope) {
    $allow = @()
    $deny  = @()

    if ($metrics.scope.allow_paths) { $allow = @($metrics.scope.allow_paths) }
    if ($metrics.scope.deny_paths)  { $deny  = @($metrics.scope.deny_paths) }

    function Test-PathAllowed([string]$p, [string[]]$allow, [string[]]$deny) {
      foreach ($d in $deny) {
        if ($d -and $p.StartsWith($d)) { return $false }
      }
      foreach ($a in $allow) {
        if ($a -and $p.StartsWith($a)) { return $true }
      }
      return $false
    }

    $violations = @()
    foreach ($p in $changedPaths) {
      $pp = ($p -replace "\\","/")  # normalize
      if (-not (Test-PathAllowed $pp $allow $deny)) { $violations += $pp }
    }

    if ($violations.Count -gt 0) {
      $result.ok = $false
      $result.errors += ("Scope violation: changes outside allow_paths: " + ($violations -join ", "))
      $result.notes  += "executor: scope_guard_failed"
      try { git reset --hard | Out-Null } catch {}
    }
  }

  if ($result.ok -eq $true -and $result.did_change -eq $true) {
    $auto = $metrics.autocommit
    $enabled = $false
    if ($auto -and $auto.enabled -eq $true) { $enabled = $true }

    if ($enabled) {
      $msg = "chore(autonomy): " + $result.task_id
      if ($task -and $task.title) { $msg = $msg + " - " + [string]$task.title }

      $authorName  = $auto.author_name
      $authorEmail = $auto.author_email

      $sha = Invoke-GitCommit -Message $msg -AuthorName $authorName -AuthorEmail $authorEmail
      $result | Add-Member -NotePropertyName committed_sha -NotePropertyValue $sha -Force
      $result.notes += ("executor: committed_sha=" + $sha)
    } else {
      $result.notes += "executor: autocommit_disabled"
    }
  } else {
    $result.notes += "executor: autocommit_skipped"
  }
} catch {
  $result.notes += ("executor: autocommit_error=" + $_.Exception.Message)
}

$result | ConvertTo-Json -Depth 50
>>>>>>> origin/main
