"""Paper 1 figures, generated only from frozen artifacts.

    python3 figures/scripts/make_x1_figures.py

Reads engine/src/data/welfare-review-x1.json (zero-call X1 audit),
engine/src/data/welfare-review-x2.json (zero-call X2 boundary audit) and the
frozen W-RG trace; writes vector PDFs into figures/ and paper/figures/. No model
call, no hand-entered number.

Main-text figures are drawn at the AAMAS text width (7.0 in) without tight
cropping, so they are included at \\textwidth with scale 1 and every in-figure
label keeps its nominal size (>= 7.5 pt).
"""
import json
import pathlib

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.colors import LinearSegmentedColormap  # noqa: E402
from matplotlib.lines import Line2D  # noqa: E402
from matplotlib.patches import Rectangle  # noqa: E402
from matplotlib.transforms import blended_transform_factory  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = ROOT / "engine" / "src" / "data"
OUT = [ROOT / "figures", ROOT / "paper" / "figures"]

X1 = json.loads((DATA / "welfare-review-x1.json").read_text())
X2 = json.loads((DATA / "welfare-review-x2.json").read_text())
WRG = json.loads((DATA / "welfare-role-channel.json").read_text())

# Reference palette (validated with the dataviz validator, light mode: adjacent CVD
# dE >= 9.1; aqua and yellow sit below 3:1 contrast, so every series is also
# direct-labeled and carries its own marker shape and line style).
BLUE, ORANGE, AQUA, YELLOW, RED = "#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e34948"
INK, INK2, MUTED, GRID, AXIS = "#0b0b0b", "#52514e", "#898781", "#e1e0d9", "#c3c2b7"
NEUTRAL_BG = "#f0efec"
SEQ = ["#f4f8fd", "#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"]

TEXTWIDTH_IN = 7.0
FS = 8.0      # body text in figures
FS_SMALL = 7.5

plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": FS, "axes.titlesize": 8.5, "axes.labelsize": FS,
    "xtick.labelsize": FS, "ytick.labelsize": FS, "axes.edgecolor": AXIS, "axes.labelcolor": INK2,
    "xtick.color": INK2, "ytick.color": INK2, "axes.linewidth": 0.6, "pdf.fonttype": 42,
    "figure.facecolor": "white", "axes.facecolor": "white", "legend.fontsize": FS_SMALL,
})


def save(fig, name, tight=False):
    for d in OUT:
        d.mkdir(parents=True, exist_ok=True)
        if tight:
            fig.savefig(d / name, bbox_inches="tight", pad_inches=0.03)
        else:
            fig.savefig(d / name)
    plt.close(fig)


def recessive(ax, grid_axis="y"):
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.grid(axis=grid_axis, color=GRID, linewidth=0.6)
    ax.set_axisbelow(True)


def title(ax, text, sub=None, y=1.0):
    ax.text(0.0, y + 0.10 if sub else y + 0.04, text, transform=ax.transAxes, ha="left", va="bottom",
            fontsize=8.5, fontweight="bold", color=INK)
    if sub:
        ax.text(0.0, y + 0.03, sub, transform=ax.transAxes, ha="left", va="bottom",
                fontsize=FS_SMALL, style="italic", color=INK2)


def signed(v, d=2):
    return f"{v:+.{d}f}".replace("-", "−")


def interval(ci, d=2):
    return f"[{ci[0]:.{d}f}, {ci[1]:.{d}f}]".replace("-", "−")


# ---------------------------------------------------------------------------
# Accounting panel (Figure 1B and its supplementary companions)
# ---------------------------------------------------------------------------
ROW_LABELS = {
    "H-H swap": "H–H swaps",
    "E-H swap": "E–H swaps*",
    "One-way H->H": "One-way H→H",
    "One-way E->H": "One-way E→H*",
    "One-way H->E": "One-way H→E",
    "Easy-Easy transfers": "E–E transfers",
}


def accounting_panel(ax, acc, net_ci, xlim, highlight=True, value_x=1.03):
    comps = acc["components"]
    n = len(comps)
    ys = [n + 0.6 - k for k in range(n)]           # components on top
    y_net = 0.0
    for y, c in zip(ys, comps):
        v = c["mean"]
        ax.barh(y, v, height=0.62, color=BLUE if v >= 0 else RED, edgecolor="white", linewidth=1.0, zorder=2)
        lo, hi = c["ci"]
        ax.plot([lo, hi], [y, y], color=INK, linewidth=0.9, zorder=3, solid_capstyle="butt")
        for x in (lo, hi):
            ax.plot([x, x], [y - 0.13, y + 0.13], color=INK, linewidth=0.9, zorder=3)
        ax.text(value_x, y, f"{signed(v)}  {interval(c['ci'])}", transform=blended_transform_factory(ax.transAxes, ax.transData),
                va="center", ha="left", fontsize=FS_SMALL, color=INK)
    net = acc["net"]["mean"]
    ax.barh(y_net, net, height=0.62, color=INK2, edgecolor="white", linewidth=1.0, zorder=2)
    ax.plot(net_ci, [y_net, y_net], color=INK, linewidth=0.9, zorder=3)
    for x in net_ci:
        ax.plot([x, x], [y_net - 0.13, y_net + 0.13], color=INK, linewidth=0.9, zorder=3)
    ax.text(value_x, y_net, f"{signed(net)}  {interval(net_ci)}", transform=blended_transform_factory(ax.transAxes, ax.transData),
            va="center", ha="left", fontsize=FS, fontweight="bold", color=INK)
    ax.axhline((y_net + ys[-1]) / 2, color=MUTED, linewidth=0.7)
    del highlight
    ax.axvline(0, color=INK2, linewidth=0.7, zorder=1)
    ax.set_yticks(ys + [y_net], [ROW_LABELS[c["group"]] for c in comps] + ["Net welfare change"])
    ax.get_yticklabels()[-1].set_fontweight("bold")
    ax.set_ylim(-0.6, n + 1.1)
    ax.set_xlim(*xlim)
    ax.tick_params(axis="y", length=0)
    recessive(ax, "x")


# ---------------------------------------------------------------------------
# Figure 1: execution intervention and realized welfare accounting
# ---------------------------------------------------------------------------
def figure_mechanism():
    fig = plt.figure(figsize=(TEXTWIDTH_IN, 2.95))
    a = fig.add_axes([0.072, 0.155, 0.318, 0.655])
    b = fig.add_axes([0.585, 0.235, 0.185, 0.575])

    # Panel A ---------------------------------------------------------------
    arms = ["neutral-standard", "gift-standard", "gift-hh-blocked", "gift-eh-gift-blocked"]
    labels = ["Neutral", "Gift", "Gift +\nH–H filter", "Gift +\nE→H filter"]
    xs = [0.0, 1.25, 2.55, 3.85]
    score = {(r["seed"], r["arm"]): r["meanScore"] for r in WRG["runs"]}
    for s in WRG["seeds"]:
        ys = [score[(s, arm)] for arm in arms]
        a.plot(xs, ys, color=AXIS, linewidth=0.6, zorder=1)
        a.scatter(xs, ys, s=7, color="#a8a7a0", linewidths=0, zorder=2)
    means = [X1["accounting"]["W-RG"]["byArm"][arm]["meanWelfare"] for arm in arms]
    a.scatter(xs, means, s=46, color=INK, marker="o", zorder=4, edgecolors="white", linewidths=0.8)
    never = X1["benchmarks"]["W-RG"]["never-transfer"]
    a.axhline(never, color=INK2, linestyle=(0, (3, 2)), linewidth=0.8, zorder=0)

    eff = next(e for e in X1["inference"]["W-RG"] if e["name"] == "gift-standard - gift-hh-blocked welfare")
    lo, hi = -eff["bootstrap95"][1], -eff["bootstrap95"][0]
    lower = eff["positive"]
    yb = 58.0
    a.plot([xs[1], xs[1], xs[2], xs[2]], [yb - 0.3, yb, yb, yb - 0.3], color=INK, linewidth=0.8)
    a.text((xs[1] + xs[2]) / 2, yb + 0.15, f"Blocked − standard: {signed(-eff['mean'])}\n95% CI {interval((lo, hi))}; {lower}/{eff['n']} seeds lower",
           ha="center", va="bottom", fontsize=FS_SMALL, color=INK, linespacing=1.15)
    yg = 60.6
    a.plot([xs[1] - 0.25, xs[1] - 0.25, xs[3] + 0.25, xs[3] + 0.25], [yg - 0.25, yg, yg, yg - 0.25], color=MUTED, linewidth=0.7)
    a.text((xs[1] + xs[3]) / 2, yg + 0.12, "Same Gift announcement; execution filter varies", ha="center", va="bottom", fontsize=FS_SMALL, color=INK2)

    a.set_xticks(xs, labels, fontsize=FS_SMALL)
    a.set_xlim(-0.5, 4.4)
    a.set_ylim(47.3, 61.6)
    a.set_yticks([50, 52, 54, 56, 58])
    a.set_ylabel("Mean final score per account")
    recessive(a)
    handles = [
        Line2D([], [], color=AXIS, linewidth=0.8, marker="o", markersize=2.6, markerfacecolor="#a8a7a0", markeredgewidth=0, label="Paired seed"),
        Line2D([], [], color="none", marker="o", markersize=6.5, markerfacecolor=INK, markeredgecolor="white", label="Arm mean"),
        Line2D([], [], color=INK2, linestyle=(0, (3, 2)), linewidth=0.8, label=f"Never transfer, same seeds ({never:.2f})"),
    ]
    a.legend(handles=handles, loc="lower left", ncol=2, frameon=False, fontsize=7.0, handlelength=1.8,
             columnspacing=0.9, handletextpad=0.4, borderaxespad=0.1)
    title(a, "A  Execution intervention (W-RG)", sub="12 paired seeds", y=1.0)

    # Panel B ---------------------------------------------------------------
    acc = next(x for x in X2["accounting"] if x["study"] == "W-SGB" and x["arm"] == "gift-exact")
    frozen = next(e for e in X1["inference"]["W-SGB welfare"] if e["name"] == "gift-exact - neutral welfare")
    accounting_panel(b, acc, frozen["bootstrap95"], (-1.0, 3.05))
    b.set_xlabel("Contribution to Gift − Neutral welfare\n(points per account)", fontsize=FS_SMALL)
    b.text(-0.78, -0.33, "*Involves the named E→H transfer.  Whiskers: seed-bootstrap 95% CIs.",
           transform=b.transAxes, ha="left", va="top", fontsize=7.0, color=INK2)
    title(b, "B  Realized welfare accounting (W-SGB)", sub="14 paired seeds; mean and 95% CI per account", y=1.0)
    for t in b.texts[-2:]:
        t.set_x(-0.78)
    save(fig, "VBE-x1-fig-mechanism.pdf")


# ---------------------------------------------------------------------------
# Encounter-index curves (Figure 2B and its supplementary companion)
# ---------------------------------------------------------------------------
BIN_X = [1.0, 2.0, 3.0, 4.35]
MARKERS = ["o", "s", "^", "D"]


def curve_lookup(arm, cell):
    t = next(t for t in X2["wsgbCurves"] if t["arm"] == arm and t["cell"] == cell)
    return t["bins"][:4]


def curves_panel(ax, series, label_y=None, show_labels=True, n_table=True, n_table_y0=-0.44):
    ax.axvspan(3.85, 4.85, color=NEUTRAL_BG, zorder=0, linewidth=0)
    dodge = [-0.09, -0.03, 0.03, 0.09]
    for k, (arm, cell, label, color, dashed) in enumerate(series):
        bins = curve_lookup(arm, cell)
        xs = [x + dodge[k % 4] for x in BIN_X]
        ys = [b["rate"] for b in bins]
        ax.plot(xs, ys, color=color, linewidth=1.6, linestyle=(0, (4, 2)) if dashed else "-", zorder=3)
        for x, b in zip(xs, bins):
            lo, hi = b["ci"]
            ax.plot([x, x], [lo, hi], color=color, linewidth=0.9, alpha=0.9, zorder=2)
        ax.scatter(xs, ys, marker=MARKERS[k % 4], s=30, color=color, edgecolors="white", linewidths=0.7, zorder=4)
        if show_labels:
            y = label_y[k] if label_y else ys[-1]
            ax.text(4.62, y, label, va="center", ha="left", fontsize=FS_SMALL, color=INK, clip_on=False)
            ax.plot([4.47, 4.58], [ys[-1], y], color=AXIS, linewidth=0.6, clip_on=False)
    ax.set_xticks(BIN_X, ["1st", "2nd", "3rd", "4th+\n(pooled)"])
    ax.set_xlim(0.7, 4.85)
    ax.set_ylim(-0.04, 1.08)
    ax.set_yticks([0, 0.25, 0.5, 0.75, 1.0], ["0", "0.25", "0.50", "0.75", "1"])
    recessive(ax)
    if n_table:
        tr = blended_transform_factory(ax.transData, ax.transAxes)
        ax.text(0.62, n_table_y0, "Decisions (n)", transform=tr, ha="right", va="center", fontsize=7.0, color=INK2, style="italic")
        for k, (arm, cell, label, color, dashed) in enumerate(series):
            y = n_table_y0 - 0.085 * (k + 1)
            ax.text(0.62, y, label, transform=tr, ha="right", va="center", fontsize=7.0, color=INK2)
            for x, b in zip(BIN_X, curve_lookup(arm, cell)):
                ax.text(x, y, str(b["decisions"]), transform=tr, ha="center", va="center", fontsize=7.0, color=INK2)


# ---------------------------------------------------------------------------
# Figure 2: matched first-decision states and successive meetings
# ---------------------------------------------------------------------------
def figure_scope():
    fig = plt.figure(figsize=(TEXTWIDTH_IN, 3.75))
    a = fig.add_axes([0.135, 0.315, 0.27, 0.53])
    cax = fig.add_axes([0.135, 0.19, 0.27, 0.02])
    b = fig.add_axes([0.585, 0.43, 0.225, 0.415])

    cells = ["H>H", "H>E", "E>H", "E>E"]
    cell_labels = ["H→H", "H→E", "E→H", "E→E"]
    arms = ["neutral", "gift-exact", "gift-easy-only", "gift-any-holder", "gift-hard-partner-only", "money-exact", "easy-easy-negative"]
    arm_labels = ["Neutral", "Gift exact", "Easy only", "Any holder", "Hard partner", "Money exact*", "Harmful E–E"]
    named = {
        "gift-exact": {"E>H"}, "gift-easy-only": {"E>H"}, "gift-any-holder": {"E>H", "H>H"},
        "gift-hard-partner-only": {"E>H", "H>H"}, "easy-easy-negative": {"E>E"},
    }
    comps = {c["arm"]: c for c in X1["fixedState"]["comparisons"] if c["study"] == "W-SGB"}
    ref = {x["cell"]: x for x in comps["gift-exact"]["cells"]}
    grid, counts = [], []
    for arm in arms:
        row, cnt = [], []
        for c in cells:
            if arm == "neutral":
                x = ref[c]; rate = x["referenceGiveRate"]
            else:
                x = next(y for y in comps[arm]["cells"] if y["cell"] == c); rate = x["armGiveRate"]
            n = x["decisions"]
            row.append(rate); cnt.append((round(rate * n), n))
        grid.append(row); counts.append(cnt)
    cmap = LinearSegmentedColormap.from_list("seq", SEQ)
    im = a.imshow(grid, cmap=cmap, vmin=0, vmax=1, aspect="auto")
    for i, arm in enumerate(arms):
        for j, c in enumerate(cells):
            v = grid[i][j]; k, n = counts[i][j]
            col = "white" if v > 0.55 else INK
            a.text(j, i - 0.17, f"{v:.2f}", ha="center", va="center", fontsize=FS, color=col, fontweight="bold")
            a.text(j, i + 0.22, f"{k}/{n}", ha="center", va="center", fontsize=7.0, color=col)
            if c in named.get(arm, set()):
                a.add_patch(Rectangle((j - 0.46, i - 0.45), 0.92, 0.9, fill=False, edgecolor=ORANGE, linewidth=1.7))
    a.set_xticks(range(4), cell_labels)
    a.xaxis.tick_top()
    a.set_yticks(range(len(arms)), arm_labels)
    a.tick_params(length=0)
    for s in a.spines.values():
        s.set_visible(False)
    title(a, "A  Matched first-decision states (W-SGB)", sub="Columns: decider → partner. Cells: rate, gives/decisions", y=1.08)
    for t in a.texts[-2:]:
        t.set_x(-0.36)

    cb = fig.colorbar(im, cax=cax, orientation="horizontal", ticks=[0, 0.5, 1])
    cb.ax.set_xticklabels(["0", "0.5", "1"])
    cb.outline.set_visible(False)
    cb.ax.tick_params(length=2, labelsize=FS_SMALL)
    cax.set_title("Unconditional-give rate", fontsize=7.0, color=INK2, pad=3)
    fig.patches.append(Rectangle((0.037, 0.072), 0.016, 0.03, transform=fig.transFigure, fill=False, edgecolor=ORANGE, linewidth=1.5))
    fig.text(0.059, 0.087, "Outlined: relation named in the announcement text (not executed transactions)", fontsize=7.0, color=INK2, va="center")
    fig.text(0.037, 0.03, "*Money exact names a sale, which this unconditional-give metric does not measure.", fontsize=7.0, color=INK2, va="center")

    series = [
        ("gift-exact", "H>H", "Gift: H→H", BLUE, False),
        ("gift-exact", "H>E", "Gift: H→E", ORANGE, False),
        ("gift-exact", "E>H", "Gift: E→H, named", AQUA, False),
        ("easy-easy-negative", "E>E", "Harmful: E→E, named", YELLOW, True),
    ]
    curves_panel(b, series, label_y=[0.86, 0.40, 0.08, 1.03], n_table_y0=-0.42)
    b.set_xlabel("Agent's meeting index in the run (not calendar round)", labelpad=3)
    b.set_ylabel("Unconditional-give rate")
    title(b, "B  Giving across successive meetings (W-SGB)", sub="Observed trajectories; history is not randomized", y=1.0)
    for t in b.texts[-2:]:
        t.set_x(-0.25)
    save(fig, "VBE-x1-fig-scope.pdf")


# ---------------------------------------------------------------------------
# Supplementary figures
# ---------------------------------------------------------------------------
def figure_seed_level():
    fams = [("W-SGB H-H swap rate", 0.25, "H–H swap-rate difference"), ("W-SGB welfare", 0.5, "Welfare difference (points per account)")]
    fig, axes = plt.subplots(1, 2, figsize=(7.0, 2.9), sharey=True, gridspec_kw={"wspace": 0.08})
    pretty = ["Gift − neutral", "Gift − money", "Gift − harmful E–E", "Money − neutral", "Harmful E–E − neutral", "Gift − Easy only", "Any holder − neutral", "Hard partner − neutral"]
    for ax, (fam, mres, xlabel) in zip(axes, fams):
        effects = X1["inference"][fam]
        ys = list(range(len(effects)))[::-1]
        for y, e in zip(ys, effects):
            ax.scatter(e["values"], [y] * len(e["values"]), s=10, color=BLUE, alpha=0.5, linewidths=0)
            lo, hi = e["bootstrap95"]
            ax.plot([lo, hi], [y, y], color=INK, linewidth=1.2)
            ax.scatter([e["mean"]], [y], s=26, color=INK, marker="D", zorder=3)
        ax.axvline(0, color=INK2, linewidth=0.7)
        ax.axvline(mres, color=ORANGE, linewidth=1.0, linestyle=(0, (3, 2)))
        ax.text(mres, len(effects) - 0.4, f"MRES {mres}", color=INK2, fontsize=7, ha="left")
        ax.set_yticks(ys, pretty)
        ax.set_xlabel(xlabel)
        recessive(ax, "x")
    fig.suptitle("Seed-level paired differences (dots), means (diamonds) and 95% bootstrap intervals, W-SGB (14 seeds)", fontsize=8, x=0.02, ha="left")
    save(fig, "VBE-x1-supp-seed-level.pdf", tight=True)


def figure_supp_accounting():
    fig = plt.figure(figsize=(TEXTWIDTH_IN, 2.8))
    specs = [
        ("W-RG", "gift-standard", "W-RG", "gift-standard - neutral-standard welfare", "W-RG: Gift − Neutral (12 seeds)", "Contribution to Gift − Neutral welfare"),
        ("W-SGB", "easy-easy-negative", "W-SGB welfare", "easy-easy-negative - neutral welfare", "W-SGB: Harmful E–E − Neutral (14 seeds)", "Contribution to Harmful − Neutral welfare"),
    ]
    for k, (study, arm, fam, name, ttl, xl) in enumerate(specs):
        ax = fig.add_axes([0.175 + 0.495 * k, 0.27, 0.13, 0.58])
        acc = next(x for x in X2["accounting"] if x["study"] == study and x["arm"] == arm)
        frozen = next(e for e in X1["inference"][fam] if e["name"] == name)
        accounting_panel(ax, acc, frozen["bootstrap95"], (-1.6, 3.2), highlight=False)
        ax.set_xlabel(f"{xl}\n(points per account)", fontsize=7.0)
        for t in ax.texts:
            t.set_fontsize(7.0)
        ax.tick_params(axis="both", labelsize=7.0)
        title(ax, f"{'AB'[k]}  {ttl}", y=1.03)
        ax.texts[-1].set_x(-0.95)
    fig.text(0.01, 0.045, "Realized accounting identity, not a mediation estimate. *Involves the named E→H transfer.", fontsize=7.0, color=INK2)
    fig.text(0.01, 0.01, "Whiskers: seed-bootstrap 95% CIs of the seed-level components; the net interval is the frozen contrast interval.", fontsize=7.0, color=INK2)
    save(fig, "VBE-x2-supp-accounting.pdf")


def figure_supp_curves():
    fig = plt.figure(figsize=(TEXTWIDTH_IN, 3.5))
    left = fig.add_axes([0.11, 0.42, 0.25, 0.46])
    right = fig.add_axes([0.6, 0.42, 0.24, 0.46], sharey=left)
    neutral = [
        ("neutral", "H>H", "Neutral: H→H", BLUE, False),
        ("neutral", "H>E", "Neutral: H→E", ORANGE, False),
        ("neutral", "E>H", "Neutral: E→H", AQUA, False),
        ("neutral", "E>E", "Neutral: E→E", YELLOW, True),
    ]
    harmful = [
        ("easy-easy-negative", "H>H", "Harmful: H→H", BLUE, False),
        ("easy-easy-negative", "H>E", "Harmful: H→E", ORANGE, False),
        ("gift-exact", "E>E", "Gift: E→E", AQUA, False),
        ("easy-easy-negative", "E>E", "Harmful: E→E, named", YELLOW, True),
    ]
    curves_panel(left, neutral, label_y=[0.36, 0.22, 0.08, -0.06], n_table_y0=-0.47)
    curves_panel(right, harmful, label_y=[0.71, 0.19, 0.04, 1.03], n_table_y0=-0.47)
    left.set_ylabel("Unconditional-give rate")
    for ax, t in ((left, "A  Neutral (W-SGB)"), (right, "B  Harmful E–E and Gift E→E (W-SGB)")):
        ax.set_xlabel("Agent's meeting index (not calendar round)", fontsize=FS_SMALL, labelpad=2)
        title(ax, t, sub="Observed trajectories; history is not randomized")
    save(fig, "VBE-x2-supp-curves.pdf")


def figure_supp_endgame():
    fig = plt.figure(figsize=(TEXTWIDTH_IN, 3.0))
    ax = fig.add_axes([0.08, 0.32, 0.9, 0.53])
    series = [
        ("Gift (standard execution), three studies pooled", "H>H", "Gift: H→H (3 studies)", BLUE, False),
        ("W-SGB easy-easy-negative", "H>H", "Harmful: H→H (W-SGB)", ORANGE, False),
        ("Neutral, W-RG and W-SGB pooled", "H>H", "Neutral: H→H (W-RG, W-SGB)", AQUA, False),
        ("Gift (standard execution), three studies pooled", "E>H", "Gift: E→H, named (3 studies)", YELLOW, True),
    ]
    dodge = [-0.18, -0.06, 0.06, 0.18]
    for k, (lab, cell, name, color, dashed) in enumerate(series):
        e = next(x for x in X2["endgame"] if x["label"] == lab and x["cell"] == cell)
        bins = e["byRoundBin"]
        xs = [i + dodge[k] for i in range(len(bins))]
        ys = [b["rate"] for b in bins]
        f = e["final"]
        ax.plot(xs, ys, color=color, linewidth=1.5, linestyle=(0, (4, 2)) if dashed else "-", zorder=3,
                marker=MARKERS[k], markersize=5, markeredgecolor="white", markeredgewidth=0.7,
                label=f"{name}; final round (t = 24): {f['gives']}/{f['decisions']}")
        for x, b in zip(xs, bins):
            ax.plot([x, x], b["ci"], color=color, linewidth=0.9, zorder=2)
    labels = [f"{b['from']}–{b['to']}" for b in X2["endgame"][0]["byRoundBin"]]
    ax.set_xticks(range(len(labels)), labels)
    ax.set_xlim(-0.4, len(labels) - 0.5)
    ax.set_ylim(-0.03, 1.05)
    ax.set_xlabel("Calendar rounds (prompt states “Round t of 24”)")
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.24), ncol=2, frameon=False, fontsize=7.0, handlelength=2.6)
    ax.set_ylabel("Unconditional-give rate")
    recessive(ax)
    title(ax, "Giving by calendar round", sub="Pooled rates; whiskers are seed-cluster bootstrap 95% CIs; descriptive, not randomized")
    save(fig, "VBE-x2-supp-endgame.pdf")


figure_mechanism()
figure_scope()
figure_seed_level()
figure_supp_accounting()
figure_supp_curves()
figure_supp_endgame()
print("figures written:", ", ".join(str(d) for d in OUT))
