# tools/autonomy-core/executor.ps1
param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  # runner.ps1 passes JSON string (NOT file path)
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

function Get-AppTabsIndexPath() {
  return (Join-Path (Join-Path (Join-Path $RepoRoot "app") "(tabs)") "index.tsx")
}

function Get-RepoPath([string]$Relative) {
  return (Join-Path $RepoRoot $Relative)
}

# -------- result contract --------
$result = [ordered]@{
  ok = $false
  did_change = $false
  notes = @()
  errors = @()
  action = $null
  task_id = $null
}

# -------- parse task json string --------
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
# Generators (single-quoted here-strings to avoid ${...} expansion)
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

function New-ComponentsReviewListTsx() {
  return @'
import { useEffect, useMemo, useState } from "react";
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
        {filtered.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => track("reviews.badge_impression", { id: r.id })}
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
# Patch helpers (idempotent) - approved verbs
# -----------------------------
function Set-FlagInFlagsTs([string]$FlagsPath) {
  $txt = Read-FileRaw $FlagsPath
  if (-not $txt) { throw "Missing flags.ts at: $FlagsPath" }

  if ($txt -match "ff_reviews_verified_purchase_v1") {
    $result.notes += "TICK-0002: flags.ts already contains ff_reviews_verified_purchase_v1 (no-op)"
    return $false
  }

  $txt2 = $txt

  $txt2 = [regex]::Replace(
    $txt2,
    "(\|\s*`"ff_cart_persist_v1`")\s*;",
    '$1' + "`r`n  | `"ff_reviews_verified_purchase_v1`";",
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  if ($txt2 -match "const\s+DEFAULT_FLAGS") {
    $txt2 = [regex]::Replace(
      $txt2,
      "(\s*ff_cart_persist_v1:\s*true,\s*)(\r?\n\};)",
      '$1' + "`r`n  // rollout`r`n  ff_reviews_verified_purchase_v1: false,`r`n$2",
      [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
  }

  $changed = Write-FileIfChanged -Path $FlagsPath -Content $txt2
  if ($changed) {
    $result.did_change = $true
    $result.notes += "TICK-0002: flags.ts updated (added ff_reviews_verified_purchase_v1 default=false)"
    return $true
  }

  $result.notes += "TICK-0002: flags.ts patch no-op"
  return $false
}

function Set-HomeReviewsSection([string]$HomePath) {
  $txt = Read-FileRaw $HomePath
  if (-not $txt) { throw "Missing home index at: $HomePath" }

  if ($txt -match "components/reviews/review-list" -and $txt -match "<ReviewList") {
    $result.notes += "TICK-0002: home already has ReviewList section (no-op)"
    return $false
  }

  $txt2 = $txt

  if ($txt2 -notmatch 'from "\.\./\.\./components/reviews/review-list"') {
    $txt2 = $txt2 -replace 'import \{ ThemedView \} from "\.\./\.\./components/themed-view";',
      "import { ThemedView } from `"../../components/themed-view`";`r`nimport { ReviewList } from `"../../components/reviews/review-list`";"
  }
  if ($txt2 -notmatch 'from "\.\./\.\./data/reviews"') {
    $txt2 = $txt2 -replace 'import \{ categories, products \} from "\.\./\.\./constants/products";',
      "import { categories, products } from `"../../constants/products`";`r`nimport { reviews } from `"../../data/reviews`";"
  }
  if ($txt2 -notmatch 'from "\.\./\.\./constants/flags"') {
    $txt2 = $txt2 -replace 'import \{ categories, products \} from "\.\./\.\./constants/products";',
      "import { categories, products } from `"../../constants/products`";`r`nimport { isFlagEnabled } from `"../../constants/flags`";"
  }

  if ($txt2 -notmatch "const ffVerified") {
    $txt2 = $txt2 -replace "(\}\s*\)\;\s*\r?\n\r?\n\s*return\s*\()",
      "});`r`n`r`n  const ffVerified = isFlagEnabled(`"ff_reviews_verified_purchase_v1`");`r`n`r`n  return ("
  }

  $needle = "</ThemedView>`r`n`r`n        <ThemedView style={styles.searchSection}>"
  if ($txt2 -match [regex]::Escape($needle)) {
    $insert = @"
</ThemedView>

        {/* Reviews (TICK-0002) */}
        <ThemedView>
          <ReviewList
            reviews={reviews}
            enableVerifiedFilter={ffVerified}
            enableVerifiedBadge={ffVerified}
          />
        </ThemedView>

        <ThemedView style={styles.searchSection}>
"@
    $txt2 = $txt2 -replace [regex]::Escape($needle), $insert
  } else {
    $result.notes += "TICK-0002: home insertion point not found; no-op (safe)"
    return $false
  }

  $changed = Write-FileIfChanged -Path $HomePath -Content $txt2
  if ($changed) {
    $result.did_change = $true
    $result.notes += "TICK-0002: home updated (ReviewList section + imports)"
    return $true
  }

  $result.notes += "TICK-0002: home patch no-op"
  return $false
}

# -----------------------------
# TICK-0002 handler
# -----------------------------
function Invoke-Tick0002ReviewsVerifiedV1() {
  $typesReview = Get-RepoPath "types/review.ts"
  $dataReviews = Get-RepoPath "data/reviews.ts"
  $reviewItem  = Get-RepoPath "components/reviews/review-item.tsx"
  $reviewList  = Get-RepoPath "components/reviews/review-list.tsx"
  $flagsPath   = Get-RepoPath "constants/flags.ts"
  $homePath    = Get-AppTabsIndexPath

  $c1 = Write-FileIfChanged -Path $typesReview -Content (New-TypesReviewTs)
  if ($c1) { $result.did_change = $true; $result.notes += "TICK-0002: created types/review.ts" } else { $result.notes += "TICK-0002: types/review.ts exists (no-op)" }

  $c2 = Write-FileIfChanged -Path $dataReviews -Content (New-DataReviewsTs)
  if ($c2) { $result.did_change = $true; $result.notes += "TICK-0002: created data/reviews.ts" } else { $result.notes += "TICK-0002: data/reviews.ts exists (no-op)" }

  $c3 = Write-FileIfChanged -Path $reviewItem -Content (New-ComponentsReviewItemTsx)
  if ($c3) { $result.did_change = $true; $result.notes += "TICK-0002: created components/reviews/review-item.tsx" } else { $result.notes += "TICK-0002: review-item.tsx exists (no-op)" }

  $c4 = Write-FileIfChanged -Path $reviewList -Content (New-ComponentsReviewListTsx)
  if ($c4) { $result.did_change = $true; $result.notes += "TICK-0002: created components/reviews/review-list.tsx" } else { $result.notes += "TICK-0002: review-list.tsx exists (no-op)" }

  $null = Set-FlagInFlagsTs $flagsPath
  $null = Set-HomeReviewsSection $homePath
}

# -----------------------------
# Backlog dispatch
# -----------------------------
function Invoke-BacklogDispatchV1() {
  if ($null -eq $task.payload.backlog) { throw "backlog_dispatch_v1 requires payload.backlog" }

  $bid = [string]$task.payload.backlog.id
  $result.notes += ("backlog_dispatch:id=" + $bid)

  switch ($bid) {
    "TICK-0002" { Invoke-Tick0002ReviewsVerifiedV1; break }
    default {
      $result.notes += ("backlog_dispatch:no_handler_for=" + $bid)
      break
    }
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

$result | ConvertTo-Json -Depth 50