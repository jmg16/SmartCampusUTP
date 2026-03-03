# Arquitectura limpia - SmartCampus Web

## Estructura de carpetas

```
app/
├── core/                    # Singleton, configuración global
│   ├── guards/
│   ├── interceptors/
│   ├── services/
│   └── constants/
├── shared/                  # Código reutilizable
│   ├── components/
│   ├── directives/
│   ├── pipes/
│   ├── models/
│   └── utils/
├── features/                # Módulos por dominio
│   ├── auth/
│   │   ├── domain/          # Entidades, puertos (interfaces)
│   │   ├── data/            # Repositorios, API, mappers
│   │   └── presentation/    # Componentes, páginas
│   └── dashboard/
│       └── (misma estructura)
└── layout/                  # Shell de la aplicación
    ├── main-layout/
    ├── header/
    ├── footer/
    └── sidebar/
```

## Uso por capa

- **core**: guards, interceptors, servicios de aplicación (auth, notificaciones), constantes.
- **shared**: componentes UI, pipes, directivas, interfaces y utilidades compartidas.
- **features**: cada feature tiene domain (qué), data (cómo se obtienen datos), presentation (UI).
- **layout**: estructura global (header, footer, sidebar, contenedor principal).

Los archivos `.gitkeep` mantienen las carpetas vacías en el repositorio; puedes eliminarlos al añadir el primer archivo real en cada carpeta.
