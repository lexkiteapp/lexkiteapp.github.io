import SwiftUI
import LKCore
import LKDesign

/// The teacher, drawn like web TeacherRig.mount(): bare head + 5 vector face layers (eyes, brows, mouth, moustache) under the rigid neck/breath
/// transform, pose stills cross-faded additively. Fills the proposed size, aspect-fit 1108:960, bottom-aligned, transparent, not mirrored in RTL.
public struct TeacherView: View {
    let controller: TeacherController
    public init(controller: TeacherController) { self.controller = controller }

    public var body: some View {
        Group {
            if let f = controller.frozenFrame {
                let scene = controller.scene(f)
                Canvas { g, size in TeacherPainter.draw(scene, in: &g, size: size) }
            } else {
                // idle breathing / blinking always runs; SwiftUI stops the timeline while the view is off screen
                TimelineView(.animation) { tl in
                    let scene = controller.scene(at: tl.date)
                    Canvas { g, size in TeacherPainter.draw(scene, in: &g, size: size) }
                }
            }
        }
        .environment(\.layoutDirection, .leftToRight)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityHidden(true)
    }
}

/// Draws one `TeacherScene` (pure values). Poster space 1108×960 → aspect-fit, bottom-aligned in `size`.
enum TeacherPainter {
    static func draw(_ s: TeacherScene, in g: inout GraphicsContext, size: CGSize) {
        let W = s.size.width, H = s.size.height
        guard W > 0, H > 0, size.width > 0, size.height > 0 else { return }
        let sc = min(size.width / W, size.height / H), ox = (size.width - W * sc) / 2, oy = size.height - H * sc
        let m = s.matrix
        // T = scale(sc) ∘ matrix, then the fit offset (x' = a·x + c·y + e)
        let T = CGAffineTransform(a: sc * m[0], b: sc * m[1], c: sc * m[2], d: sc * m[3], tx: sc * m[4] + ox, ty: sc * m[5] + oy)
        let poster = CGRect(x: 0, y: 0, width: W, height: H)
        func face(_ c: inout GraphicsContext) {
            var x = c
            x.concatenate(T)
            if let head = s.head { x.draw(head, in: poster) }
            for part in s.parts { run(part, &x, s.palette) }
        }
        func pose(_ c: inout GraphicsContext, _ img: Image) {
            var x = c
            x.concatenate(T)
            x.draw(img, in: poster)
        }
        guard let img = s.pose, s.poseW > 0 else { face(&g); return }
        if s.faceW > 0 {
            // cross-fade = additive (premultiplied plus): (1−w)·face + w·pose stays opaque mid-fade (source-over would show the page through at 25 %).
            // Isolated layer so the plus blend only meets the teacher, never the page behind.
            g.drawLayer { root in
                var f = root
                f.blendMode = .plusLighter; f.opacity = s.faceW
                f.drawLayer { l in face(&l) }
                var p = root
                p.blendMode = .plusLighter; p.opacity = s.poseW
                pose(&p, img)
            }
        } else {
            var p = g
            p.opacity = s.poseW
            pose(&p, img)
        }
    }

    /// LipPaint.draw: save/restore/translate/clip/fill/stroke in the current (poster) space.
    static func run(_ ops: [PaintOp], _ base: inout GraphicsContext, _ palette: [UInt32: Color]) {
        var ctx = base
        var stack: [GraphicsContext] = []
        for op in ops {
            switch op {
            case .save: stack.append(ctx)
            case .restore: if let p = stack.popLast() { ctx = p }
            case let .translate(x, y): ctx.translateBy(x: x, y: y)
            case .clip(let shapes):
                var p = Path()
                for sh in shapes { p.addPath(path(sh)) }
                ctx.clip(to: p)
            case let .fill(sh, c, al): ctx.fill(path(sh), with: .color(color(c, palette).opacity(al)))
            case let .stroke(sh, c, w, cap, join, al):
                ctx.stroke(path(sh), with: .color(color(c, palette).opacity(al)), style: StrokeStyle(lineWidth: w, lineCap: lineCap(cap), lineJoin: lineJoin(join)))
            }
        }
    }

    static func color(_ c: RigColor, _ palette: [UInt32: Color]) -> Color {
        palette[c.rgb] ?? LKDynamicColor(light: c.rgb << 8 | 0xFF, dark: c.rgb << 8 | 0xFF).resolve(.light)
    }
    static func lineCap(_ c: PaintCap) -> CGLineCap { c == .round ? .round : c == .square ? .square : .butt }
    static func lineJoin(_ j: PaintJoin) -> CGLineJoin { j == .round ? .round : j == .bevel ? .bevel : .miter }

    static func path(_ s: PaintShape) -> Path {
        switch s {
        case let .ellipse(cx, cy, rx, ry): return Path(ellipseIn: CGRect(x: cx - rx, y: cy - ry, width: 2 * rx, height: 2 * ry))
        case let .rect(x, y, w, h): return Path(CGRect(x: x, y: y, width: w, height: h))
        case .path(let svg):
            var p = Path()
            for c in svg.cmds {
                switch c {
                case let .move(x, y): p.move(to: CGPoint(x: x, y: y))
                case let .line(x, y): p.addLine(to: CGPoint(x: x, y: y))
                case let .quad(cx, cy, x, y): p.addQuadCurve(to: CGPoint(x: x, y: y), control: CGPoint(x: cx, y: cy))
                case let .cubic(ax, ay, bx, by, x, y): p.addCurve(to: CGPoint(x: x, y: y), control1: CGPoint(x: ax, y: ay), control2: CGPoint(x: bx, y: by))
                case .close: p.closeSubpath()
                }
            }
            return p
        }
    }
}
