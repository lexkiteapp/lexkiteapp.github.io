import Foundation
import UIKit
import AuthenticationServices
import CryptoKit
import FirebaseCore
import FirebaseAuth
import GoogleSignIn
import LKSync

/// C01 – Firebase Auth (same Firebase project + GoogleService-Info.plist as the live Capacitor app, referenced from mobile/ios by project.yml):
/// Google (GoogleSignIn SDK → Firebase credential) and Sign in with Apple (nonce + Firebase OAuth credential). Guest use needs nothing.
/// Lives in the app target so LexkiteKit and its tests never link Firebase (LKAuth protocol).
final class FirebaseAuthService: NSObject, LKAuth, @unchecked Sendable {
    let driveScope: Bool
    init(driveScope: Bool) { self.driveScope = driveScope }

    /// Configure Firebase once; false when the plist is missing (then the app runs guest-only, never crashes).
    static func configure() -> Bool {
        guard FirebaseApp.app() == nil else { return true }
        guard Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil else { return false }
        FirebaseApp.configure()
        return true
    }

    static func map(_ u: User) -> LKUser {
        LKUser(uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL, providers: u.providerData.map(\.providerID))
    }

    func currentUser() async -> LKUser? { Auth.auth().currentUser.map(Self.map) }

    func userChanges() -> AsyncStream<LKUser?> {
        AsyncStream { c in
            let h = Auth.auth().addStateDidChangeListener { _, u in c.yield(u.map(Self.map)) }
            let box = HandleBox(h)
            c.onTermination = { _ in Auth.auth().removeStateDidChangeListener(box.handle) }
        }
    }
    private final class HandleBox: @unchecked Sendable { let handle: AuthStateDidChangeListenerHandle; init(_ h: AuthStateDidChangeListenerHandle) { handle = h } }

    // MARK: sign in
    @MainActor
    func signIn(_ method: LKSignInMethod) async throws -> LKUser {
        let cred: AuthCredential
        switch method {
        case .google: cred = try await googleCredential()
        case .apple: cred = try await appleCredential().credential
        }
        do {
            return Self.map(try await Auth.auth().signIn(with: cred).user)
        } catch { throw Self.mapError(error) }
    }

    @MainActor
    private func googleCredential() async throws -> AuthCredential {
        guard let clientID = FirebaseApp.app()?.options.clientID else { throw LKAuthError.unavailable }
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        guard let root = Self.presenter() else { throw LKAuthError.unavailable }
        do {
            let r = try await GIDSignIn.sharedInstance.signIn(withPresenting: root, hint: nil, additionalScopes: driveScope ? [DriveClient.scope] : nil)
            guard let idToken = r.user.idToken?.tokenString else { throw LKAuthError.failed("google-id-token") }
            return GoogleAuthProvider.credential(withIDToken: idToken, accessToken: r.user.accessToken.tokenString)
        } catch let e as NSError where e.domain == kGIDSignInErrorDomain && e.code == GIDSignInError.Code.canceled.rawValue {
            throw LKAuthError.cancelled
        }
    }

    @MainActor
    private func appleCredential() async throws -> (credential: AuthCredential, authCode: String?) {
        let nonce = Self.randomNonce()
        let req = ASAuthorizationAppleIDProvider().createRequest()
        req.requestedScopes = [.fullName, .email]
        req.nonce = Self.sha256(nonce)
        let auth = try await AppleSignInRunner().run(req)
        guard let tokenData = auth.identityToken, let token = String(data: tokenData, encoding: .utf8) else { throw LKAuthError.failed("apple-id-token") }
        let code = auth.authorizationCode.flatMap { String(data: $0, encoding: .utf8) }
        return (OAuthProvider.appleCredential(withIDToken: token, rawNonce: nonce, fullName: auth.fullName), code)
    }

    func signOut() async throws {
        do { try Auth.auth().signOut() } catch { throw Self.mapError(error) }
        await MainActor.run { GIDSignIn.sharedInstance.signOut() }
    }

    func idToken(forceRefresh: Bool) async throws -> String {
        guard let u = Auth.auth().currentUser else { throw LKAuthError.notSignedIn }
        do { return try await u.getIDTokenResult(forcingRefresh: forceRefresh).token } catch { throw Self.mapError(error) }
    }

    func driveAccessToken(interactive: Bool) async throws -> String? {
        guard Auth.auth().currentUser?.providerData.contains(where: { $0.providerID == "google.com" }) == true else { return nil }
        return try await driveTokenOnMain(interactive: interactive)
    }
    @MainActor private func driveTokenOnMain(interactive: Bool) async throws -> String? {
        let s = GIDSignIn.sharedInstance
        if s.configuration == nil, let id = FirebaseApp.app()?.options.clientID { s.configuration = GIDConfiguration(clientID: id) }
        if s.currentUser == nil { _ = try? await s.restorePreviousSignIn() }
        guard var user = s.currentUser else { return nil }
        if !(user.grantedScopes ?? []).contains(DriveClient.scope) {
            guard interactive, let root = Self.presenter() else { return nil }
            user = try await user.addScopes([DriveClient.scope], presenting: root).user
        }
        return try await user.refreshTokensIfNeeded().accessToken.tokenString
    }

    @MainActor
    func reauthenticate() async throws -> String {
        guard let u = Auth.auth().currentUser else { throw LKAuthError.notSignedIn }
        do {
            if u.providerData.contains(where: { $0.providerID == "apple.com" }) {
                let (cred, code) = try await appleCredential()
                _ = try await u.reauthenticate(with: cred)
                if let code { try? await Auth.auth().revokeToken(withAuthorizationCode: code) }   // App Store: revoke Apple token before deletion
            } else {
                _ = try await u.reauthenticate(with: try await googleCredential())
            }
            return try await u.getIDTokenResult(forcingRefresh: true).token
        } catch let e as LKAuthError { throw e } catch { throw Self.mapError(error) }
    }

    func deleteUser() async throws {
        guard let u = Auth.auth().currentUser else { throw LKAuthError.notSignedIn }
        do { try await u.delete() } catch { throw Self.mapError(error) }
    }

    // MARK: helpers
    static func mapError(_ e: Error) -> Error {
        let n = e as NSError
        guard n.domain == AuthErrorDomain else { return e }
        switch n.code {
        // Firebase ≥ 11 (Swift Auth): AuthErrorCode is an Int enum (no nested `.Code`); `.case.rawValue` compiles on 10 and 11+
        case AuthErrorCode.requiresRecentLogin.rawValue: return LKAuthError.requiresRecentLogin
        case AuthErrorCode.webContextCancelled.rawValue: return LKAuthError.cancelled
        default: return LKAuthError.failed(n.localizedDescription)
        }
    }

    @MainActor static func presenter() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first { $0.activationState == .foregroundActive }
            ?? UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        var vc = scene?.windows.first { $0.isKeyWindow }?.rootViewController ?? scene?.windows.first?.rootViewController
        while let p = vc?.presentedViewController { vc = p }
        return vc
    }

    static func randomNonce(length: Int = 32) -> String {
        let chars = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var g = SystemRandomNumberGenerator()
        return String((0..<length).map { _ in chars[Int(g.next() % UInt64(chars.count))] })
    }
    static func sha256(_ s: String) -> String { SHA256.hash(data: Data(s.utf8)).map { String(format: "%02x", $0) }.joined() }
}

/// ASAuthorizationController → async/await.
@MainActor
private final class AppleSignInRunner: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private var cont: CheckedContinuation<ASAuthorizationAppleIDCredential, Error>?
    private var keep: AppleSignInRunner?

    func run(_ req: ASAuthorizationAppleIDRequest) async throws -> ASAuthorizationAppleIDCredential {
        try await withCheckedThrowingContinuation { c in
            cont = c; keep = self
            let ctl = ASAuthorizationController(authorizationRequests: [req])
            ctl.delegate = self; ctl.presentationContextProvider = self
            ctl.performRequests()
        }
    }
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        if let c = authorization.credential as? ASAuthorizationAppleIDCredential { cont?.resume(returning: c) } else { cont?.resume(throwing: LKAuthError.failed("apple-credential")) }
        cont = nil; keep = nil
    }
    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let canceled = (error as? ASAuthorizationError)?.code == .canceled
        cont?.resume(throwing: canceled ? LKAuthError.cancelled : LKAuthError.failed(error.localizedDescription))
        cont = nil; keep = nil
    }
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        FirebaseAuthService.presenter()?.view.window ?? ASPresentationAnchor()
    }
}
