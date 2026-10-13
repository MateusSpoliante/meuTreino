package br.com.meutreino.data.model

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/** Catálogo de exercícios (biblioteca + personalizados). */
@Entity(tableName = "exercicios", indices = [Index("nome", unique = true)])
data class Exercicio(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val nome: String,
    val grupoMuscular: String,
    val personalizado: Boolean = false
)

/** Treino planejado (A, B, C...). diasSemana é uma máscara de bits: bit0=Dom ... bit6=Sáb. */
@Entity(tableName = "treinos")
data class Treino(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val nome: String,
    val posicao: Int = 0,
    val diasSemana: Int = 0,
    val arquivado: Boolean = false
)

/** Exercício dentro de um treino, com ordem, descanso e observação. */
@Entity(
    tableName = "treino_exercicios",
    foreignKeys = [
        ForeignKey(entity = Treino::class, parentColumns = ["id"], childColumns = ["treinoId"], onDelete = ForeignKey.CASCADE),
        ForeignKey(entity = Exercicio::class, parentColumns = ["id"], childColumns = ["exercicioId"], onDelete = ForeignKey.RESTRICT)
    ],
    indices = [Index("treinoId"), Index("exercicioId")]
)
data class TreinoExercicio(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val treinoId: Long,
    val exercicioId: Long,
    val posicao: Int,
    val descansoSegundos: Int = 60,
    val observacao: String = ""
)

/** Série planejada (repetições e peso desejados). */
@Entity(
    tableName = "series_planejadas",
    foreignKeys = [ForeignKey(entity = TreinoExercicio::class, parentColumns = ["id"], childColumns = ["treinoExercicioId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("treinoExercicioId")]
)
data class SeriePlanejada(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val treinoExercicioId: Long,
    val numero: Int,
    val repeticoes: Int,
    val pesoKg: Double
)

/** Sessão = treino realmente executado. Guarda cópia do nome para o histórico não mudar. */
@Entity(tableName = "sessoes", indices = [Index("iniciadaEm")])
data class Sessao(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val treinoId: Long?,
    val nomeTreino: String,
    val iniciadaEm: Long,
    val finalizadaEm: Long? = null,
    val exercicioAtual: Int = 0,
    val observacoes: String = ""
)

/** Série realizada: planejado x executado ficam lado a lado. */
@Entity(
    tableName = "series_realizadas",
    foreignKeys = [ForeignKey(entity = Sessao::class, parentColumns = ["id"], childColumns = ["sessaoId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("sessaoId"), Index("exercicioId")]
)
data class SerieRealizada(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessaoId: Long,
    val exercicioId: Long,
    val nomeExercicio: String,
    val posicaoExercicio: Int,
    val numero: Int,
    val repeticoesPlanejadas: Int,
    val pesoPlanejadoKg: Double,
    val repeticoesFeitas: Int? = null,
    val pesoFeitoKg: Double? = null,
    val concluida: Boolean = false,
    val concluidaEm: Long? = null
)
