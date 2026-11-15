import SwiftUI
import LKDesign
import LKStrings
import LKSync

/// C01 – sign-in sheet: Sign in with Apple + Google (Firebase, same project as the live app), or keep learning as a guest.
/// Asked softly, never blocking: every feature works without an account.
struct SignInSheet: View {
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        let auth = services.auth
        VStack(spacing: LKSpacing.spaceMd) {
            Capsule().fill(LKColor.outlineVariant.resolve(scheme)).frame(width: 40, height: 5).padding(.top, LKSpacing.spaceXs)
            Image(systemName: "icloud.and.arrow.up.fill").font(.system(size: 44, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme))
                .padding(.top, LKSpacing.spaceSm).accessibilityHidden(true)
            Text(t(.authPitch)).lkText(LKType.headlineSm).multilineTextAlignment(.center).foregroundStyle(LKColor.onSurface.resolve(scheme))
                .fixedSize(horizontal: false, vertical: true)
            if let e = auth.errorMessage {
                Text(e).lkText(LKType.bodySm).foregroundStyle(LKColor.error.resolve(scheme)).multilineTextAlignment(.center)
            }
            SignInButtons()
            Button(t(.actionLater)) { dismiss() }
                .lkText(LKType.titlePill).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).frame(minHeight: LKFrame.shared.minTap)
        }
        .padding(.horizontal, LKSpacing.spaceLg).padding(.bottom, LKSpacing.spaceMd)
        .frame(maxWidth: LKFrame.shared.width)
        .presentationDetents([.medium, .large])
        .presentationBackground(LKColor.surfaceContainer.resolve(scheme))
        .onChange(of: auth.user) { _, u in if u != nil { dismiss() } }
    }
}

struct SignInButtons: View {
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let auth = services.auth
        VStack(spacing: LKSpacing.spaceSm) {
            // Apple HIG: black on light, white on dark (semantic system colours, not brand colours)
            Button { Task { await auth.signIn(.apple, t: t) } } label: {
                row(icon: "apple.logo", text: t(.authApple), busy: auth.busy == .apple)
                    .foregroundStyle(Color(uiColor: .systemBackground))
                    .background(RoundedRectangle(cornerRadius: LKRadius.xl, style: .continuous).fill(Color(uiColor: .label)))
            }
            Button { Task { await auth.signIn(.google, t: t) } } label: {
                row(icon: "g.circle.fill", text: t(.authGoogle), busy: auth.busy == .google)
                    .foregroundStyle(LKColor.onSurface.resolve(scheme))
                    .background {
                        RoundedRectangle(cornerRadius: LKRadius.xl, style: .continuous).fill(LKColor.surfaceBright.resolve(scheme))
                        RoundedRectangle(cornerRadius: LKRadius.xl, style: .continuous).strokeBorder(LKColor.outlineVariant.resolve(scheme), lineWidth: 2)
                    }
            }
        }
        .buttonStyle(LKPressStyle())
        .disabled(auth.busy != nil)
    }
    func row(icon: String, text: String, busy: Bool) -> some View {
        HStack(spacing: LKSpacing.spaceXs) {
            if busy { ProgressView() } else { Image(systemName: icon).font(.system(size: 18, weight: .semibold)) }
            Text(text).lkText(LKType.titlePill)
        }
        .frame(maxWidth: .infinity, minHeight: 50)
    }
}

/// Me hub (M1 part of P11): account card – guest pitch / signed-in identity, sync status + Sync now, sign out, delete account.
struct MeHub: View {
    let tab: LKFrame.Tab
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let auth = services.auth
        VStack(spacing: 0) {
            TopBar(variant: .hub, title: t(L10nKey(rawValue: tab.label) ?? .tabMe))
            ScrollView {
                VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                    LKCard {
                        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                            Text(t(.meAccount)).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(LKColor.secondary.resolve(scheme))
                            if let u = auth.user {
                                HStack(spacing: LKSpacing.spaceSm) {
                                    Text(u.initial).lkText(LKType.headlineSm).foregroundStyle(LKColor.onSecondary.resolve(scheme))
                                        .frame(width: 44, height: 44).background(Circle().fill(LKColor.secondary.resolve(scheme)))
                                    VStack(alignment: .leading, spacing: 2) {
                                        if let n = u.displayName, !n.isEmpty { Text(n).lkText(LKType.titlePill) }
                                        if let e = u.email, !e.isEmpty { Text(e).lkText(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)) }
                                    }
                                }
                                Label { Text(statusText(auth.syncStatus)).lkText(LKType.bodySm) } icon: { Image(systemName: statusIcon(auth.syncStatus)) }
                                    .foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                                    .accessibilityElement(children: .combine)
                                Button(t(.syncNow)) { Task { await services.engine?.syncNow(); await services.today.refresh() } }
                                    .buttonStyle(PrimaryButtonStyle())
                                    .disabled(auth.syncStatus == .syncing)
                                Button(t(.authSignOut)) { Task { await auth.signOut() } }
                                    .lkText(LKType.titlePill).foregroundStyle(LKColor.onSurface.resolve(scheme)).frame(maxWidth: .infinity, minHeight: LKFrame.shared.minTap)
                                Button(t(.authDelete), role: .destructive) { services.deleteSheet = true }
                                    .lkText(LKType.bodyMd).foregroundStyle(LKColor.error.resolve(scheme)).frame(maxWidth: .infinity, minHeight: LKFrame.shared.minTap)
                            } else {
                                Text(t(.authPitch)).lkText(LKType.bodyMd).foregroundStyle(LKColor.onSurface.resolve(scheme)).fixedSize(horizontal: false, vertical: true)
                                if let e = auth.errorMessage { Text(e).lkText(LKType.bodySm).foregroundStyle(LKColor.error.resolve(scheme)) }
                                SignInButtons()
                            }
                        }
                        .foregroundStyle(LKColor.onSurface.resolve(scheme))
                    }
                }
                .padding(.horizontal, LKFrame.shared.gutter)
                .padding(.top, LKSpacing.spaceLg)
                .frame(maxWidth: LKFrame.shared.width)
                .frame(maxWidth: .infinity)
            }
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
    }
    func statusText(_ s: SyncStatus) -> String {
        switch s {
        case .syncing: t(.syncSyncing)
        case .ok: t(.syncSynced)
        case .idle: t(.syncBackedUp)
        case .paused, .error: t(.syncPaused)
        }
    }
    func statusIcon(_ s: SyncStatus) -> String {
        switch s {
        case .syncing: "arrow.triangle.2.circlepath"
        case .ok, .idle: "checkmark.icloud.fill"
        case .paused, .error: "icloud.slash"
        }
    }
}

/// Account deletion sheet (same content + safeguards as web account-delete.js: what is deleted, optional local wipe, "cannot be undone" tick).
struct DeleteAccountSheet: View {
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.dismiss) private var dismiss
    @State private var wipeLocal = false
    @State private var sure = false
    @State private var running = false
    @State private var message = ""
    var body: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            Text(t(.authDeleteTitle)).lkText(LKType.headlineMd).accessibilityAddTraits(.isHeader)
            if let e = services.auth.user?.email { Text(e).lkText(LKType.bodySm).environment(\.layoutDirection, .leftToRight) }
            Text(t(.authDeleteWhat)).lkText(LKType.bodyMd)
            ForEach([t(.authDeleteData), t(.authDeleteProfile), t(.authDeleteLeague)], id: \.self) { line in
                Label { Text(line).lkText(LKType.bodySm) } icon: { Image(systemName: "minus.circle.fill").foregroundStyle(LKColor.error.resolve(scheme)) }
            }
            Toggle(isOn: $wipeLocal) { Text(t(.authDeleteLocal)).lkText(LKType.bodyMd) }.frame(minHeight: LKFrame.shared.minTap)
            Toggle(isOn: $sure) { Text(t(.authDeleteSure)).lkText(LKType.titlePill) }.frame(minHeight: LKFrame.shared.minTap)
            Text(message).lkText(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).frame(minHeight: 18)
                .accessibilityAddTraits(.updatesFrequently)
            HStack(spacing: LKSpacing.spaceSm) {
                Button(t(.actionCancel)) { dismiss() }.frame(maxWidth: .infinity, minHeight: LKFrame.shared.minTap).disabled(running)
                Button(t(.authDeleteGo), role: .destructive) { run() }
                    .lkText(LKType.titlePill)
                    .frame(maxWidth: .infinity, minHeight: LKFrame.shared.minTap)
                    .foregroundStyle(LKColor.onError.resolve(scheme))
                    .background(RoundedRectangle(cornerRadius: LKRadius.xl).fill(LKColor.error.resolve(scheme)).opacity(sure && !running ? 1 : 0.45))
                    .disabled(!sure || running)
            }
        }
        .tint(LKColor.secondary.resolve(scheme))
        .foregroundStyle(LKColor.onSurface.resolve(scheme))
        .padding(LKSpacing.spaceLg)
        .presentationDetents([.large])
        .presentationBackground(LKColor.surfaceContainer.resolve(scheme))
        .interactiveDismissDisabled(running)
    }
    func run() {
        guard let engine = services.engine, let repo = services.repo else { return }
        running = true
        let del = AccountDeletion(auth: services.auth.auth, engine: engine, store: repo)
        let wipe = wipeLocal, tt = t
        Task {
            do {
                try await del.run(wipeLocal: wipe) { step in
                    await MainActor.run { message = step == .reauth ? tt(.authDeleteReauth) : step == .deleting ? tt(.authDeleting) : tt(.authDeleted) }
                }
                services.localChange()
                try? await Task.sleep(nanoseconds: 900_000_000)
                dismiss()
            } catch LKAuthError.cancelled {
                message = ""
            } catch {
                services.crash?.record(error, context: "deleteAccount")
                message = tt(.authFailed, ["msg": AuthModel.describe(error)])
            }
            running = false
        }
    }
}
