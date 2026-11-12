import Foundation
import FirebaseCrashlytics
import LKSync

/// Crash reporting (Firebase Crashlytics, app target only – LexkiteKit sees the LKCrash protocol).
/// Privacy by default: no name/email/study content is ever attached; while signed in only a SHA-256 of the uid (LKCrashPrivacy);
/// messages are scrubbed of e-mail addresses; collection follows the learner's `crashOptOut` setting.
final class CrashlyticsReporter: LKCrash, @unchecked Sendable {
    private var c: Crashlytics { Crashlytics.crashlytics() }
    func setCollectionEnabled(_ on: Bool) { c.setCrashlyticsCollectionEnabled(on) }
    func setUserID(_ hashed: String?) { c.setUserID(hashed ?? "") }
    func log(_ message: String) { c.log(LKCrashPrivacy.scrub(message)) }
    func record(_ error: Error, context: String) {
        let n = error as NSError
        // domain + code + context only: localizedDescription may echo user input
        c.record(error: NSError(domain: n.domain, code: n.code, userInfo: ["context": LKCrashPrivacy.scrub(context)]))
    }
}
