import Foundation

/// Canvas op list = what web/js/call/paint.js `LipPaint.compile(svg)` produces from a LipFace layer (display="none" branches dropped).
/// Native builds the ops directly (no SVG text per frame); `SVGPath.d` re-creates the exact web path string for the vector gate
/// and `SVGPath.parse` reads web path strings back (M/L/Q/C/Z, absolute + relative).
public struct Pt: Equatable, Sendable {
    public var x: Double, y: Double
    public init(_ x: Double, _ y: Double) { self.x = x; self.y = y }
}

public enum PathCmd: Equatable, Sendable {
    case move(Double, Double)
    case line(Double, Double)
    case quad(Double, Double, Double, Double)
    case cubic(Double, Double, Double, Double, Double, Double)
    case close
}

public struct SVGPath: Equatable, Sendable {
    public var cmds: [PathCmd]
    public init(_ cmds: [PathCmd] = []) { self.cmds = cmds }

    /// face.js `P(pts, close)` / mouths.js `path(pts, close)`: 'M' + pts.map(f(x) + ' ' + f(y)).join('L') + (close ? 'Z' : '')
    public static func poly(_ pts: [Pt], close: Bool) -> SVGPath {
        var c: [PathCmd] = []
        c.reserveCapacity(pts.count + 1)
        for (i, p) in pts.enumerated() { c.append(i == 0 ? .move(Paint.r1(p.x), Paint.r1(p.y)) : .line(Paint.r1(p.x), Paint.r1(p.y))) }
        if close { c.append(.close) }
        return SVGPath(c)
    }

    /// The web path text (same number format as JS template strings: shortest round-trip, integers without ".0", -0 → "0").
    public var d: String {
        var s = ""
        for c in cmds {
            switch c {
            case let .move(x, y): s += "M" + Paint.num(x) + " " + Paint.num(y)
            case let .line(x, y): s += "L" + Paint.num(x) + " " + Paint.num(y)
            case let .quad(a, b, x, y): s += "Q" + [a, b, x, y].map(Paint.num).joined(separator: " ")
            case let .cubic(a, b, c2, d2, x, y): s += "C" + [a, b, c2, d2, x, y].map(Paint.num).joined(separator: " ")
            case .close: s += "Z"
            }
        }
        return s
    }

    /// Parses an SVG path string with the commands LipFace emits (M L Q C Z, upper = absolute, lower = relative, implicit repeats).
    /// Returns absolute commands; nil on anything else.
    public static func parse(_ d: String) -> SVGPath? {
        var out: [PathCmd] = []
        var nums: [Double] = []
        var cmd: Character? = nil
        var cur = Pt(0, 0), start = Pt(0, 0)
        func flush() -> Bool {
            guard let c = cmd else { return nums.isEmpty }
            let rel = c.isLowercase
            let need: Int
            switch c.lowercased() { case "m", "l": need = 2; case "q": need = 4; case "c": need = 6; case "z": need = 0; default: return false }
            if need == 0 { guard nums.isEmpty else { return false }; out.append(.close); cur = start; return true }
            guard !nums.isEmpty, nums.count % need == 0 else { return false }
            var i = 0, first = true
            while i < nums.count {
                let o = rel ? cur : Pt(0, 0)
                var v = Array(nums[i..<(i + need)])
                for j in stride(from: 0, to: need, by: 2) { v[j] += o.x; v[j + 1] += o.y }
                switch c.lowercased() {
                case "m":
                    if first { out.append(.move(v[0], v[1])); start = Pt(v[0], v[1]) } else { out.append(.line(v[0], v[1])) }
                case "l": out.append(.line(v[0], v[1]))
                case "q": out.append(.quad(v[0], v[1], v[2], v[3]))
                default: out.append(.cubic(v[0], v[1], v[2], v[3], v[4], v[5]))
                }
                cur = Pt(v[need - 2], v[need - 1]); first = false; i += need
            }
            return true
        }
        var token = ""
        func endNumber() -> Bool {
            if token.isEmpty { return true }
            guard let n = Double(token) else { return false }
            nums.append(n); token = ""; return true
        }
        for ch in d {
            if "MmLlQqCcZz".contains(ch) {
                guard endNumber(), flush() else { return nil }
                cmd = ch; nums = []
            } else if ch == " " || ch == "," || ch == "\n" || ch == "\t" {
                guard endNumber() else { return nil }
            } else if ch == "-" && !token.isEmpty && !token.hasSuffix("e") && !token.hasSuffix("E") {
                guard endNumber() else { return nil }
                token = "-"
            } else if ch.isNumber || ch == "." || ch == "-" || ch == "+" || ch == "e" || ch == "E" {
                token.append(ch)
            } else { return nil }
        }
        guard endNumber(), flush() else { return nil }
        return SVGPath(out)
    }
}

public enum PaintShape: Equatable, Sendable {
    case path(SVGPath)
    /// ellipse / circle (rx = ry)
    case ellipse(cx: Double, cy: Double, rx: Double, ry: Double)
    case rect(x: Double, y: Double, w: Double, h: Double)
}

public enum PaintCap: String, Sendable { case butt, round, square }
public enum PaintJoin: String, Sendable { case miter, round, bevel }

public enum PaintOp: Equatable, Sendable {
    case save
    case restore
    case translate(x: Double, y: Double)
    /// union of the shapes becomes the clip
    case clip([PaintShape])
    case fill(PaintShape, color: RigColor, alpha: Double)
    case stroke(PaintShape, color: RigColor, width: Double, cap: PaintCap, join: PaintJoin, alpha: Double)
}

public enum Paint {
    /// face.js / mouths.js `f = n => Math.round(n * 10) / 10` (JS Math.round = floor(x + 0.5), also for negatives).
    @inline(__always) public static func r1(_ n: Double) -> Double { (n * 10 + 0.5).rounded(.down) / 10 }

    /// JS `String(number)` for the values that appear in path strings.
    public static func num(_ v: Double) -> String {
        if v == v.rounded(.towardZero), abs(v) < 1e15 { return String(Int64(v)) }
        return "\(v)"
    }
}
