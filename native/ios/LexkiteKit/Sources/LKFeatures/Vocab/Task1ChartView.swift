import SwiftUI
import LKDesign
import LKSync

/// The Task 1 figure of a chart set drawn inline (web task1.js `draw`): line graph, bar chart, pie charts, table, process and maps. Data = the set read from `js/task1.js`
/// (`x`, `unit`, `series`, `pies`, `head`/`rows`, `steps`, `maps`); colours come from the design tokens.
struct Task1ChartView: View {
    let figure: JSON
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t

    private var palette: [Color] { [LKColor.secondary, LKColor.tertiary, LKColor.primary, LKColor.success, LKColor.star, LKColor.error].map { $0.resolve(scheme) } }
    private var ink: Color { LKColor.onSurface.resolve(scheme) }
    private var dim: Color { LKColor.onSurfaceVariant.resolve(scheme) }
    private var line: Color { LKColor.outlineVariant.resolve(scheme) }

    var body: some View {
        Group {
            switch figure.s("type") {
            case "line", "bar": axes(bars: figure.s("type") == "bar")
            case "pie": pies
            case "table": table
            case "process": process
            case "map": maps
            default: EmptyView()
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(Text(verbatim: figure.s("title")))
    }

    private struct Series { let name: String, values: [Double] }
    private var series: [Series] { figure.list("series").compactMap { s in s.array.map { Series(name: $0.first?.string ?? "", values: ($0.count > 1 ? $0[1].array ?? [] : []).map(\.toNumber)) } } }

    // MARK: line + bar
    private func axes(bars: Bool) -> some View {
        let xs = figure.strs("x"), all = series
        let top = all.flatMap(\.values).max() ?? 10
        let maxV = max(10, (top / 10).rounded(.up) * 10)
        return VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            Text(verbatim: figure.s("unit")).lkTextSafe(LKType.labelBadge).foregroundStyle(dim)
            Canvas { ctx, size in
                let left: CGFloat = 34, topPad: CGFloat = 8, bottom: CGFloat = 34
                let w = size.width - left - 8, h = size.height - topPad - bottom
                func y(_ v: Double) -> CGFloat { topPad + h * (1 - CGFloat(v / maxV)) }
                for k in 0...5 {
                    let v = maxV * Double(k) / 5
                    var g = Path(); g.move(to: CGPoint(x: left, y: y(v))); g.addLine(to: CGPoint(x: left + w, y: y(v)))
                    ctx.stroke(g, with: .color(line), lineWidth: 1)
                    ctx.draw(Text(verbatim: String(Int(v.rounded()))).font(.caption2).foregroundStyle(dim), at: CGPoint(x: left - 6, y: y(v)), anchor: .trailing)
                }
                let n = max(1, xs.count)
                let step = bars ? w / CGFloat(n) : (n > 1 ? w / CGFloat(n - 1) : w)
                func cx(_ i: Int) -> CGFloat { bars ? left + step * (CGFloat(i) + 0.5) : left + step * CGFloat(i) }
                for (i, label) in xs.enumerated() {
                    ctx.draw(Text(verbatim: label).font(.caption2).foregroundStyle(dim), at: CGPoint(x: cx(i), y: topPad + h + 6), anchor: .top)
                }
                for (si, s) in all.enumerated() {
                    let c = palette[si % palette.count]
                    if bars {
                        let bw = step * 0.7 / CGFloat(max(1, all.count))
                        for (i, v) in s.values.enumerated() where i < n {
                            let x0 = left + step * CGFloat(i) + step * 0.15 + bw * CGFloat(si)
                            ctx.fill(Path(roundedRect: CGRect(x: x0, y: y(v), width: max(1, bw - 2), height: y(0) - y(v)), cornerRadius: 3), with: .color(c))
                        }
                    } else {
                        var p = Path()
                        for (i, v) in s.values.enumerated() { let pt = CGPoint(x: cx(i), y: y(v)); if i == 0 { p.move(to: pt) } else { p.addLine(to: pt) } }
                        ctx.stroke(p, with: .color(c), style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
                        for (i, v) in s.values.enumerated() { ctx.fill(Path(ellipseIn: CGRect(x: cx(i) - 4, y: y(v) - 4, width: 8, height: 8)), with: .color(c)) }
                    }
                }
            }
            .frame(height: 230)
            .environment(\.layoutDirection, .leftToRight)
            legend(all.map(\.name))
        }
    }
    private func legend(_ names: [String]) -> some View {
        FlowLayout {
            ForEach(Array(names.enumerated()), id: \.offset) { i, n in
                HStack(spacing: 6) {
                    RoundedRectangle(cornerRadius: 3).fill(palette[i % palette.count]).frame(width: 12, height: 12).accessibilityHidden(true)
                    Text(verbatim: n).lkTextSafe(LKType.bodySm).foregroundStyle(ink).englishText()
                }
            }
        }
    }

    // MARK: pies
    private var pies: some View {
        let list = figure.list("pies")
        let names = (list.first?.array?.dropFirst().first?.array ?? []).map { $0.array?.first?.string ?? "" }
        return VStack(spacing: LKSpacing.spaceSm) {
            HStack(alignment: .top, spacing: LKSpacing.spaceSm) {
                ForEach(Array(list.enumerated()), id: \.offset) { _, p in pie(label: p.array?.first?.string ?? "", parts: (p.array?.dropFirst().first?.array ?? []).compactMap { r in r.array.map { ($0.first?.string ?? "", $0.count > 1 ? $0[1].toNumber : 0) } }) }
            }
            legend(names)
        }
    }
    private func pie(label: String, parts: [(String, Double)]) -> some View {
        let total = max(1, parts.reduce(0) { $0 + $1.1 })
        return VStack(spacing: 4) {
            Text(verbatim: label).lkTextSafe(LKType.labelMetric).foregroundStyle(ink)
            Canvas { ctx, size in
                let r = min(size.width, size.height) / 2 - 18, c = CGPoint(x: size.width / 2, y: size.height / 2)
                var a0 = -Double.pi / 2
                for (i, part) in parts.enumerated() {
                    let a1 = a0 + part.1 / total * .pi * 2
                    var p = Path(); p.move(to: c); p.addArc(center: c, radius: r, startAngle: .radians(a0), endAngle: .radians(a1), clockwise: false); p.closeSubpath()
                    ctx.fill(p, with: .color(palette[i % palette.count]))
                    ctx.stroke(p, with: .color(LKColor.surface.resolve(scheme)), lineWidth: 2)
                    let am = (a0 + a1) / 2, inside = (a1 - a0) * Double(r) * 0.7 >= 28
                    let rr = inside ? r * 0.68 : r + 12
                    ctx.draw(Text(verbatim: String(Int(part.1.rounded())) + "%").font(.caption2.bold()).foregroundStyle(inside ? LKColor.onPrimary.resolve(scheme) : ink),
                             at: CGPoint(x: c.x + rr * CGFloat(cos(am)), y: c.y + rr * CGFloat(sin(am))))
                    a0 = a1
                }
            }
            .frame(height: 170).frame(maxWidth: .infinity)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(verbatim: label + ": " + parts.map { "\($0.0) \(Int($0.1.rounded()))%" }.joined(separator: ", ")))
    }

    // MARK: table
    private var table: some View {
        let head = figure.strs("head"), rows = figure.list("rows")
        return ScrollView(.horizontal, showsIndicators: false) {
            Grid(alignment: .leading, horizontalSpacing: LKSpacing.spaceSm, verticalSpacing: 6) {
                GridRow { ForEach(Array(head.enumerated()), id: \.offset) { _, h in Text(verbatim: h).lkTextSafe(LKType.labelMetric).foregroundStyle(ink) } }
                Divider().overlay(line)
                ForEach(Array(rows.enumerated()), id: \.offset) { _, r in
                    GridRow { ForEach(Array((r.array ?? []).enumerated()), id: \.offset) { _, c in Text(verbatim: c.jsToString).lkTextSafe(LKType.bodyMd).foregroundStyle(ink) } }
                }
            }
            .padding(LKSpacing.spaceXs)
        }
        .environment(\.layoutDirection, .leftToRight)
    }

    // MARK: process
    private var process: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(figure.strs("steps").enumerated()), id: \.offset) { i, s in
                HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
                    Text(verbatim: String(i + 1)).lkTextSafe(LKType.labelMetric).foregroundStyle(LKColor.onSecondary.resolve(scheme))
                        .frame(width: 26, height: 26).background(Circle().fill(LKColor.secondary.resolve(scheme)))
                    Text(verbatim: s).lkTextSafe(LKType.bodyMd).foregroundStyle(ink).englishText()
                }
                .accessibilityElement(children: .combine)
                if i < figure.strs("steps").count - 1 { Image(systemName: "arrow.down").foregroundStyle(dim).padding(.leading, 6).accessibilityHidden(true) }
            }
        }
    }

    // MARK: maps
    private var maps: some View {
        VStack(spacing: LKSpacing.spaceSm) {
            ForEach(Array(figure.list("maps").enumerated()), id: \.offset) { _, m in
                let label = m.array?.first?.string ?? "", blocks = (m.array?.dropFirst().first?.array ?? []).compactMap { $0.array }.filter { $0.count >= 5 }
                VStack(alignment: .leading, spacing: 4) {
                    Text(verbatim: label).lkTextSafe(LKType.labelMetric).foregroundStyle(ink)
                    Canvas { ctx, size in
                        let rows = max(2, blocks.map { Int($0[2].toNumber + $0[4].toNumber) }.max() ?? 3), colW = size.width / 4, rowH = min(46, size.height / CGFloat(rows))
                        for (i, b) in blocks.enumerated() {
                            let rect = CGRect(x: colW * CGFloat(b[1].toNumber - 1) + 2, y: rowH * CGFloat(b[2].toNumber - 1) + 2, width: colW * CGFloat(b[3].toNumber) - 4, height: rowH * CGFloat(b[4].toNumber) - 4)
                            let c = palette[i % palette.count]
                            ctx.fill(Path(roundedRect: rect, cornerRadius: 8), with: .color(c.opacity(0.35)))
                            ctx.stroke(Path(roundedRect: rect, cornerRadius: 8), with: .color(c), lineWidth: 2)
                            ctx.draw(Text(verbatim: b[0].jsToString).font(.caption2.bold()).foregroundStyle(ink), at: CGPoint(x: rect.midX, y: rect.midY))
                        }
                    }
                    .frame(height: 46 * 4)
                    .environment(\.layoutDirection, .leftToRight)
                }
            }
        }
    }
}
