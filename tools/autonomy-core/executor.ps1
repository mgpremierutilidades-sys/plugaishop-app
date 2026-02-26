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

function Get-AppTabsIndexPath() {
  return (Join-Path (Join-Path (Join-Path $RepoRoot "app") "(tabs)") "index.tsx")
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
# Generators
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
# Patch helpers
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

  $bid = [string]$task.payload.backlog.id
  $result.notes += ("backlog_dispatch:id=" + $bid)

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
# Scope guard + Autocommit
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