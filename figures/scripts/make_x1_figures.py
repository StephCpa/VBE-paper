"""Paper 1 revision figures, generated only from frozen artifacts.

    python3 figures/scripts/make_x1_figures.py

Reads engine/src/data/welfare-review-x1.json (zero-call X1 audit) and the
frozen W-RG / W-SGB traces; writes vector PDFs into figures/ and
paper/figures/. No model call, no hand-entered number.
"""
import json
import pathlib

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.colors import LinearSegmentedColormap  # noqa: E402
from matplotlib.patches import Rectangle  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = ROOT / "engine" / "src" / "data"
OUT = [ROOT / "figures", ROOT / "paper" / "figures"]

X1 = json.loads((DATA / "welfare-review-x1.json").read_text())
WRG = json.loads((DATA / "welfare-role-channel.json").read_text())
WSGB = json.loads((DATA / "welfare-semantic-boundary.json").read_text())

# Reference palette (validated: scripts/validate_palette.js, light mode).
BLUE, ORANGE, AQUA, YELLOW, RED = "#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e34948"
INK, INK2, MUTED, GRID, SURFACE = "#0b0b0b", "#52514e", "#8a8984", "#e4e3df", "#fcfcfb"
SEQ = ["#f4f8fd", "#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"]

plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 7.5, "axes.titlesize": 8.5, "axes.labelsize": 7.5,
    "xtick.labelsize": 7, "ytick.labelsize": 7, "axes.edgecolor": MUTED, "axes.labelcolor": INK2,
    "xtick.color": INK2, "ytick.color": INK2, "axes.linewidth": 0.6, "pdf.fonttype": 42,
    "figure.facecolor": "white", "axes.facecolor": "white",
})


def save(fig, name):
    for d in OUT:
        d.mkdir(parents=True, exist_ok=True)
        fig.savefig(d / name, bbox_inches="tight", pad_inches=0.02)
    plt.close(fig)


def recessive(ax, grid_axis="y"):
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.grid(axis=grid_axis, color=GRID, linewidth=0.6)
    ax.set_axisbelow(True)


# ---------------------------------------------------------------------------
# Figure 1: execution channel and exact welfare accounting
# ---------------------------------------------------------------------------
def figure_mechanism():
    fig, (a, b) = plt.subplots(1, 2, figsize=(7.0, 2.7), gridspec_kw={"width_ratios": [1.0, 1.2], "wspace": 0.55})

    arms = ["neutral-standard", "gift-standard", "gift-hh-blocked", "gift-eh-gift-blocked"]
    labels = ["Neutral", "Gift", "Gift,\nno H–H", "Gift,\nno E→H"]
    seeds = WRG["seeds"]
    score = {(r["seed"], r["arm"]): r["meanScore"] for r in WRG["runs"]}
    for s in seeds:
        a.plot(range(4), [score[(s, arm)] for arm in arms], color=MUTED, linewidth=0.6, alpha=0.7, zorder=1)
        a.scatter(range(4), [score[(s, arm)] for arm in arms], s=9, color=BLUE, alpha=0.55, linewidths=0, zorder=2)
    means = [X1["accounting"]["W-RG"]["byArm"][arm]["meanWelfare"] for arm in arms]
    a.scatter(range(4), means, s=34, color=INK, marker="D", zorder=3, label="Arm mean")
    bench = X1["benchmarks"]["W-RG"]
    for val, txt in ((bench["never-transfer"], "Never transfer"), (bench["first-best-ex-ante"], "Ex-ante first best")):
        a.axhline(val, color=INK2, linestyle=(0, (3, 2)), linewidth=0.7, zorder=0)
        a.text(-0.3, val + 0.25, txt, va="bottom", ha="left", fontsize=6.3, color=INK2)
    a.set_xticks(range(4), labels)
    a.set_xlim(-0.35, 3.35)
    a.set_ylabel("Mean final score per account (W-RG)")
    a.set_title("A  Gift prompt fixed, execution varied", loc="left", fontweight="bold")
    recessive(a)
    a.annotate("", xy=(2, means[2] + 0.15), xytext=(1, means[1] - 0.15),
               arrowprops={"arrowstyle": "->", "color": INK, "linewidth": 0.8})
    a.text(1.62, 58.6, "−3.21 per account\n12/12 seeds", ha="center", fontsize=6.3, color=INK)

    # Panel B: exact accounting of gift minus neutral, grouped categories.
    groups = [
        ("H–H swap", ["HH:swap"]),
        ("E–H swap", ["EH:swap"]),
        ("One-way H→H", ["H>H:gift", "H>H:sale"]),
        ("One-way E→H", ["E>H:gift", "E>H:sale"]),
        ("One-way H→E", ["H>E:gift", "H>E:sale"]),
        ("Easy–Easy transfers", ["EE:swap", "E>E:gift", "E>E:sale"]),
    ]

    def grouped(study, key):
        rows = X1["accounting"][study]["decomposition"][key]["rows"]
        return [sum(rows.get(c, {}).get("realizedDeltaPerAccount", 0.0) for c in cats) for _, cats in groups]

    sgb = grouped("W-SGB", "gift-exact - neutral")
    rg = grouped("W-RG", "gift-standard - neutral-standard")
    net_sgb = X1["accounting"]["W-SGB"]["decomposition"]["gift-exact - neutral"]["welfareDelta"]
    net_rg = X1["accounting"]["W-RG"]["decomposition"]["gift-standard - neutral-standard"]["welfareDelta"]
    names = [g for g, _ in groups] + ["Net welfare change"]
    vals = sgb + [net_sgb]
    ys = list(range(len(names)))[::-1]
    for y, v, name in zip(ys, vals, names):
        color = INK2 if name.startswith("Net") else (BLUE if v >= 0 else RED)
        b.barh(y, v, height=0.62, color=color, edgecolor="white", linewidth=1.0)
        b.text(3.12, y, f"{v:+.2f}", va="center", ha="right", fontsize=6.6, color=INK, fontweight="bold" if name.startswith("Net") else "normal")
    b.scatter(rg + [net_rg], ys, marker="D", s=18, facecolor="white", edgecolor=INK, linewidths=0.9, zorder=3, label="W-RG\n(12 seeds)")
    b.axvline(0, color=INK2, linewidth=0.7)
    b.set_yticks(ys, names)
    b.set_xlim(-1.45, 3.15)
    b.set_xlabel("Points per account (bars: W-SGB, 14 seeds)")
    b.set_title("B  Accounting of gift − neutral welfare", loc="left", fontweight="bold")
    recessive(b, "x")
    b.legend(loc="upper left", frameon=False, fontsize=6.3, handletextpad=0.3, borderaxespad=0.3)
    save(fig, "VBE-x1-fig-mechanism.pdf")


# ---------------------------------------------------------------------------
# Figure 2: fixed-state scope map and closed-loop dynamics
# ---------------------------------------------------------------------------
def figure_scope():
    fig, (a, b) = plt.subplots(1, 2, figsize=(7.0, 2.6), gridspec_kw={"width_ratios": [1.15, 1.0], "wspace": 0.38})

    cells = ["H>H", "H>E", "E>H", "E>E"]
    cell_labels = ["H→H", "H→E", "E→H", "E→E"]
    arms = ["neutral", "gift-exact", "gift-easy-only", "gift-any-holder", "gift-hard-partner-only", "money-exact", "easy-easy-negative"]
    arm_labels = ["Neutral", "Gift exact", "Easy only", "Any holder", "Hard partner", "Money exact", "Harmful E–E"]
    named = {
        "gift-exact": {"E>H"}, "gift-easy-only": {"E>H"}, "gift-any-holder": {"E>H", "H>H"},
        "gift-hard-partner-only": {"E>H", "H>H"}, "money-exact": {"E>H"}, "easy-easy-negative": {"E>E"},
    }
    comps = {c["arm"]: c for c in X1["fixedState"]["comparisons"] if c["study"] == "W-SGB"}
    ref = {x["cell"]: x for x in comps["gift-exact"]["cells"]}
    grid, ns = [], [ref[c]["decisions"] for c in cells]
    for arm in arms:
        if arm == "neutral":
            grid.append([ref[c]["referenceGiveRate"] for c in cells])
        else:
            m = {x["cell"]: x for x in comps[arm]["cells"]}
            grid.append([m[c]["armGiveRate"] for c in cells])
    cmap = LinearSegmentedColormap.from_list("seq", SEQ)
    a.imshow(grid, cmap=cmap, vmin=0, vmax=1, aspect="auto")
    for i, arm in enumerate(arms):
        for j, c in enumerate(cells):
            v = grid[i][j]
            a.text(j, i, f"{v:.2f}", ha="center", va="center", fontsize=6.8, color="white" if v > 0.55 else INK)
            if c in named.get(arm, set()):
                dashed = arm == "money-exact"
                a.add_patch(Rectangle((j - 0.47, i - 0.45), 0.94, 0.9, fill=False, edgecolor=ORANGE, linewidth=1.6,
                                      linestyle=(0, (2, 1.2)) if dashed else "-"))
    a.set_xticks(range(4), [f"{lab}\n(n={n})" for lab, n in zip(cell_labels, ns)])
    a.set_yticks(range(len(arms)), arm_labels)
    a.tick_params(length=0)
    for s in a.spines.values():
        s.set_visible(False)
    a.set_title("A  First decision at byte-identical states", loc="left", fontweight="bold")
    # Orange outline marks the relation each package names (dashed: names a sale); explained in the caption.

    # Panel B: dynamics by meeting ordinal (W-SGB, pooled decisions).
    rows = X1["dynamics"]["W-SGB"]
    series = [
        ("gift-exact", "H>H", "Gift: H→H", BLUE),
        ("gift-exact", "H>E", "Gift: H→E", ORANGE),
        ("gift-exact", "E>H", "Gift: E→H (named)", AQUA),
        ("easy-easy-negative", "E>E", "Harmful E–E: E→E (named)", YELLOW),
    ]
    xs = [1, 2, 3, 4]
    for arm, cell, label, color in series:
        ys = [next(r["rate"] for r in rows if r["arm"] == arm and r["cell"] == cell and r["ordinal"] == o) for o in ("1", "2", "3", "4+")]
        b.plot(xs, ys, color=color, linewidth=2, marker="o", markersize=4.5, markeredgecolor="white", markeredgewidth=0.8)
        b.text(4.12, ys[-1], label, va="center", ha="left", fontsize=6.4, color=INK)
    b.set_xticks(xs, ["1st", "2nd", "3rd", "4th+"])
    b.set_xlim(0.85, 4.05)
    b.set_ylim(-0.03, 1.05)
    b.set_xlabel("Decider's meeting number within the run")
    b.set_ylabel("Unconditional-give rate")
    b.set_title("B  Closed-loop dynamics (W-SGB)", loc="left", fontweight="bold")
    recessive(b)
    save(fig, "VBE-x1-fig-scope.pdf")


# ---------------------------------------------------------------------------
# Supplement figure: seed-level paired effects for every W-SGB contrast
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
        ax.text(mres, len(effects) - 0.4, f"MRES {mres}", color=INK2, fontsize=6.3, ha="left")
        ax.set_yticks(ys, pretty)
        ax.set_xlabel(xlabel)
        recessive(ax, "x")
    fig.suptitle("Seed-level paired differences (dots), means (diamonds) and 95% bootstrap intervals, W-SGB (14 seeds)", fontsize=8, x=0.02, ha="left")
    save(fig, "VBE-x1-supp-seed-level.pdf")


figure_mechanism()
figure_scope()
figure_seed_level()
print("figures written:", ", ".join(str(d) for d in OUT))
