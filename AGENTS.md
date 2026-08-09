# Coordinación de agentes

Este repositorio se usa como fuente de verdad compartida entre CLIs.

## Al iniciar una tarea

1. Ejecuta `git status --short` y revisa los últimos commits.
2. Lee `docs/AGENT_HANDOFF.md`.
3. No sobrescribas cambios sin confirmar de otro agente. Si el trabajo será paralelo, usa una rama y un `git worktree` independientes.

## Al finalizar una tarea

1. Ejecuta las verificaciones pertinentes y anota su resultado en el handoff.
2. Actualiza `docs/AGENT_HANDOFF.md` con los archivos modificados, el siguiente paso y cualquier riesgo.
3. Haz un commit pequeño y descriptivo que incluya el código y el handoff.

No se versionan dependencias, artefactos de compilación, instaladores ni bases de datos locales.
