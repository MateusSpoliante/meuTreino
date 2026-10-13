package br.com.meutreino.data.local

import androidx.room.*
import br.com.meutreino.data.model.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ExercicioDao {
    @Query("SELECT * FROM exercicios ORDER BY nome")
    fun observarTodos(): Flow<List<Exercicio>>
    @Query("SELECT * FROM exercicios WHERE nome LIKE '%' || :busca || '%' ORDER BY nome")
    fun buscar(busca: String): Flow<List<Exercicio>>
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun inserir(e: Exercicio): Long
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun inserirTodos(lista: List<Exercicio>)
    @Update suspend fun atualizar(e: Exercicio)
    @Delete suspend fun excluir(e: Exercicio)
}

@Dao
interface TreinoDao {
    @Query("SELECT * FROM treinos WHERE arquivado = 0 ORDER BY posicao")
    fun observarTreinos(): Flow<List<Treino>>
    @Query("SELECT * FROM treino_exercicios WHERE treinoId = :treinoId ORDER BY posicao")
    suspend fun exerciciosDoTreino(treinoId: Long): List<TreinoExercicio>
    @Query("SELECT * FROM series_planejadas WHERE treinoExercicioId = :id ORDER BY numero")
    suspend fun seriesPlanejadas(id: Long): List<SeriePlanejada>
    @Insert suspend fun inserir(t: Treino): Long
    @Insert suspend fun inserir(te: TreinoExercicio): Long
    @Insert suspend fun inserirSeries(s: List<SeriePlanejada>)
    @Update suspend fun atualizar(t: Treino)
    @Update suspend fun atualizar(te: TreinoExercicio)
    @Query("DELETE FROM series_planejadas WHERE treinoExercicioId = :id")
    suspend fun limparSeries(id: Long)
    @Query("DELETE FROM treino_exercicios WHERE id = :id")
    suspend fun removerExercicio(id: Long)
    /** Arquiva em vez de apagar, para não perder o histórico. */
    @Query("UPDATE treinos SET arquivado = 1 WHERE id = :id")
    suspend fun arquivar(id: Long)
}

@Dao
interface SessaoDao {
    @Insert suspend fun inserir(s: Sessao): Long
    @Insert suspend fun inserirSeries(s: List<SerieRealizada>)
    @Update suspend fun atualizar(s: Sessao)
    @Update suspend fun atualizar(s: SerieRealizada)
    @Query("SELECT * FROM sessoes WHERE finalizadaEm IS NULL ORDER BY iniciadaEm DESC LIMIT 1")
    fun observarEmAndamento(): Flow<Sessao?>
    @Query("SELECT * FROM sessoes WHERE finalizadaEm IS NOT NULL ORDER BY iniciadaEm DESC")
    fun observarHistorico(): Flow<List<Sessao>>
    @Query("SELECT * FROM series_realizadas WHERE sessaoId = :id ORDER BY posicaoExercicio, numero")
    fun observarSeries(id: Long): Flow<List<SerieRealizada>>
    /** Últimas séries concluídas de um exercício (para mostrar "peso anterior"). */
    @Query("""SELECT * FROM series_realizadas
              WHERE exercicioId = :exercicioId AND concluida = 1 AND sessaoId != :ignorarSessao
              ORDER BY concluidaEm DESC LIMIT :limite""")
    suspend fun ultimasSeries(exercicioId: Long, ignorarSessao: Long, limite: Int = 10): List<SerieRealizada>
    @Query("""SELECT MAX(pesoFeitoKg) FROM series_realizadas
              WHERE exercicioId = :exercicioId AND concluida = 1""")
    suspend fun recordeCarga(exercicioId: Long): Double?
    @Query("DELETE FROM sessoes WHERE id = :id")
    suspend fun excluir(id: Long)
}
