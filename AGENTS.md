# AGENTS.md — @dcyfr/ai-kubernetes

## Project Context

Kubernetes deployment template for the DCYFR AI ecosystem. Generates, validates, and manages K8s manifests and Helm charts programmatically.

## Architecture

```
src/
├── types/           # Zod schemas for all K8s resources
├── manifests/       # Manifest builders (Deployment, Service, ConfigMap, etc.)
├── helm/            # Helm chart, values, template rendering
├── health/          # Health probes and resource profiles
├── utils/           # YAML serialization, validation, labels
└── index.ts         # Root barrel export
```

## Conventions

- All builders return immutable objects (spread-based updates)
- Zod schemas for all K8s resource types
- No runtime K8s dependencies — pure manifest generation
- Zero-dependency YAML serializer
- Standard resource profiles: small, medium, large, ai

## Testing

```bash
npm test              # Run all tests
npm run test:coverage # With coverage
```

Test files mirror source structure: `tests/{types,manifests,helm,health,utils}.test.ts`

## Key Patterns

- Builder functions: `createX(options) → Resource`
- Modifier functions: `setY(resource, value) → Resource` (immutable)
- Validation: `validateX(resource) → { valid, errors, warnings }`
- YAML output: `toYAML(resource) → string`
