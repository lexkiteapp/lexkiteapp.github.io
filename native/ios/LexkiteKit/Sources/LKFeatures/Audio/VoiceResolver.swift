import Foundation
import LKCore

/// Network side of C04, injectable so tests never touch the network.
public protocol VoiceTransport: Sendable {
    /// The bytes of `url`; throws on an error, a non-200 answer, an empty body or when nothing arrives within `timeout`.
    func data(from url: URL, timeout: TimeInterval) async throws -> Data
}

public struct URLSessionVoiceTransport: VoiceTransport {
    public init() {}
    public func data(from url: URL, timeout: TimeInterval) async throws -> Data {
        var req = URLRequest(url: url)
        req.timeoutInterval = timeout
        let (d, resp) = try await URLSession.shared.data(for: req)
        guard (resp as? HTTPURLResponse)?.statusCode == 200, !d.isEmpty else { throw URLError(.badServerResponse) }
        return d
    }
}

/// Finds the mp3 of a line / word: disk cache → CDN origins in the web order (a failing or slow origin moves on to the next, every failure counts
/// towards `fails` so the next request starts at a healthier origin) → nil (the caller falls back to the system voice).
public actor VoiceResolver {
    public struct Hit: Sendable { public let data: Data, url: URL?, cached: Bool }
    /// web TIMEOUT: seconds until the file starts arriving before the next origin is tried
    public static let timeout: TimeInterval = 7

    private let transport: VoiceTransport
    private let dir: URL?
    public private(set) var fails = 0

    public init(transport: VoiceTransport = URLSessionVoiceTransport(), cacheDirectory: URL? = VoiceResolver.defaultCache) {
        self.transport = transport; dir = cacheDirectory
    }
    public static var defaultCache: URL? {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first?.appendingPathComponent("voice", isDirectory: true)
    }

    func file(_ kind: VoiceCore.Kind, _ key: String) -> URL? { dir?.appendingPathComponent("\(kind.rawValue)-\(key).mp3") }

    public func fetch(kind: VoiceCore.Kind, key: String) async -> Hit? {
        if let f = file(kind, key), let d = try? Data(contentsOf: f), !d.isEmpty { return Hit(data: d, url: nil, cached: true) }
        for u in VoiceCore.urls(kind: kind, key: key, fails: fails) {
            if Task.isCancelled { return nil }
            do {
                let d = try await transport.data(from: u, timeout: Self.timeout)
                if let f = file(kind, key) {
                    try? FileManager.default.createDirectory(at: f.deletingLastPathComponent(), withIntermediateDirectories: true)
                    try? d.write(to: f, options: .atomic)
                }
                return Hit(data: d, url: u, cached: false)
            } catch { fails += 1 }
        }
        return nil
    }
}
