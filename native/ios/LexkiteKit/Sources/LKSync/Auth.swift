import Foundation

/// Signed-in account (Firebase uid = the one account id shared by web, add-on, iOS, Android).
public struct LKUser: Sendable, Equatable, Codable {
    public var uid: String
    public var displayName: String?
    public var email: String?
    public var photoURL: URL?
    /// Firebase provider ids, e.g. "google.com", "apple.com"
    public var providers: [String]
    public init(uid: String, displayName: String? = nil, email: String? = nil, photoURL: URL? = nil, providers: [String] = []) {
        self.uid = uid; self.displayName = displayName; self.email = email; self.photoURL = photoURL; self.providers = providers
    }
    public var isGoogle: Bool { providers.contains("google.com") }
    public var isApple: Bool { providers.contains("apple.com") }
    /// Avatar initial like web `ini` (first letter of name or email, "L" for none).
    public var initial: String {
        let s = (displayName?.isEmpty == false ? displayName : email)?.trimmingCharacters(in: .whitespaces) ?? ""
        return s.first.map { String($0).uppercased() } ?? "L"
    }
}

public enum LKSignInMethod: String, Sendable, CaseIterable { case google, apple }

public enum LKAuthError: Error, Equatable, Sendable {
    case cancelled            // user closed the system sheet – never shown as an error
    case notSignedIn
    case requiresRecentLogin
    case unavailable          // Firebase not configured in this build (tests, previews)
    case failed(String)
}

/// Authentication behind a protocol so LexkiteKit (and its tests) never link Firebase.
/// The app target provides `FirebaseAuthService` (Google via GoogleSignIn + Sign in with Apple, same Firebase project as the live app).
/// Guest mode = no user: every feature works offline-first without signing in.
public protocol LKAuth: AnyObject, Sendable {
    func currentUser() async -> LKUser?
    /// Emits the current user immediately, then on every change.
    func userChanges() -> AsyncStream<LKUser?>
    @MainActor func signIn(_ method: LKSignInMethod) async throws -> LKUser
    func signOut() async throws
    /// Firebase ID token for `Authorization: Bearer` on /api/sync, /api/account.
    func idToken(forceRefresh: Bool) async throws -> String
    /// OAuth access token with scope drive.appdata (Google accounts only). `interactive` may show the Google sheet once.
    func driveAccessToken(interactive: Bool) async throws -> String?
    /// Re-authenticate with the same provider (account deletion needs a fresh login); Apple also revokes its token (App Store rule).
    @MainActor func reauthenticate() async throws -> String
    /// Delete the Firebase user locally (server deletion is done by /api/account first).
    func deleteUser() async throws
}

/// Guest-only auth (tests, previews, builds without Firebase config). Sign-in reports `.unavailable`.
public final class GuestAuth: LKAuth, @unchecked Sendable {
    public init() {}
    public func currentUser() async -> LKUser? { nil }
    public func userChanges() -> AsyncStream<LKUser?> { AsyncStream { c in c.yield(nil); c.finish() } }
    @MainActor public func signIn(_ method: LKSignInMethod) async throws -> LKUser { throw LKAuthError.unavailable }
    public func signOut() async throws {}
    public func idToken(forceRefresh: Bool) async throws -> String { throw LKAuthError.notSignedIn }
    public func driveAccessToken(interactive: Bool) async throws -> String? { nil }
    @MainActor public func reauthenticate() async throws -> String { throw LKAuthError.notSignedIn }
    public func deleteUser() async throws { throw LKAuthError.notSignedIn }
}

// MARK: - Crash reporting

/// Crash reporting behind a protocol (Firebase Crashlytics lives in the app target). Privacy by default:
/// no names, emails or study content – only a SHA-256 of the uid while signed in, and nothing at all when the user opts out.
public protocol LKCrash: AnyObject, Sendable {
    func setCollectionEnabled(_ on: Bool)
    /// Pass the already-hashed id (`LKCrashPrivacy.hashedUserID`) or nil on sign-out.
    func setUserID(_ hashed: String?)
    func log(_ message: String)
    func record(_ error: Error, context: String)
}

public enum LKCrashPrivacy {
    /// Stable, non-reversible id: sha256("lexkite:" + uid) as hex, first 32 chars.
    public static func hashedUserID(_ uid: String) -> String {
        String(SyncCodec.sha256Hex("lexkite:" + uid).prefix(32))
    }
    /// Settings key the user can flip (Me › Settings, M6); absent = collection on (anonymous crash data only).
    public static let optOutKey = "crashOptOut"
    public static func enabled(settings: JSON?) -> Bool { !JSON.truthy(settings?[optOutKey]) }
    /// Messages must never carry study content or personal data; strip anything that looks like an email.
    public static func scrub(_ s: String) -> String {
        s.replacingOccurrences(of: #"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"#, with: "<email>", options: .regularExpression)
    }
}

/// No-op crash reporter (tests, previews) that remembers calls for assertions.
public final class MemoryCrash: LKCrash, @unchecked Sendable {
    private let lock = NSLock()
    private var _enabled = true, _user: String?, _logs: [String] = []
    public init() {}
    public var enabled: Bool { lock.withLock { _enabled } }
    public var userID: String? { lock.withLock { _user } }
    public var logs: [String] { lock.withLock { _logs } }
    public func setCollectionEnabled(_ on: Bool) { lock.withLock { _enabled = on } }
    public func setUserID(_ hashed: String?) { lock.withLock { _user = hashed } }
    public func log(_ message: String) { lock.withLock { if _enabled { _logs.append(LKCrashPrivacy.scrub(message)) } } }
    public func record(_ error: Error, context: String) { log("\(context): \(error)") }
}
