---
title: "Repetición espaciada para aprender inglés: método FSRS"
description: "Repetición espaciada para aprender inglés: qué dice la curva del olvido de Ebbinghaus, cómo funciona FSRS y cómo crear tarjetas que no olvidas."
slug: repeticion-espaciada-para-aprender-ingles-fsrs
lang: es
translationKey: lap-lai-ngat-quang
category: phuong-phap
tags: [spaced-repetition, fsrs, vocabulario, metodo]
keyword: "repetición espaciada para aprender inglés"
cover: method
coverAlt: "Método Lexkite: rutina diaria de unos 30 minutos, curva del olvido y equilibrio de las cuatro destrezas"
publishAt: 2027-01-06T08:14:00-06:00
factChecked: 2026-11-05
author: Lexkite
status: ready
qualityScore: 91
quiz: [
  {
    q: "¿Qué postula la 'Curva del Olvido' descubierta empíricamente por Hermann Ebbinghaus?",
    options: [
      "Sin repasar se olvida rápido, y cada repaso a tiempo frena el olvido.",
      "La memoria visual retiene cualquier palabra para siempre sin repasar.",
      "Estudiar diez horas seguidas en una sola sesión garantiza recordarlo siempre.",
      "El olvido del vocabulario solo afecta a las personas de edad avanzada."
    ],
    answer: 0,
    explain: "En los experimentos de Ebbinghaus (1885) el olvido era rápido al principio y más lento después, y repasar antes de olvidar aplanaba la curva. Las demás opciones contradicen esos resultados."
  },
  {
    q: "Según la investigación sobre la memoria y el sistema SRS/FSRS, ¿cuál es el momento idóneo para revisar una palabra?",
    options: [
      "Justo antes de olvidarla, cuando aún cuesta un poco recordarla.",
      "Diez minutos antes de acostarse todas las noches, sin excepción.",
      "Una vez cada trimestre, repasando listas alfabéticas impresas.",
      "Únicamente la víspera de presentarse a un examen oficial como IELTS o TOEFL."
    ],
    answer: 0,
    explain: "Recordar con algo de esfuerzo (*desirable difficulty*, dificultad deseable) refuerza más la memoria que repasar algo que aún está fresco. Por eso los sistemas SRS programan el repaso cerca del punto de olvido."
  },
  {
    q: "¿Cuál es la principal ventaja técnica del algoritmo FSRS frente al clásico sistema SM-2 de los años 80?",
    options: [
      "Estima la dificultad y el recuerdo de cada tarjeta con tu historial.",
      "Elimina por completo la necesidad de hacer repasos cada día.",
      "Sustituye la evocación activa por la simple lectura pasiva de textos.",
      "Exige el uso de servidores cuánticos dedicados para funcionar."
    ],
    answer: 0,
    explain: "FSRS (Free Spaced Repetition Scheduler) estima cuándo bajará tu probabilidad de recuerdo de cada tarjeta. Según las pruebas del propio proyecto, suele necesitar menos repasos que SM-2 para la misma retención, aunque varía según la persona."
  }
]
---

Si memorizas una lista de vocabulario en una tarde, una semana después recordarás muy poco. La **repetición espaciada para aprender inglés** resuelve ese problema: repasas cada palabra justo antes de olvidarla, con intervalos cada vez más largos, y así retienes más con menos tiempo. Esta guía explica por qué funciona, cómo la calcula el algoritmo FSRS y cómo crear tarjetas que realmente se recuerdan.

El cerebro olvida lo que no vuelve a usar. Leer un glosario o subrayar palabras da una falsa sensación de dominio (las reconoces al verlas), pero se desvanece cuando intentas hablar o escribir. La investigación sobre la memoria apunta a dos ingredientes: la evocación activa (*active recall*, intentar recordar antes de mirar la respuesta) y repasos bien espaciados en el tiempo.

A continuación verás la curva del olvido de Ebbinghaus, la evolución del clásico SM-2 al moderno FSRS (*Free Spaced Repetition Scheduler*) y cómo aplicar todo esto en tu rutina diaria.

![Sesión de repaso de flashcards de Lexkite con la palabra pollution, su transcripción, un botón para voltear la tarjeta y una barra de progreso](media:review "En una sesión de repaso ves la tarjeta, intentas recordar y la volteas para comprobar")

## La base biológica del aprendizaje: la curva del olvido de Ebbinghaus

En 1885, el psicólogo alemán Hermann Ebbinghaus hizo experimentos pioneros sobre la memoria: aprendió listas de sílabas sin sentido y midió cuánto retenía pasado un tiempo. Sus resultados dieron origen a la **curva del olvido**.

Su hallazgo clave es que el olvido es muy rápido al principio y se frena después. Las cifras aproximadas de sus datos son (ojo: Ebbinghaus midió el «ahorro» al reaprender, no un examen directo de recuerdo, así que tómalas como orden de magnitud):
- A los **20 minutos** de haber estudiado, se disipa cerca del 42% del contenido nuevo.
- A las **24 horas**, sin ningún repaso, se había perdido cerca de dos tercios de lo estudiado.
- Al cabo de **7 días**, apenas permanece accesible entre un 20% y un 30% del material estudiado.

Otro hallazgo importante: cada vez que repasas antes de olvidar del todo, la curva se aplana. Con cada repaso, el recuerdo se debilita más despacio y puedes esperar más hasta el siguiente. Esa es la idea de la repetición espaciada.

## Repetición masiva frente a repetición espaciada

Lo habitual es la práctica masiva (*massed practice*, el «atracón de estudio» la víspera): estudiar cuatro horas seguidas antes de un examen o memorizar 100 palabras en una tarde. Puede funcionar en un test inmediato, pero lo aprendido se pierde en pocos días.

La práctica distribuida (*spaced repetition*) reparte el mismo tiempo en sesiones cortas, por ejemplo de 10 a 15 minutos, a lo largo de días, semanas y meses. Las cifras de la tabla son ilustrativas, no medidas.

| Dimensión | Estudio masivo | Repetición espaciada (SRS) |
|---|---|---|
| **Distribución temporal** | Sesiones prolongadas e infrecuentes (3-5 horas seguidas) | Sesiones breves y diarias (10-15 minutos) |
| **Mecanismo cognitivo** | Releer y subrayar | Evocación activa (*active recall*) bajo esfuerzo deliberado |
| **Efecto en la memoria** | Buen rendimiento inmediato, olvido rápido después | Recuerdo más duradero gracias al efecto de espaciado |
| **Retención al cabo de semanas** | Baja: se olvida la mayor parte | Mayor: el algoritmo apunta a la retención objetivo que elijas (p. ej., 90%) |
| **Fatiga mental** | Cansancio y abandono frecuente | Hábito sostenible integrado en la rutina diaria |

El principio que lo explica es la **dificultad deseable** (*desirable difficulty*): recordar con un poco de esfuerzo, cuando la palabra está a punto de olvidarse, refuerza la memoria más que repasar algo que aún tienes fresco. Por eso conviene repasar justo cuando cuesta un poco, y no antes.

## De SM-2 a FSRS: cómo ha evolucionado la repetición espaciada

Durante décadas el estándar fue el algoritmo **SM-2**, creado por Piotr Wozniak en 1987 para SuperMemo y base del Anki clásico. Más recientemente apareció **FSRS (Free Spaced Repetition Scheduler)**, un programador de repasos de código abierto desarrollado por Jarrett Ye y la comunidad open-spaced-repetition, que Anki integra de forma nativa desde la versión 23.10.

### Las limitaciones históricas del algoritmo SM-2

SM-2 fue un gran avance, pero tiene limitaciones:

1. **Factor de facilidad rígido (*Ease Factor*)**: Usa un multiplicador de intervalo que se ajusta con reglas fijas. La comunidad de Anki describe el *ease hell* («infierno de facilidad»): tarjetas que, tras varios fallos, quedan con intervalos demasiado cortos.
2. **Sin retención objetivo**: no permite elegir qué porcentaje quieres recordar (por ejemplo, 90% en lugar de 80%) y calcular los intervalos a partir de esa meta.
3. **Los fallos reinician casi todo**: si olvidas una tarjeta antigua que ya dominabas, SM-2 reduce mucho el intervalo, aunque, según los autores de FSRS, ese recuerdo suele recuperarse con rapidez.

### Cómo funciona el modelo cognitivo DSR del algoritmo FSRS

**FSRS** sustituye esas reglas fijas por un modelo matemático de la memoria, ajustado con registros de repaso reales, que usa tres variables (*modelo DSR*):

- **D (Difficulty - Dificultad intrínseca)**: Cuánto cuesta una palabra concreta para ti, en una escala de 1 a 10. Un falso amigo o un término abstracto tendrá una dificultad más alta que una palabra intuitiva.
- **S (Stability - Estabilidad temporal)**: Es el número de días que tarda la probabilidad de recuerdo en bajar del 100% al 90%. Cuanto más repasas con éxito, más crece.
- **R (Retrievability - Probabilidad de recuperación)**: Es la probabilidad estimada de que recuerdes la palabra hoy. Disminuye a medida que pasan los días desde el último repaso.

Con estas tres variables, FSRS programa el repaso para cuando tu probabilidad de recuerdo baja a la retención que elegiste (por ejemplo, 90%). Según las pruebas comparativas publicadas por el propio proyecto FSRS, esto permite **hacer menos repasos que con SM-2 para el mismo nivel de retención**; la diferencia exacta depende de cada persona y de cada mazo. Además, puedes elegir tu retención deseada (por ejemplo, 85% o 90%) y el algoritmo ajusta los intervalos en consecuencia.

## Diseño óptimo de tarjetas para maximizar la retención

Un buen algoritmo no compensa unas tarjetas mal hechas (*flashcards*). Tres reglas ayudan:

### 1. El principio de mínima información

No pongas varios significados, una familia de palabras y tres sinónimos en una sola tarjeta. Cada tarjeta debe hacer una sola pregunta. Si evalúa varias cosas a la vez, tardas en responder y no sabes si de verdad la recordaste.

### 2. Contextualización en frases reales frente a palabras sueltas

Evita palabras aisladas como *"eventually = eventualmente"*, que además es un falso amigo. Se recuerda mejor una palabra con su contexto, así que incluye una frase:

> **Frente (Anverso):**  
> *We waited for an hour, and ___________ the bus arrived.*  
> *(Pista: al final, tras mucho esperar)*  
>  
> **Reverso:**  
> **eventually** (/ɪˈventʃuəli/ - adverbio)  
> Significado: al final, finalmente. No es «eventualmente» (eso sería *possibly* u *occasionally*).  
> *Colocación frecuente: and eventually, eventually decided.*

Para hispanohablantes, el vocabulario parecido al español es una ventaja (cientos de palabras de origen latino se entienden a la primera: *information*, *important*). Las mejores candidatas a tarjeta son los **falsos amigos**, porque el error se repite durante años si no se corrige: *actually* (en realidad, no "actualmente" = *currently*), *embarrassed* (avergonzado, no "embarazada" = *pregnant*), *library* (biblioteca, no "librería" = *bookshop*) o *assist* (ayudar, no "asistir" a clase = *attend*). Pon en el anverso una frase con hueco y en el reverso el contraste con la palabra española.

### 3. Incorporación de audio y transcripción fonética IPA

Saber una palabra incluye saber cómo suena. Añade a cada tarjeta la transcripción IPA y un audio, británico o americano. Para un hispanohablante esto importa de verdad: las vocales y consonantes inglesas no se leen como se escriben, y sin audio es fácil memorizar la pronunciación equivocada.

![Entrada del diccionario Lexkite para resilient con transcripción británica y americana, audio, significado, frases de ejemplo y botón para guardar como flashcard](media:dict "Una entrada de diccionario reúne IPA, audio, ejemplos y la opción de guardar la palabra como flashcard")

## Errores habituales que arruinan la repetición espaciada

Muchos autodidactas abandonan la repetición espaciada a las pocas semanas por errores fáciles de evitar:

1. **La trampa del coleccionista de tarjetas (*Card Hoarding*)**  
   Descargar mazos de miles de palabras hechos por otros y estudiarlos sin conocer el contexto es una causa muy frecuente de abandono. Suele funcionar mejor el vocabulario que encuentras tú al leer, escuchar o prepararte para un examen.
2. **Romper la constancia diaria acumulando deudas de repaso**  
   Si dejas pasar varios días sin abrir la aplicación, se acumula una pila de tarjetas pendientes que desanima. Es mejor repasar 10 minutos cada día que resolver una avalancha una vez por semana. Si te atrasas, retoma con una cantidad pequeña y deja que el programa te devuelva al ritmo.
3. **Evaluar con benevolencia excesiva (*Falsa familiaridad*)**  
   Al ver la respuesta es tentador pensar *"la sabía, solo dudé un segundo"* y pulsar «fácil». Eso engaña al algoritmo, que alargará el intervalo demasiado y olvidarás la palabra. Sé honesto en cada valoración.
4. **Olvidar la práctica de producción libre**  
   La repetición espaciada ayuda a retener vocabulario, pero no sustituye hablar ni escribir. Usa las palabras nuevas en frases propias, en voz alta o por escrito.

![Pantalla de progreso de Lexkite con nivel, XP, racha de días, tarjetas repasadas, calendario de estudio y previsión de tarjetas pendientes](media:stats "La pantalla de progreso muestra el calendario de estudio y las tarjetas que vencerán en los próximos días")

## Repetición espaciada para aprender inglés en Lexkite

Lexkite incluye repaso de flashcards con repetición espaciada. Una rutina sencilla:

- Empieza por la [sesión de repaso](/#/review): ves las tarjetas que toca repasar hoy, intentas recordar y volteas la tarjeta.
- Cuando encuentres una palabra nueva, búscala en el [diccionario](/#/dict), donde verás la pronunciación IPA británica y americana, ejemplos y colocaciones, y puedes guardarla como flashcard.
- Para usar las palabras en voz alta, di la frase de tu mazo en la [práctica de pronunciación](/#/practice/speak) con el micrófono y mira la puntuación.

Para seguir leyendo: [cómo aprender vocabulario en inglés](/es/blog/como-aprender-vocabulario-en-ingles/), [cómo pensar en inglés sin traducir](/es/blog/como-pensar-en-ingles-sin-traducir/), [collocations en inglés para IELTS](/es/blog/collocations-en-ingles-para-ielts/), [falsos amigos inglés-español](/es/blog/falsos-amigos-ingles-espanol/) y [inglés para gestionar el tiempo en el trabajo](/es/blog/gestion-del-tiempo-en-ingles-en-el-trabajo/). Las listas de vocabulario por nivel están en la [biblioteca](/#/library) y, en la web, en [vocabulario](/en/vocabulary/) (lista de palabras en inglés).

{{cta: /#/review | Abre tu sesión de repaso de flashcards}}

{{youtube: | Cómo funciona la repetición espaciada y el algoritmo FSRS para aprender inglés}}

## Preguntas frecuentes

### ¿Cuántas palabras nuevas debo añadir al día?
No hay una cifra oficial. Como orientación, empieza con pocas (por ejemplo 10 al día) y sube solo si terminas los repasos sin agobio: cuantas más palabras nuevas añades, más repasos se acumulan en los días siguientes.

### ¿Cuánto tiempo al día debo dedicar a los repasos?
Con 10 a 15 minutos diarios suele bastar para vaciar la cola si añades pocas palabras nuevas. Más que la duración, importa la regularidad.

### ¿Sirve solo para vocabulario o también para gramática?
También sirve para estructuras y expresiones frecuentes (*conditional clauses*, verbos con preposición, frases hechas). Crea tarjetas con huecos (*cloze*): una frase con la palabra o estructura omitida, para que la completes tú.

### Soy hispanohablante: ¿hago tarjetas de las palabras que ya se parecen al español?
Para las que se parecen y significan lo mismo (*information*, *hospital*) no hace falta una tarjeta de significado; como mucho, una de pronunciación. Dedica tarjetas a lo que te engaña: los falsos amigos (*actually*, *library*, *assist*, *embarrassed*) y las palabras parecidas cuyo acento o pronunciación cambia (*animal*, *important*). Anota en la tarjeta la palabra española que te hace equivocarte.
