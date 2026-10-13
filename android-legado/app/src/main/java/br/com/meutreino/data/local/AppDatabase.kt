package br.com.meutreino.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import br.com.meutreino.data.model.*

@Database(
    entities = [Exercicio::class, Treino::class, TreinoExercicio::class,
        SeriePlanejada::class, Sessao::class, SerieRealizada::class],
    version = 1,
    exportSchema = true
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun exercicioDao(): ExercicioDao
    abstract fun treinoDao(): TreinoDao
    abstract fun sessaoDao(): SessaoDao

    companion object {
        @Volatile private var instancia: AppDatabase? = null
        fun obter(context: Context): AppDatabase = instancia ?: synchronized(this) {
            instancia ?: Room.databaseBuilder(context.applicationContext, AppDatabase::class.java, "meutreino.db")
                // Futuras versões devem usar addMigrations(...) para nunca perder o histórico.
                .build().also { instancia = it }
        }
    }
}
