import SwiftUI
import UIKit
import GoogleSignIn
import LKFeatures
import LKSync
import LKStore
import LKCore

@main
struct LexkiteApp: App {
    @State private var services: AppServices
    @Environment(\.scenePhase) private var phase
    private let migrationScript: String?

    init() {
        let config = SyncConfig()
        let firebase = FirebaseAuthService.configure()
        let crash: LKCrash? = firebase ? CrashlyticsReporter() : nil
        let remote: LKRemoteConfig = firebase ? FirebaseRemoteFlags() : DefaultRemoteConfig()
        let auth: LKAuth = firebase ? FirebaseAuthService(driveScope: remote.bool(.syncDriveEnabled)) : GuestAuth()
        // signed server content: public key = web/js/ota-key.js (injected into Info.plist at build time by project.yml), CDN base optional
        let info = Bundle.main.infoDictionary ?? [:]
        let content = ContentStore.Config(publicKeySPKI: info["LKContentKeySPKI"] as? String ?? "",
                                          baseURL: (info["LKContentBaseURL"] as? String).flatMap { $0.isEmpty ? nil : URL(string: $0) })
        let s: AppServices
        do { s = try AppServices.live(auth: auth, crash: crash, remote: remote, config: config, content: content) }
        catch {
            // disk store could not open: keep the app usable in memory (data of this session is still synced when signed in)
            crash?.record(error, context: "swiftdata-open")
            s = (try? AppServices.live(auth: auth, crash: crash, remote: remote, config: config, content: content, inMemory: true))
                ?? AppServices.preview(snapshot: TodaySnapshot())
        }
        _services = State(initialValue: s)
        // C03: export script generated from web (native/shared/gen/migration-export.js), bundled as a resource by project.yml
        migrationScript = Bundle.main.url(forResource: "migration-export", withExtension: "js").flatMap { try? String(contentsOf: $0, encoding: .utf8) }
    }

    var body: some Scene {
        WindowGroup {
            RootView(services: services, handleURL: { GIDSignIn.sharedInstance.handle($0) })
                .task {
                    if let repo = services.repo, services.remote.bool(.migrationCapacitorEnabled) {
                        await LegacyMigration.runIfNeeded(repo: repo, script: migrationScript, crash: services.crash)
                    }
                    await services.loadPreferences()
                    await services.today.refresh()
                    await services.loadContent()
                }
        }
        .onChange(of: phase) { _, p in
            switch p {
            case .background:
                // push pending changes now (web pushes on pagehide); ask iOS for the few seconds it needs
                let id = UIApplication.shared.beginBackgroundTask(withName: "lexkite-sync")
                Task {
                    await services.engine?.flush()
                    UIApplication.shared.endBackgroundTask(id)
                }
            case .active:
                Task { await services.today.refresh() }
            default: break
            }
        }
    }
}
