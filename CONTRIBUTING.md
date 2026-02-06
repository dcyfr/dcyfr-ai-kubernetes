# Contributing to @dcyfr/ai-kubernetes

## Development Setup

```bash
git clone https://github.com/dcyfr/dcyfr-ai-kubernetes.git
cd dcyfr-ai-kubernetes
npm install
npm test
```

## Guidelines

- TypeScript strict mode — no `any` types
- All functions must have JSDoc comments
- All builders must be immutable (return new objects)
- Tests required for all new functions
- Zod schemas for all K8s resource types
- No external YAML libraries — use built-in serializer

## Pull Requests

1. Fork and create a feature branch
2. Add tests for new functionality
3. Ensure `npm test` and `npm run lint` pass
4. Submit PR with description of changes

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
