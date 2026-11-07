import Foundation
import WebKit
import LKSync
import LKStore

/// C03 – first launch after the update from the Capacitor app (1.x): read the old web storage and import it, once, with zero loss.
/// The 1.x app kept everything in WKWebView storage of the origin `capacitor://localhost` (IndexedDB 'lexkite'.kv + localStorage) in the
/// default website data store, which survives the app update. A hidden WKWebView with a `capacitor` scheme handler opens that same origin,
/// runs native/shared/gen/migration-export.js (generated from the web Store code) and hands back one JSON object → `MigrationImport` →
/// SwiftData. Marked done only after a successful import; any failure retries on the next launch (the old data is never touched).
@MainActor
public final class LegacyWebExporter: NSObject, WKURLSchemeHandler {
    public static let origin = URL(string: "capacitor://localhost/")!
    private var webView: WKWebView?

    public enum ExportError: Error { case timeout, badResult, script(String) }

    /// Runs `script` (native/shared/gen/migration-export.js) at the legacy origin and returns the export object.
    public func export(script: String, timeout: TimeInterval = 20) async throws -> JSON {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default()   // same store the Capacitor WKWebView used
        cfg.setURLSchemeHandler(self, forURLScheme: "capacitor")
        let wv = WKWebView(frame: .zero, configuration: cfg)
        webView = wv
        defer { webView = nil }
        let nav = NavigationWaiter()
        wv.navigationDelegate = nav
        wv.load(URLRequest(url: Self.origin))
        try await nav.wait(timeout: timeout)
        // migration-export.js is one async expression resolving to the export JSON string (its own contract)
        let body = "return await " + script
        let out = try await withThrowingTaskGroup(of: String?.self) { group in
            group.addTask { @MainActor in try await wv.callAsyncJavaScript(body, arguments: [:], in: nil, contentWorld: .page) as? String }
            group.addTask { try await Task.sleep(nanoseconds: UInt64(timeout * 1e9)); throw ExportError.timeout }
            let first: String? = try await group.next() ?? nil
            group.cancelAll()
            return first
        }
        guard let s = out, let j = try? JSON.parse(s), j.isObject else { throw ExportError.badResult }
        return j
    }

    // Serve an empty page for capacitor://localhost/* so the origin exists; the script reads storage only.
    public func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        let html = Data("<!doctype html><meta charset=utf-8><title></title>".utf8)
        let res = HTTPURLResponse(url: task.request.url ?? Self.origin, statusCode: 200, httpVersion: "HTTP/1.1",
                                  headerFields: ["Content-Type": "text/html; charset=utf-8", "Content-Length": String(html.count)])!
        task.didReceive(res); task.didReceive(html); task.didFinish()
    }
    public func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    @MainActor private final class NavigationWaiter: NSObject, WKNavigationDelegate {
        private var cont: CheckedContinuation<Void, Error>?
        private var result: Result<Void, Error>?
        func wait(timeout: TimeInterval) async throws {
            if let result { return try result.get() }
            try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void, Error>) in
                cont = c
                Task { @MainActor [weak self] in
                    try? await Task.sleep(nanoseconds: UInt64(timeout * 1e9))
                    self?.finish(.failure(ExportError.timeout))
                }
            }
        }
        private func finish(_ r: Result<Void, Error>) {
            if result == nil { result = r }
            cont?.resume(with: r); cont = nil
        }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { finish(.success(())) }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { finish(.failure(error)) }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { finish(.failure(error)) }
    }
}

/// Runs the one-time migration at launch (idempotent; no UI unless there is data to move).
@MainActor
public enum LegacyMigration {
    /// - Parameter script: contents of migration-export.js (bundled by the app target from native/shared/gen).
    @discardableResult
    public static func runIfNeeded(repo: LKRepository, script: String?, crash: LKCrash?, now: @Sendable () -> Double = { Date().timeIntervalSince1970 * 1000 }) async -> Bool {
        guard await repo.migratedAt() == nil else { return false }
        guard let script, !script.isEmpty else { crash?.log("migration: export script missing"); return false }
        do {
            let j = try await LegacyWebExporter().export(script: script)
            let imp = try MigrationImport(export: j, now: now())
            try await repo.importLegacy(imp, now: now())
            crash?.log("migration: ok cards=\(imp.doc.cards.count) legacy=\(imp.legacy.count)")
            return !imp.isEmpty
        } catch {
            crash?.record(error, context: "migration")   // not marked done → retried next launch; legacy data untouched
            return false
        }
    }
}
