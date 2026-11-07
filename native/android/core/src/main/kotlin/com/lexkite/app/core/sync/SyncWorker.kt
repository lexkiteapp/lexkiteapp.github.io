package com.lexkite.app.core.sync

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/** Implemented by the Application: gives background work the one process-wide engine. */
interface SyncHost { val syncEngine: SyncEngine }

/** Background sync (offline queue): runs when the network is back, retried with exponential backoff, never loses local data. */
class SyncWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val host = applicationContext as? SyncHost ?: return Result.failure()
        return if (host.syncEngine.sync(inputData.getString("why") ?: "worker")) Result.success() else Result.retry()
    }
}

object SyncScheduler {
    private const val SOON = "lk-sync-soon"
    private const val PERIODIC = "lk-sync"
    private val net = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

    /** After a local change: batch like web `Sync.schedule` (d1Every) – one pending push, not one per answer. */
    fun soon(ctx: Context, delayMs: Long) {
        val req = OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(net).setInitialDelay(delayMs, TimeUnit.MILLISECONDS)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build()
        WorkManager.getInstance(ctx).enqueueUniqueWork(SOON, ExistingWorkPolicy.KEEP, req)
    }

    /** Now (app start, sign-in, manual "Sync now"): replaces a pending batched run. */
    fun now(ctx: Context) {
        val req = OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(net).setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build()
        WorkManager.getInstance(ctx).enqueueUniqueWork(SOON, ExistingWorkPolicy.REPLACE, req)
    }

    /** Keeps other devices' changes flowing in while the app is closed (≥ 15 min is the platform minimum; 6 h is enough for learning data). */
    fun periodic(ctx: Context) {
        val req = PeriodicWorkRequestBuilder<SyncWorker>(6, TimeUnit.HOURS).setConstraints(net).build()
        WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, req)
    }

    fun cancel(ctx: Context) { WorkManager.getInstance(ctx).cancelUniqueWork(SOON) }
}
