import SwiftUI

/// C09 – haptics for learning moments (correct / wrong / lesson complete / taps), through SwiftUI `sensoryFeedback`,
/// which already honours the system "System Haptics" switch and plays nothing on devices without a Taptic Engine.
/// The in-app switch (Me › Settings, M6) flows in through `\.lkHapticsEnabled`.
public enum LKHaptic: Equatable, Sendable, CaseIterable {
    case correct, wrong, complete, tap, select

    /// One mapping for the whole app (same moments as Android HapticFeedbackConstants CONFIRM/REJECT/…).
    public var feedback: SensoryFeedback {
        switch self {
        case .correct: .success
        case .wrong: .error
        case .complete: .impact(weight: .heavy, intensity: 0.9)
        case .tap: .impact(flexibility: .soft, intensity: 0.6)
        case .select: .selection
        }
    }
    public func feedback(enabled: Bool) -> SensoryFeedback? { enabled ? feedback : nil }
}

private struct HapticsEnabledKey: EnvironmentKey { static let defaultValue = true }
public extension EnvironmentValues {
    var lkHapticsEnabled: Bool { get { self[HapticsEnabledKey.self] } set { self[HapticsEnabledKey.self] = newValue } }
}

private struct HapticModifier<T: Equatable>: ViewModifier {
    let haptic: LKHaptic, trigger: T, when: (T) -> Bool
    @Environment(\.lkHapticsEnabled) private var enabled
    func body(content: Content) -> some View {
        content.sensoryFeedback(trigger: trigger) { _, new in when(new) ? haptic.feedback(enabled: enabled) : nil }
    }
}

public extension View {
    /// Play `haptic` whenever `trigger` changes (optionally only when the new value passes `when`, e.g. on press-down only).
    func lkHaptic<T: Equatable>(_ haptic: LKHaptic, trigger: T, when: @escaping (T) -> Bool = { _ in true }) -> some View {
        modifier(HapticModifier(haptic: haptic, trigger: trigger, when: when))
    }
}
