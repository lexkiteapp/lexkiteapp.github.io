import Foundation

public extension LessonEngine {
    /// Speech score 0…1 = 1 − Levenshtein / longer length over letters and spaces only (web `UI.similarity`, js/ui.js).
    static func similarity(_ a: String, _ b: String) -> Double {
        func clean(_ s: String) -> [UInt8] {
            Array(s.lowercased().utf8.filter { ($0 >= 97 && $0 <= 122) || $0 == 32 }).trimmed()
        }
        let x = clean(a), y = clean(b)
        if x.isEmpty && y.isEmpty { return 1 }
        if x.isEmpty || y.isEmpty { return 0 }
        var prev = Array(0...y.count), cur = [Int](repeating: 0, count: y.count + 1)
        for i in 1...x.count {
            cur[0] = i
            for j in 1...y.count { cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] == y[j - 1] ? 0 : 1)) }
            swap(&prev, &cur)
        }
        let d = prev[y.count]
        return 1 - Double(d) / Double(max(x.count, y.count))
    }
}
private extension Array where Element == UInt8 {
    func trimmed() -> [UInt8] {
        var a = 0, b = count
        while a < b && self[a] == 32 { a += 1 }
        while b > a && self[b - 1] == 32 { b -= 1 }
        return Array(self[a..<b])
    }
}
