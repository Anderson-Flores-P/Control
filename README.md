# Control Uni

Sistema personal de control académico **por materia**, con ciclos de **20 semanas** y respaldo entre ciclos.

## Cómo usarlo

```bash
npm install
npm run dev
```

## Modelo

- **Ciclo 1 / Ciclo 2** del año (20 semanas cada uno)
- Avance temporal según **inicio/fin** del ciclo (días lectivos vs calendario)
- **Festivos**: días sin clases que se restan del tiempo de estudio
- Dentro de cada ciclo: **materias**
- Dentro de cada materia: **foros**, **tareas** y **parciales** (manuales)
- Si una materia tiene parcial en la semana N → foros y tareas de esa semana quedan **desactivados**
- Podés **archivar** o exportar JSON del Ciclo 1 como respaldo ante problemas con la universidad

## Navegación

| Sección | Uso |
|--------|-----|
| Panel | Tiempo del ciclo + avance académico |
| Materias | Entrar a cada materia (foros / tareas / parciales / 20 semanas) |
| 20 Semanas | Matriz cruzada materia × semana |
| Festivos | Asuetos y feriados (días de descanso) |
| Ciclos | Activar, archivar, duplicar respaldo, exportar JSON |
| Configuración | Ajustes del ciclo activo |

Los datos viven en `localStorage` (`uni-control-v2`).
