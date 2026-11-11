import SwiftUI
import Observation
import LKDesign

/// A web route (`#/name/arg?query`) – the ONE route table shared with web (docs/specs/native-apps.md §5 C08).
public struct AppRoute: Hashable, Sendable, Identifiable {
    public var name: String
    public var arg: String?
    public var query: [String: String]
    public init(_ name: String, arg: String? = nil, query: [String: String] = [:]) { self.name = name; self.arg = arg; self.query = query }
    public var id: String { "\(name)/\(arg ?? "")?\(query.sorted { $0.key < $1.key }.map { "\($0.key)=\($0.value)" }.joined(separator: "&"))" }

    public enum Presentation: Equatable, Sendable { case tabRoot, push, focus }

    /// Owning tab of each web route = the item groups of native/shared/parity.json (P01–P12); tab roots come from the generated frame.json.
    static let tabOf: [String: String] = {
        var m: [String: String] = [:]
        let groups: [(String, [String])] = [
            ("home", ["home", "train", "path", "day", "tracks", "course", "courses", "lesson"]),
            ("vocab", ["vocab", "dict", "library", "topic", "letters", "verb", "phrases", "model", "models", "usage", "ideas", "paraphrase",
                       "review", "practice", "mistakes", "deck"]),
            ("skills", ["skills", "skill", "listening", "listen", "listen-test", "dictation", "reading", "read", "speak", "speaking", "pron", "say",
                        "reflex", "rtype", "roleplay", "handsfree", "call", "write", "task1", "fix", "grammar", "criteria", "method", "quick",
                        "style", "confidence", "qstats", "watch"]),
            ("tests", ["tests", "goal", "mock", "cbt", "placement", "toeic", "toeic-r", "toeic-sw", "toeic-test", "toefl", "toefl-p"]),
            ("me", ["me", "stats", "streak", "league", "settings", "report", "contact", "resources", "class", "handoff", "welcome"]),
        ]
        for (tab, rs) in groups { for r in rs { m[r] = tab } }
        return m
    }()
    /// Full-screen learning flows (focus top bar: Close X + progress, no tab bar) – DESIGN-SYSTEM §5d.
    static let focusRoutes: Set<String> = ["lesson", "review", "practice", "mistakes", "call", "mock", "cbt", "placement", "dictation",
                                           "listen-test", "toeic-test", "reflex", "quick", "handsfree", "say"]

    public var tab: String { Self.tabOf[name] ?? "home" }
    public var presentation: Presentation {
        if LKFrame.shared.tabs.contains(where: { $0.route == name }) && arg == nil { return .tabRoot }
        return Self.focusRoutes.contains(name) ? .focus : .push
    }

    /// Parse `#/name/arg?x=y` (also without `#`).
    public static func parseHash(_ s: String) -> AppRoute? {
        var h = s
        if h.hasPrefix("#") { h.removeFirst() }
        if h.hasPrefix("/") { h.removeFirst() }
        let parts = h.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false)
        let path = parts.first.map(String.init) ?? ""
        let segs = path.split(separator: "/").map(String.init)
        guard let name = segs.first?.lowercased(), !name.isEmpty, name.allSatisfy({ $0.isLetter || $0.isNumber || $0 == "-" }) else { return nil }
        var q: [String: String] = [:]
        if parts.count > 1 {
            for kv in parts[1].split(separator: "&") {
                let p = kv.split(separator: "=", maxSplits: 1).map(String.init)
                if let k = p.first?.removingPercentEncoding, !k.isEmpty { q[k] = p.count > 1 ? (p[1].replacingOccurrences(of: "+", with: " ").removingPercentEncoding ?? p[1]) : "" }
            }
        }
        let arg = segs.count > 1 ? segs.dropFirst().joined(separator: "/").removingPercentEncoding : nil
        return AppRoute(name, arg: arg, query: q)
    }
}

/// Deep links: `lexkite://review[?w=…]`, `lexkite://word/<w>` (same as the live app, web/js/native.js openDeep)
/// and universal links `https://lexkite.com/app/#/…` (Associated Domains applinks:lexkite.com).
public enum DeepLink {
    public static func route(for url: URL) -> AppRoute? {
        let s = url.absoluteString
        if url.scheme?.lowercased() == "lexkite" {
            let host = url.host?.lowercased() ?? ""
            if host == "word" {
                let w = url.path(percentEncoded: false).split(separator: "/").first.map(String.init) ?? ""
                return w.isEmpty ? nil : AppRoute("dict", arg: w)
            }
            if host == "review" {
                let w = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first { $0.name == "w" }?.value
                return AppRoute("review", query: w.map { ["w": $0] } ?? [:])
            }
            // lexkite://<route>/… mirrors the web routes for future widgets/notifications
            return AppRoute.parseHash(String(s.dropFirst("lexkite://".count)))
        }
        guard let scheme = url.scheme?.lowercased(), scheme == "https" || scheme == "http",
              let host = url.host?.lowercased(), host == "lexkite.com" || host == "www.lexkite.com" else { return nil }
        let path = url.path(percentEncoded: false)
        guard path == "/app" || path.hasPrefix("/app/") else { return nil }
        guard let frag = url.fragment, !frag.isEmpty else { return AppRoute("home") }
        return AppRoute.parseHash(frag)
    }
}

/// Navigation state: selected tab, one NavigationStack path per tab (kept when switching tabs) and the focus cover.
@MainActor @Observable
public final class AppRouter {
    public var tab: String
    public var paths: [String: [AppRoute]] = [:]
    public var focus: AppRoute?
    public init(tab: String = "home") { self.tab = tab }

    public func path(_ tab: String) -> Binding<[AppRoute]> {
        Binding(get: { self.paths[tab] ?? [] }, set: { self.paths[tab] = $0 })
    }

    public func open(_ r: AppRoute) {
        switch r.presentation {
        case .tabRoot: tab = r.tab; paths[r.tab] = []
        case .push: tab = r.tab; paths[r.tab, default: []].append(r)
        case .focus: tab = r.tab; focus = r
        }
    }
    @discardableResult
    public func open(url: URL) -> Bool {
        guard let r = DeepLink.route(for: url) else { return false }
        open(r); return true
    }
    /// Tapping the selected tab again pops to its root (iOS convention).
    public func reselect(_ t: String) { if tab == t { paths[t] = [] } else { tab = t } }
    public func closeFocus() { focus = nil }
}
