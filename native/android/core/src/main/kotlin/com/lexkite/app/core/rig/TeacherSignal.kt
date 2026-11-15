package com.lexkite.app.core.rig

import java.util.concurrent.ConcurrentLinkedQueue

/**
 * Commands from the lesson/audio layer to the teacher view (C05). Thread-safe queue; the view drains it once per frame
 * (the Rive-style inputs of the web rig: speak / gesture / emotion / listen / quiet).
 */
class TeacherSignal {
    sealed interface Cmd {
        /** One audible piece: [clock] seconds since it started, [playing] while audible, [dur] seconds (0 = unknown → live lip sync). */
        class Speak(val text: String, val dur: Double, val clock: () -> Double, val playing: () -> Boolean) : Cmd
        /** Pose/emotion by mood name (cheer, concern, encourage, laugh, empathy, thinking …); null = back to the live face. */
        class Pose(val name: String?) : Cmd
        class Gesture(val name: String) : Cmd
        class Listen(val on: Boolean) : Cmd
        data object Quiet : Cmd
    }

    private val q = ConcurrentLinkedQueue<Cmd>()
    fun send(c: Cmd) { q.add(c); while (q.size > 16) q.poll() }
    fun poll(): Cmd? = q.poll()
    fun speak(text: String, dur: Double, clock: () -> Double, playing: () -> Boolean) = send(Cmd.Speak(text, dur, clock, playing))
    fun pose(name: String?) = send(Cmd.Pose(name))
    fun quiet() = send(Cmd.Quiet)
    val pending: Boolean get() = q.isNotEmpty()
}
