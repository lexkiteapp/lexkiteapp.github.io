package com.lexkite.app.core.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Index
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

/**
 * One row per card (key = web Core cardKey: lower-case, apostrophes straightened, `<tl>:` prefix for non-English targets).
 * `json` is the card exactly as web Cards.make/slim stores it (word, ipa, pos, vi, def, ex, col, syn, level, topic, emoji, image,
 * imageCredit, audio, contexts, note, added, mod, tl, srs{ef,interval,reps,lapses,due,last,step,S,D}, L …) – every field kept, so
 * a round-trip web → native → web is byte-identical. The other columns are indexes derived from it for fast queries.
 */
@Entity(tableName = "cards", indices = [Index("due"), Index("activity")])
data class CardEntity(
    @PrimaryKey val key: String,
    val word: String,
    val tl: String?,
    val due: Long,
    val reps: Int,
    val last: Long,
    val activity: Long,
    val json: String,
)

/** Every other web Store key (stats, game, settings, settingsAt, deleted, mistakes, pulledHashes, lastUid, …) as JSON text. */
@Entity(tableName = "kv")
data class KvEntity(@PrimaryKey val k: String, val json: String)

@Dao
interface CardDao {
    @Query("SELECT * FROM cards") suspend fun all(): List<CardEntity>
    @Query("SELECT COUNT(*) FROM cards") suspend fun count(): Int
    @Query("SELECT COUNT(*) FROM cards") fun countFlow(): Flow<Int>
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun upsert(rows: List<CardEntity>)
    @Query("DELETE FROM cards WHERE `key` IN (:keys)") suspend fun delete(keys: List<String>)
    @Query("DELETE FROM cards") suspend fun clear()
}

@Dao
interface KvDao {
    @Query("SELECT * FROM kv") suspend fun all(): List<KvEntity>
    @Query("SELECT json FROM kv WHERE k = :k") suspend fun get(k: String): String?
    @Query("SELECT * FROM kv") fun allFlow(): Flow<List<KvEntity>>
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun put(rows: List<KvEntity>)
    @Query("DELETE FROM kv WHERE k IN (:keys)") suspend fun delete(keys: List<String>)
}

@Database(entities = [CardEntity::class, KvEntity::class], version = 1, exportSchema = false)
abstract class LexDb : RoomDatabase() {
    abstract fun cards(): CardDao
    abstract fun kv(): KvDao

    companion object {
        const val NAME = "lexkite.db"
        fun open(ctx: Context): LexDb = Room.databaseBuilder(ctx.applicationContext, LexDb::class.java, NAME).build()
        fun memory(ctx: Context): LexDb = Room.inMemoryDatabaseBuilder(ctx.applicationContext, LexDb::class.java).allowMainThreadQueries().build()
    }
}
